// Episodic memory + lightweight Process Reward Model (Gap G9).
// Backed by Firestore in production; in-memory fallback so the demo runs without GCP creds.

import type { MemoryEpisode, RunReport } from '../types';
import { log } from '../telemetry/logger';
import { env } from '../env';

let firestore: any = null;
let firestoreHealthy: boolean | null = null; // null = unknown, true/false = decided

const FIRESTORE_TIMEOUT_MS = 1500;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('firestore_timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); },
           e => { clearTimeout(t); reject(e); });
  });
}

async function getStore() {
  if (env.FORCE_STUB) return false;
  if (firestore !== null) return firestore;
  try {
    const mod = await import('@google-cloud/firestore');
    firestore = new mod.Firestore({ projectId: env.PROJECT_ID });
    return firestore;
  } catch (err) {
    log.warn('firestore_init_failed', { err: String(err) });
    firestore = false;
    return false;
  }
}

const inMemory: MemoryEpisode[] = [];

export async function recordEpisode(report: RunReport, qualityScore: number): Promise<MemoryEpisode> {
  const ep: MemoryEpisode = {
    id: report.runId,
    scenarioId: report.scenarioId,
    signalSummary: report.signals.slice(0, 5).map(s => `${s.kind}:${s.service}:${s.severity}`).join(','),
    resolution: report.finalAction
      ? `${report.finalAction.kind} on ${report.finalAction.target}: ${report.finalAction.rationale}`
      : 'no-action',
    rejectedAlternatives: report.turns.filter(t => t.dissent).map(t => t.dissent!).slice(0, 3),
    outcomeQualityScore: qualityScore,
    ts: Date.now(),
  };

  const store = firestoreHealthy === false ? false : await getStore();
  if (store) {
    try {
      await withTimeout(store.collection('episodes').doc(ep.id).set(ep), FIRESTORE_TIMEOUT_MS);
      firestoreHealthy = true;
    } catch (err) {
      firestoreHealthy = false;
      log.warn('firestore_write_failed', { err: String(err) });
      inMemory.unshift(ep);
    }
  } else {
    inMemory.unshift(ep);
  }
  return ep;
}

export async function recallEpisodes(scenarioId: string, k = 3): Promise<MemoryEpisode[]> {
  const store = firestoreHealthy === false ? false : await getStore();
  if (store) {
    try {
      const snap = await withTimeout(
        store.collection('episodes')
          .where('scenarioId', '==', scenarioId)
          .orderBy('ts', 'desc').limit(k).get() as Promise<{ docs: { data: () => MemoryEpisode }[] }>,
        FIRESTORE_TIMEOUT_MS,
      );
      firestoreHealthy = true;
      return snap.docs.map(d => d.data());
    } catch (err) {
      firestoreHealthy = false;
      log.warn('firestore_read_failed', { err: String(err) });
    }
  }
  return inMemory.filter(e => e.scenarioId === scenarioId).slice(0, k);
}

// Process Reward Model: very small heuristic for now.
// Real PRM would train on per-step traces; this captures the structure.
export function scoreRunQuality(report: RunReport): number {
  let q = 0.5;
  if (report.outcome === 'auto_resolved') q += 0.25;
  if (report.outcome === 'hitl_required') q += 0.1;
  if (report.outcome === 'failed' || report.outcome === 'rejected') q -= 0.2;
  // Reward presence of dissent (groupthink penalty avoided).
  if (report.turns.some(t => t.dissent && t.dissent.length > 10)) q += 0.05;
  // Reward verifier agreement.
  const v = report.turns.find(t => t.agent === 'verifier');
  if (v) q += (v.confidence - 0.5) * 0.2;
  // Penalise very high blast radius.
  const turnsWithBlast = report.turns.filter(t => typeof t.blastRadius === 'number');
  if (turnsWithBlast.length) {
    const avgBlast = turnsWithBlast.reduce((s, t) => s + (t.blastRadius || 0), 0) / turnsWithBlast.length;
    q -= Math.max(0, (avgBlast - 50) / 200);
  }
  return Math.max(0, Math.min(1, q));
}
