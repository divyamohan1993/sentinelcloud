// Build a .docx version of the capstone report following the Yogananda School
// of AI capstone template (Shoolini University). Run as a prebuild step:
//   npx tsx scripts/build-docx.ts
// Output: public/SentinelCloud_Capstone_Report.docx
//
// We use the `docx` package to emit a Word-compatible XML, then wrap it in the
// expected zip container. Style and section choices intentionally mirror the
// supplied template:
//   - Times New Roman, 12pt body
//   - Heading 1: 16pt bold, page break before
//   - Cover page centered
//   - Lists, tables, code blocks all preserved

import {
  Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, PageBreak,
  Table, TableRow, TableCell, BorderStyle, WidthType, LevelFormat,
} from 'docx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COVER, REPORT_SECTIONS, VIVA_QUESTIONS, REFERENCES, type ReportSection } from '../lib/capstone.js';

// __dirname shim for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Font and sizes chosen to match the supplied template (Calibri / Word
// defaults) byte-for-byte where the template defines them. Sizes used by
// the template: 22 (11pt body), 24 (12pt sub), 28 (14pt cover sub) and 36
// (18pt cover title). Headings stay centred-bold like the template.
const FONT = 'Calibri';
const BODY_SIZE = 22;        // 11pt body to match the template
const COVER_TITLE_SIZE = 36; // 18pt as in template
const COVER_SUB_SIZE = 28;   // 14pt as in template
const H1_SIZE = 24;          // 12pt centred section headings
const H2_SIZE = 22;
const H3_SIZE = 22;

function p(text: string, opts: Partial<{
  bold: boolean; italic: boolean; size: number; align: typeof AlignmentType[keyof typeof AlignmentType];
  spacing: { before?: number; after?: number; line?: number };
  pageBreakBefore: boolean;
  font: string;
}> = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { line: 360, before: opts.spacing?.before ?? 0, after: opts.spacing?.after ?? 120, ...(opts.spacing || {}) },
    pageBreakBefore: opts.pageBreakBefore,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italic,
        size: opts.size ?? BODY_SIZE,
        font: opts.font ?? FONT,
      }),
    ],
  });
}

function heading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel], size: number, opts: Partial<{ pageBreakBefore: boolean; centered: boolean }> = {}): Paragraph {
  return new Paragraph({
    heading: level,
    pageBreakBefore: opts.pageBreakBefore,
    alignment: opts.centered ? AlignmentType.CENTER : undefined,
    spacing: { before: 280, after: 160, line: 320 },
    children: [new TextRun({ text, bold: true, size, font: FONT })],
  });
}

function bulletList(items: string[]): Paragraph[] {
  return items.map(text =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { line: 320, after: 60 },
      children: [new TextRun({ text, size: BODY_SIZE, font: FONT })],
    }),
  );
}

function makeTable(head: string[], rows: string[][]): Table {
  const tableBorder = { size: 4, style: BorderStyle.SINGLE, color: '888888' } as const;
  const cell = (text: string, opts: { bold?: boolean; shaded?: boolean } = {}) =>
    new TableCell({
      width: { size: Math.floor(9000 / head.length), type: WidthType.DXA },
      shading: opts.shaded ? { fill: 'EEEEEE' } : undefined,
      children: [new Paragraph({
        spacing: { line: 280 },
        children: [new TextRun({ text, bold: opts.bold, size: BODY_SIZE, font: FONT })],
      })],
    });
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    borders: {
      top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder,
      insideHorizontal: tableBorder, insideVertical: tableBorder,
    },
    rows: [
      new TableRow({ tableHeader: true, children: head.map(h => cell(h, { bold: true, shaded: true })) }),
      ...rows.map(r => new TableRow({ children: r.map(c => cell(c)) })),
    ],
  });
}

function code(text: string): Paragraph {
  return new Paragraph({
    spacing: { line: 240, before: 120, after: 120 },
    shading: { fill: 'F2F2F2' },
    children: text.split('\n').flatMap((line, i) => {
      const arr: (TextRun | Paragraph)[] = [];
      if (i > 0) arr.push(new TextRun({ break: 1 }));
      arr.push(new TextRun({ text: line, font: 'Courier New', size: 20 }));
      return arr as TextRun[];
    }),
  });
}

function renderSection(s: ReportSection, depth: number = 1): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const numbered = s.number ? `${s.number}. ${s.title}` : s.title;
  const headLevel = depth === 1 ? HeadingLevel.HEADING_1 : depth === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
  const headSize = depth === 1 ? H1_SIZE : depth === 2 ? H2_SIZE : H3_SIZE;
  // Top-level section headings are centred and bold to match the template's
  // existing major headings (Acknowledgement, Abstract, etc.).
  out.push(heading(numbered, headLevel, headSize, {
    pageBreakBefore: depth === 1 && !!s.number,
    centered: depth === 1,
  }));
  for (const para of s.body || []) out.push(p(para, { align: AlignmentType.JUSTIFIED }));
  if (s.bullets) out.push(...bulletList(s.bullets));
  if (s.code) out.push(code(s.code));
  if (s.table) out.push(makeTable(s.table.head, s.table.rows));
  for (const sub of s.subsections || []) out.push(...renderSection(sub, depth + 1));
  return out;
}

function buildDocument(): Document {
  const blocks: (Paragraph | Table)[] = [];

  // Cover page
  blocks.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 200 },
    children: [new TextRun({ text: COVER.title, bold: true, size: COVER_TITLE_SIZE, font: FONT })],
  }));
  blocks.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: COVER.subtitle, size: COVER_SUB_SIZE, font: FONT })],
  }));
  blocks.push(p('Synopsis submitted for the partial fulfilment of the degree of', { align: AlignmentType.CENTER }));
  blocks.push(p('BACHELOR OF TECHNOLOGY (CSE)', { align: AlignmentType.CENTER, bold: true, size: 28 }));
  blocks.push(p('Cloud Computing Specialisation', { align: AlignmentType.CENTER, italic: true }));
  blocks.push(p('', {}));
  blocks.push(p(`Name of Student: ${COVER.studentName}`, {}));
  blocks.push(p(`Registration Number: ${COVER.registrationNumber}`, {}));
  blocks.push(p(`Course with Specialization: BTech CSE - Cloud Computing`, {}));
  blocks.push(p(`Semester: ${COVER.semester}`, {}));
  blocks.push(p(`Capstone Mentor: ____________________________`, {}));
  blocks.push(p(`Submission: ${COVER.submission}`, {}));
  blocks.push(p('', { spacing: { before: 600, after: 0 } }));
  // Template uses upper-case for the institution block.
  blocks.push(p(COVER.school.toUpperCase(), { align: AlignmentType.CENTER, bold: true }));
  blocks.push(p(`${COVER.university.toUpperCase()}`, { align: AlignmentType.CENTER, bold: true }));
  blocks.push(p(`${COVER.location.toUpperCase()}`, { align: AlignmentType.CENTER, bold: true }));
  blocks.push(p('', { spacing: { before: 400, after: 0 } }));
  blocks.push(p(`Live: ${COVER.liveUrl}`, { align: AlignmentType.CENTER, size: 20 }));
  blocks.push(p(`Source: ${COVER.repoUrl}`, { align: AlignmentType.CENTER, size: 20 }));

  // Acknowledgement
  blocks.push(heading('Acknowledgement', HeadingLevel.HEADING_1, H1_SIZE, { pageBreakBefore: true, centered: true }));
  for (const para of REPORT_SECTIONS[0].body || []) blocks.push(p(para, { align: AlignmentType.JUSTIFIED }));

  // Abstract
  blocks.push(heading('Abstract', HeadingLevel.HEADING_1, H1_SIZE, { pageBreakBefore: true, centered: true }));
  for (const para of REPORT_SECTIONS[1].body || []) blocks.push(p(para, { align: AlignmentType.JUSTIFIED }));

  // Table of Contents
  blocks.push(heading('Table of Contents', HeadingLevel.HEADING_1, H1_SIZE, { pageBreakBefore: true, centered: true }));
  blocks.push(p('Acknowledgement'));
  blocks.push(p('Abstract'));
  blocks.push(p('List of Figures'));
  blocks.push(p('List of Tables'));
  for (const s of REPORT_SECTIONS.filter(s => s.number)) blocks.push(p(`${s.number}. ${s.title}`));
  blocks.push(p('Viva Questions'));
  blocks.push(p('References'));

  // List of Figures
  blocks.push(heading('List of Figures', HeadingLevel.HEADING_1, H1_SIZE, { pageBreakBefore: true, centered: true }));
  const FIGURES = [
    'Figure 1. Three-layer brain: perception, reasoning, actuation.',
    'Figure 2. Twelve-phase orchestrator state machine.',
    'Figure 3. Confidence calibration formula and class-specific thresholds.',
    'Figure 4. Blast radius BFS over service graph with depth falloff.',
    'Figure 5. AgentTurn TypeScript envelope (single source of truth).',
  ];
  for (const f of FIGURES) blocks.push(p(f));

  // List of Tables
  blocks.push(heading('List of Tables', HeadingLevel.HEADING_1, H1_SIZE, { pageBreakBefore: true, centered: true }));
  const TABLES = [
    'Table 1. Twelve research gaps mapped to twelve modules.',
    'Table 2. Stack of choices, with the one-line justification each.',
    'Table 3. Per-scenario pilot results: path, MTTR, blast radius, hallucination rate.',
    'Table 4. Policy constitution clauses and the action kinds they apply to.',
    'Table 5. Tool registry: kind, parameter schema, reversibility, risk class.',
  ];
  for (const t of TABLES) blocks.push(p(t));

  // Numbered sections
  for (const s of REPORT_SECTIONS.filter(s => s.number)) {
    blocks.push(...renderSection(s));
  }

  // Viva Questions
  // The template literally says "Questions:" — keep the same wording.
  blocks.push(heading('Questions:', HeadingLevel.HEADING_1, H1_SIZE, { pageBreakBefore: true, centered: true }));
  blocks.push(p('These ten questions follow the Yogananda School of AI capstone format and are answered here as part of the report itself.', { align: AlignmentType.JUSTIFIED }));
  VIVA_QUESTIONS.forEach((vq, i) => {
    blocks.push(new Paragraph({
      spacing: { before: 240, after: 120, line: 320 },
      children: [
        new TextRun({ text: `Q${i + 1}. `, bold: true, size: BODY_SIZE, font: FONT, color: '5b8cff' }),
        new TextRun({ text: vq.q, bold: true, size: BODY_SIZE, font: FONT }),
      ],
    }));
    blocks.push(p(vq.a, { align: AlignmentType.JUSTIFIED }));
  });

  // References
  blocks.push(heading('References', HeadingLevel.HEADING_1, H1_SIZE, { pageBreakBefore: true, centered: true }));
  REFERENCES.forEach((r, i) => {
    blocks.push(new Paragraph({
      spacing: { line: 300, after: 80 },
      children: [
        new TextRun({ text: `[${i + 1}] [${r.key}] `, bold: true, size: BODY_SIZE, font: FONT }),
        new TextRun({ text: r.text, size: BODY_SIZE, font: FONT }),
      ],
    }));
  });

  // End of report
  blocks.push(p('', { spacing: { before: 400 } }));
  blocks.push(p('— End of report —', { align: AlignmentType.CENTER, italic: true, size: 22 }));

  return new Document({
    creator: COVER.studentName,
    title: `${COVER.title} — Capstone Report`,
    description: COVER.subtitle,
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: H1_SIZE, bold: true, color: '111111' },
          paragraph: { spacing: { before: 320, after: 160 } },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: H2_SIZE, bold: true, color: '222222' },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: H3_SIZE, bold: true, color: '333333' },
          paragraph: { spacing: { before: 180, after: 100 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'default-bullets',
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
        },
        children: blocks,
      },
    ],
  });
}

async function main() {
  const doc = buildDocument();
  const buf = await Packer.toBuffer(doc);
  const outDir = join(__dirname, '..', 'public');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'SentinelCloud_Capstone_Report.docx');
  writeFileSync(outPath, buf);
  console.log(`wrote ${outPath} (${buf.byteLength.toLocaleString()} bytes)`);
}

main().catch(err => { console.error(err); process.exit(1); });
