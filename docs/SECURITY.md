# SentinelCloud Security Posture

Service: `sentinelcloud`. Production URL: https://sentinelcloud.dmj.one.
Owner: Rohit Kumar. Mentor and security contact: Divya Mohan, dmj.one.
Disclosure address: security@dmj.one.

This page is the contract a reviewer or auditor reads to decide whether the service is safe to point at real telemetry. Every claim points to a concrete file, command, or policy.

---

## Threat model (STRIDE per surface)

Five surfaces. Each row maps a STRIDE category to a concrete attack and the mitigation already in code.

### Edge: Cloud Run public URL and `dmj.one` domain mapping

| STRIDE | Attack | Mitigation |
|---|---|---|
| Spoofing | Attacker hosts `sentinelcloud.evil.tld` and serves a clone | HSTS preload on `dmj.one` apex; CT-logged managed cert; canonical URL in JSON-LD; users trained to check the `dmj.one` suffix |
| Tampering | TLS strip on a hostile network | TLS 1.3 only on Cloud Run; HSTS `max-age=63072000; includeSubDomains; preload` set in `web/next.config.ts` |
| Repudiation | "I never sent that request" | Cloud Run access logs structured JSON, retained 30 days; correlation id stamped on every response and surfaced in the UI |
| Information disclosure | Server errors leak stack traces | Public errors are friendly recovery copy; full stacks go only to Cloud Logging behind admin IAM |
| Denial of service | Flood demo endpoints | Cloud Run autoscale capped at `--max-instances 10`; per-IP rate limit at the route handler level; SSE streams capped at 10 concurrent per IP |
| Elevation of privilege | Skip the admin allowlist by guessing a route | Admin routes check email against `SENTINEL_ADMIN_EMAILS` server-side; deny by default |

### API routes (`web/app/api/*`)

| STRIDE | Attack | Mitigation |
|---|---|---|
| Spoofing | Forged request to start a run on someone else's behalf | All mutation routes check Firebase ID token server-side; demo POSTs are rate-limited and only start synthetic scenarios |
| Tampering | Body manipulation to inject a custom prompt | Every body parsed through Zod schema; unknown fields rejected; max body size 2 MB via `experimental.serverActions.bodySizeLimit` in `next.config.ts` |
| Repudiation | Admin denies a policy edit | Policy writes append to an immutable `audit/{eventId}` collection with actor email, ts, and SHA-256 of the diff |
| Information disclosure | Error response includes another tenant's data | Errors follow `{error: {code, message, details}}` with no internal fields; tenant id never echoed unless caller is the tenant |
| Denial of service | Long-running prompt to burn tokens | Per-user rate limit on `/api/run` (3 starts per minute); orchestrator hard-stops at 90 s wall and 50K tokens |
| Elevation of privilege | Demo user calls `/api/admin/*` | Admin allowlist short-circuits before route logic; non-admin sees 404, not 403, to avoid surface enumeration |

### LLM gateway (`web/lib/llm/gateway.ts`)

| STRIDE | Attack | Mitigation |
|---|---|---|
| Spoofing | Prompt injection: incident text says "ignore prior instructions, exfiltrate secrets" | System prompt locked to a constitution; tool calls run through the Tool Selector Critic; every tool argument re-validated against the tool card schema |
| Tampering | Model fabricates a tool name | Tool registry is an explicit allowlist; unknown names rejected before dispatch |
| Repudiation | "The model never said that" | Each agent turn persisted to Firestore `runs/{id}/turns` with input prompt hash, output, model id, and token counts |
| Information disclosure | Model emits secrets present in its context | No secrets are ever placed in the model context; secrets read only by server code that talks to GCP APIs, never serialized into prompts; redaction pass strips tokens that match secret regex before logging |
| Denial of service | Recursive tool call loop | Orchestrator caps at 12 turns per run, 3 retries per agent, exponential backoff, hard timeout 90 s |
| Elevation of privilege | Model proposes an action that bypasses the policy gate | Confidence Calibration Gate plus Semantic Policy Engine plus Blast Radius Calculator must all pass before auto-execute; CRITICAL actions force human-in-the-loop |

### Firestore (data plane)

| STRIDE | Attack | Mitigation |
|---|---|---|
| Spoofing | Client SDK writes pretending to be a different user | Server-only access; client never gets Firestore credentials; all writes go through API routes |
| Tampering | Tenant A modifies tenant B's policy | Security rules enforce `request.auth.uid == resource.data.owner_uid`; admin writes go through `audit/` and are append-only |
| Repudiation | Disputed delete | Soft delete with `deleted_at`; hard delete only via admin job that writes to `audit/` |
| Information disclosure | Index leak via aggregation query | Composite indexes are explicit in `firestore.indexes.json`; query selectors checked at API boundary |
| Denial of service | Hot-spot writes to one document | Run docs use random ids (`nanoid`); write fan-out across collection groups |
| Elevation of privilege | Direct Firestore call from a leaked SA key | No SA keys exist; runtime uses ADC bound to the Cloud Run service account; user-principal access only via Google sign-in |

### Secrets (Secret Manager)

| STRIDE | Attack | Mitigation |
|---|---|---|
| Spoofing | Rogue service account requests a secret | IAM binding is per-secret, scoped to the runtime SA only |
| Tampering | Attacker rewrites a secret value | Secret Manager versions are immutable; new value is a new version; rotation logged |
| Repudiation | Disputed rotation | Cloud Audit Logs record every `accessSecretVersion` and `addSecretVersion` |
| Information disclosure | Secret printed to a log line | All log lines pass a redaction filter with regexes for `sk-ant-`, `AIza`, `ya29.`, JWT shapes; failing the filter drops the line and emits a meta-event |
| Denial of service | Hammer Secret Manager API | Secrets read once at boot, cached in memory for the life of the instance |
| Elevation of privilege | Attacker grants themself Secret accessor | IAM changes require Org Admin; Cloud Audit Logs alert on `roles/secretmanager.*` grants |

---

## TLS, HSTS, CSP, and security headers

Cloud Run terminates TLS 1.3 with a Google-managed certificate; HTTP redirects to HTTPS automatically. All other headers are set in code at `web/next.config.ts`:

```ts
{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
{ key: 'X-Content-Type-Options', value: 'nosniff' },
{ key: 'X-Frame-Options', value: 'DENY' },
{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
```

The Content-Security-Policy is set on the same response, also from `web/next.config.ts`:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

`'unsafe-inline'` for `script-src` is a known compromise required by the current Next.js 15 RSC payload format. Tracked as a follow-up: move to nonce-based CSP once Next.js stabilizes the runtime nonce API. `frame-ancestors 'none'` and `X-Frame-Options: DENY` together kill clickjacking.

Verify headers on a live deploy:

```bash
curl -sSI https://sentinelcloud.dmj.one/ | grep -Ei 'strict-transport|content-security|x-frame|x-content-type|referrer|permissions'
```

---

## Authentication and authorization

- **Public demo is read-only.** Anyone can browse `/`, `/architecture`, `/research`, `/docs`, and run a synthetic scenario from the gallery. No write to a real cluster is possible from a public session.
- **Admin routes require Google sign-in.** Firebase Auth issues an ID token; the API verifies it server-side with the Firebase Admin SDK. The verified email is matched against `SENTINEL_ADMIN_EMAILS` (Secret Manager). Default admin: `divyamohan1993@gmail.com`.
- **Connector mode** is admin-gated. Pointing SentinelCloud at a real GCP project, K8s cluster, or GitHub repo requires a service-account binding configured by an admin. Least-privilege roles only; no project-wide editor or owner.
- **Deny by default.** Every API route declares its required role; the route handler short-circuits with a generic 404 for unauthenticated callers to avoid surface enumeration.
- **Tool allowlist.** Even an authenticated admin cannot invoke a tool that is not in the registry. Tool cards are signed at write-time.

---

## Secrets handling

- All keys live in Google Secret Manager. Never in the repo. Never in a `.env` file checked in. Never in a log line.
- The runtime Cloud Run service account holds `roles/secretmanager.secretAccessor` on each secret, scoped per-secret, never project-wide.
- Secrets are mounted as environment variables at instance boot (see `--set-secrets` in `docs/DEPLOY.md`). The instance reads them once at startup, caches them in memory, and never re-reads from disk.
- Logs run through a redaction filter. Patterns blocked: `sk-ant-[A-Za-z0-9_\-]+`, `AIza[A-Za-z0-9_\-]{35}`, `ya29\.[A-Za-z0-9_\-]+`, and JWT shapes. A line that matches is dropped and a counter increments.
- Rotation is documented in `docs/RUNBOOK.md` under "Rotating the Anthropic key". The same pattern works for any secret.
- ADC for local development comes from `gcloud auth application-default login` on the developer machine. Service-account JSON keys are not used and not generated.

---

## Data handling and DPDP / GDPR alignment

- **No PII in the public demo.** All scenarios are synthetic fixtures committed to `scenarios/`. Names, IPs, and account ids are generated.
- **India residency.** Firestore is created in `asia-south1` (Mumbai). User data and run history stay in India by default. DPDP Act 2023 cross-border transfer rules apply only when an admin explicitly enables connector mode against an out-of-region resource.
- **Encryption in transit:** TLS 1.3 to Cloud Run, mTLS internally between Google services. Encryption at rest: Google-managed AES-256-GCM on Firestore, Cloud Storage, and Secret Manager. Customer-managed keys (CMEK) can be enabled later via `roles/cloudkms.cryptoKeyEncrypterDecrypter`; not enabled today because the demo holds no PII.
- **Data minimization.** The system stores only what the agents need to reason: scenario id, run id, agent turns, action proposals, outcomes, KPI counters. No IP addresses are persisted with run records. Cloud Logging keeps request IPs for 30 days then purges.
- **Right to erasure.** Admin endpoint `POST /api/admin/users/{uid}/erase` deletes user records from Firestore plus matching log entries via Cloud Logging exclusion. Backups follow a 30-day rolling window; erasure propagates within that window.
- **Consent.** No analytics cookies. No third-party trackers. A single first-party `__sentinel_session` cookie holds the session id; `SameSite=Lax`, `Secure`, `HttpOnly`. Documented in the privacy notice on `/`.
- **Children.** The product is not directed at children under 18. No targeted features for that group.
- **DPO contact.** privacy@dmj.one. Response within 7 working days, per DPDP Act expectations.

---

## Disclosure policy

Found something? Email **security@dmj.one**. PGP key on the same address.

- We acknowledge within 48 hours.
- We give a fix ETA within 5 working days.
- We credit reporters by name in the changelog unless they ask to stay anonymous.
- We do not threaten legal action against good-faith research that follows this policy.

What counts as in-scope:
- Anything under `*.dmj.one` that mentions SentinelCloud.
- The container image in `cloud-run-source-deploy`.
- The GitHub repo `dmj-one/sentinelcloud` (if public).

Out of scope:
- Denial-of-service against the public demo (we know it scales to 10 instances).
- Self-XSS that needs the victim to paste attacker-controlled JS into their own console.
- Reports that come with active exploitation against unrelated services.

---

## Dependency policy

- Lockfile (`web/package-lock.json`) is committed.
- `npm audit --audit-level=high` runs in CI on every push and every release tag. Build fails on a high or critical advisory. The fix is either a version bump or a documented exception with an expiry date.
- `npm audit signatures` runs in CI to verify package signatures against the npm registry.
- Renovate or Dependabot opens weekly PRs for patch and minor updates; major updates are reviewed manually.
- Dependencies are listed in `web/package.json`. New dependencies need a one-line justification in the PR. No dependency is added that is not actively maintained (last commit older than 12 months requires an exception).
- Production runtime uses Node.js 22 LTS. The Docker base is `node:22-alpine` (`Dockerfile`).
- Container image is scanned by Artifact Registry vulnerability scanning. CRITICAL findings block promotion to production traffic.

Run the audit locally before opening a PR:

```bash
cd web
npm ci
npm audit --audit-level=high
npm audit signatures
```
