# Contributing to SentinelCloud

Thanks for considering a contribution. The bar for this project is
production-grade engineering on a research-grade design. The notes below
explain how to keep that bar.

## Quick start

```bash
git clone https://github.com/Code-with-ME-Rohit/sentinelcloud
cd sentinelcloud/web
npm install
npm run dev
# open http://localhost:8080
```

The deterministic stub is the default when no Vertex AI credentials are
present, so the demo always works offline.

## Areas where help is welcome

- Adding new seeded scenarios in `web/lib/scenarios/`.
- Connector-mode adapters for live GCP, AWS, Azure, or Kubernetes.
- A learned process reward model to replace the heuristic in
  `web/lib/memory/episodic.ts`.
- New WAF rule patterns and CVE-to-rule transforms.
- Translations of the public-facing copy. Indic languages first, then
  the rest.

## Code conventions

- TypeScript strict mode. No `any` in new public APIs.
- Each module documents its purpose in a single header comment.
- Agents return the typed `AgentTurn` envelope. No free-form payloads.
- Scenarios are seeded fixtures. Time-dependent values use
  `Date.now() - offset` so a fresh clone produces a stable run.
- Voice rules for any user-visible copy: short sentences, plain words,
  no em dashes, no marketing words. The `web/CLAUDE.md`-style banned
  list applies to documentation as much as code.

## Pull request expectations

- One change, one PR.
- Tests if the change is testable. The capstone build accepts manual
  reproducibility steps in the PR description for now.
- A short note in `CHANGELOG.md` under an Unreleased heading.
- CI must pass: typecheck, lint, build, security scan.

## Security

If you find a vulnerability, please open a private security advisory before opening
a public issue. See `docs/SECURITY.md` for the full disclosure policy.

## License

By contributing you agree that your contribution is licensed under the
MIT license, the same as the rest of the project.
