# SentinelCloud On-Call Runbook

Service: `sentinelcloud`. Region: `asia-east1`. Project: `dmjone`.
Public URL: https://sentinelcloud.dmj.one. Health: `/api/health`.

This page is for the person paged at 3 AM. Skim the symptoms table, run the matching command, fix the thing.

---

## Symptoms, causes, fixes

| Symptom | Likely cause | First fix | If that fails |
|---|---|---|---|
| 5xx spike on `/api/run/*` | Vertex AI quota exhausted in `us-central1`, or Firestore write contention | Toggle stub mode: `gcloud run services update sentinelcloud --region asia-east1 --project dmjone --update-env-vars SENTINEL_FORCE_STUB=1` | Roll back to last green revision (see DEPLOY.md `Rollback`) |
| 5xx spike on every route | Bad revision shipped, runtime crash on boot | `gcloud run services update-traffic sentinelcloud --region asia-east1 --project dmjone --to-revisions=PREVIOUS_REV=100` | Pull crash log: `gcloud logging read 'resource.type=cloud_run_revision AND severity>=ERROR' --limit 50 --project dmjone` |
| First request takes 6 to 10 s | Cold start on scale-to-zero | Set `--min-instances 1` for the demo window: `gcloud run services update sentinelcloud --region asia-east1 --project dmjone --min-instances 1` | Profile boot path with `K_SERVICE` log lines around `[boot]` to spot heavy module imports |
| Vertex AI 429 `RESOURCE_EXHAUSTED` | Per-project, per-region quota for Gemini 2.5 Pro hit | Switch to `gemini-2.5-flash`: `gcloud run services update sentinelcloud --region asia-east1 --project dmjone --update-env-vars SENTINEL_GEMINI_MODEL=gemini-2.5-flash` | File quota request in console, or flip `ANTHROPIC_API_KEY` on (see "Switching LLM providers" below) |
| Vertex AI 401 / `PERMISSION_DENIED` | Runtime service account missing `roles/aiplatform.user`, or ADC missing locally | Re-bind: `gcloud projects add-iam-policy-binding dmjone --member="serviceAccount:$(gcloud projects describe dmjone --format='value(projectNumber)')-compute@developer.gserviceaccount.com" --role="roles/aiplatform.user"` | Locally, run `gcloud auth application-default login` |
| Firestore quota: `RESOURCE_EXHAUSTED` on writes | Daily free-tier write limit (20K) hit during a demo loop | Pause demo traffic, raise to Blaze billing, or shard writes: cap orchestrator persistence to `summary` only via `SENTINEL_PERSIST_TURNS=0` | Move write-heavy collections (`runs/{id}/turns`) to a sub-database with TTL of 7 days |
| `Could not load the default credentials` (ADC) | Local dev or build runner has no ADC file | `gcloud auth application-default login` then re-run | On CI, mount a workload-identity-federated token; never commit a JSON key |
| Demo flow stuck mid-run, SSE stream silent | Orchestrator awaiting an LLM call that never returned, or Firestore listener dropped | Hit `POST /api/run/{runId}/cancel` then re-run; if global, restart instance with `gcloud run services update sentinelcloud --region asia-east1 --project dmjone --update-env-vars SENTINEL_TOUCH=$(date +%s)` | Inspect orchestrator state: `gcloud firestore documents get --project dmjone --database='(default)' projects/dmjone/databases/(default)/documents/runs/{runId}` |
| `scenario not found` 404 | Scenario id not in `web/lib/scenarios/index.ts`, or Firestore seed not run on a fresh project | Run the seeder: `npm run -w web seed:scenarios` (or hit `POST /api/admin/scenarios/seed` as an admin) | Verify ids: `curl -sS https://sentinelcloud.dmj.one/api/scenarios | jq '.[].id'` |
| Domain returns `SSL_ERROR_SYSCALL` | Managed cert still provisioning after DNS change | Wait up to 60 minutes; check `gcloud beta run domain-mappings describe --domain sentinelcloud.dmj.one --region asia-east1 --project dmjone` | Force re-issue by deleting and re-creating the mapping |
| `/api/health` returns 503 | One of Firestore, Vertex AI, or Secret Manager is unreachable from the instance | Read the body: `curl -sS https://sentinelcloud.dmj.one/api/health` and act on the failing key | If `secrets` is the failing key, re-grant `roles/secretmanager.secretAccessor` to the runtime SA |

---

## Useful commands

### Cloud Run

Tail live logs from the service (last 5 minutes, follow):

```bash
gcloud logging tail \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="sentinelcloud"' \
  --project dmjone
```

Last 100 errors only:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="sentinelcloud" AND severity>=ERROR' \
  --limit 100 \
  --order desc \
  --project dmjone \
  --format='table(timestamp, severity, jsonPayload.file, jsonPayload.line, jsonPayload.message)'
```

Errors filtered by correlation id (replace `abc123` with the value printed in the failing UI toast):

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND jsonPayload.correlation_id="abc123"' \
  --limit 200 \
  --order asc \
  --project dmjone
```

List revisions, see which is serving traffic:

```bash
gcloud run revisions list \
  --service sentinelcloud \
  --region asia-east1 \
  --project dmjone \
  --format='table(name, active, traffic, creationTimestamp.date())'
```

Describe the active revision (env, secrets, scaling):

```bash
gcloud run services describe sentinelcloud \
  --region asia-east1 \
  --project dmjone
```

### Firestore

Read a run document:

```bash
gcloud firestore documents get \
  --project dmjone \
  --database='(default)' \
  "projects/dmjone/databases/(default)/documents/runs/RUNID_HERE"
```

List recent runs (using the indexed `created_at` field):

```bash
gcloud firestore documents list \
  --project dmjone \
  --database='(default)' \
  "projects/dmjone/databases/(default)/documents/runs" \
  --page-size=20
```

Export a backup before a risky migration:

```bash
gcloud firestore export gs://dmjone-firestore-backups/$(date +%Y%m%d-%H%M%S) \
  --project dmjone \
  --database='(default)'
```

Wipe a single run that wedged the demo:

```bash
gcloud firestore documents delete \
  --project dmjone \
  --database='(default)' \
  --recursive \
  "projects/dmjone/databases/(default)/documents/runs/RUNID_HERE"
```

### Cloud Logging severity histogram (last hour)

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="sentinelcloud" AND timestamp>="'"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)"'"' \
  --project dmjone \
  --format='value(severity)' | sort | uniq -c | sort -rn
```

### Vertex AI quota check

```bash
gcloud ai operations list \
  --region us-central1 \
  --project dmjone \
  --filter='done=false' \
  --limit 20
```

For exact quota numbers, open `https://console.cloud.google.com/iam-admin/quotas?project=dmjone&service=aiplatform.googleapis.com&location=us-central1`.

---

## Toggling stub mode

`SENTINEL_FORCE_STUB=1` short-circuits every LLM call to a deterministic seeded responder in `web/lib/llm/stub.ts`. The UI keeps streaming, the timeline keeps animating, and no Vertex or Anthropic call goes out. Use this when an upstream model is on fire or quota is gone.

Turn on:

```bash
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --project dmjone \
  --update-env-vars SENTINEL_FORCE_STUB=1
```

Turn off:

```bash
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --project dmjone \
  --remove-env-vars SENTINEL_FORCE_STUB
```

Verify:

```bash
curl -sS https://sentinelcloud.dmj.one/api/health | jq '.checks'
```

The `vertex` check reads `stub` when force-stub is on. Demo runs still complete, marked `mode: "stub"` in the run document.

---

## Switching LLM providers

The gateway in `web/lib/llm/gateway.ts` picks providers in this order:

1. Stub if `SENTINEL_FORCE_STUB=1`.
2. Vertex AI Gemini if `ALLOW_VERTEX` is true (default).
3. Anthropic Claude if `ANTHROPIC_API_KEY` is set and `SENTINEL_DISABLE_CLAUDE` is not truthy.
4. Stub as final fallback.

Force Anthropic-only (Vertex off, Claude on):

```bash
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --project dmjone \
  --update-env-vars SENTINEL_DISABLE_VERTEX=1 \
  --update-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest
```

Force Vertex-only (Claude off):

```bash
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --project dmjone \
  --update-env-vars SENTINEL_DISABLE_CLAUDE=1 \
  --remove-env-vars SENTINEL_DISABLE_VERTEX
```

Switch the Gemini model:

```bash
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --project dmjone \
  --update-env-vars SENTINEL_GEMINI_MODEL=gemini-2.5-flash
```

Switch the Claude model:

```bash
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --project dmjone \
  --update-env-vars SENTINEL_CLAUDE_MODEL=claude-opus-4-7
```

Each `update` triggers a new revision with zero downtime.

---

## Rotating the Anthropic key

Anthropic keys live in Secret Manager as `ANTHROPIC_API_KEY`. Rotation is a new secret version plus a Cloud Run revision pinned to `:latest`.

1. Create a fresh key in the Anthropic console. Copy the value.

2. Add a new version:

   ```bash
   printf "%s" "sk-ant-NEW-VALUE-HERE" | gcloud secrets versions add ANTHROPIC_API_KEY \
     --data-file=- --project dmjone
   ```

3. Force Cloud Run to re-pull `:latest`:

   ```bash
   gcloud run services update sentinelcloud \
     --region asia-east1 \
     --project dmjone \
     --update-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest
   ```

4. Test:

   ```bash
   curl -sS https://sentinelcloud.dmj.one/api/health | jq '.checks.claude'
   ```

5. Disable the old version once the new one is healthy:

   ```bash
   OLD=$(gcloud secrets versions list ANTHROPIC_API_KEY --project dmjone --filter='state=ENABLED' --sort-by=~createTime --limit=2 --format='value(name)' | tail -1)
   gcloud secrets versions disable "$OLD" --secret=ANTHROPIC_API_KEY --project dmjone
   ```

6. Revoke at Anthropic. The old key is now dead in two places.

If the new key is broken and the rollback window is tight, point the secret binding back at the previous version explicitly:

```bash
gcloud run services update sentinelcloud \
  --region asia-east1 \
  --project dmjone \
  --update-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:5
```

Replace `5` with the prior version number from `gcloud secrets versions list ANTHROPIC_API_KEY --project dmjone`.
