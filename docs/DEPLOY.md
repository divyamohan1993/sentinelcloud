# Deploying SentinelCloud

Target: a fresh fork running at a public URL on Google Cloud Run in under 15 minutes.

Live reference deploy: https://sentinelcloud.dmj.one
Project: `<your-gcp-project>`. Runtime region: `asia-east1`. Vertex AI region: `us-central1`.

---

## Prerequisites

Install on the build machine:

- gcloud CLI 460.0.0 or newer. Check with `gcloud --version`.
- gh CLI authenticated. Check with `gh auth status`.
- Docker 24+ (only needed for local image builds). Check with `docker --version`.
- Node.js 22+ and npm 10+. Check with `node -v` and `npm -v`.

Authenticate once:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <your-gcp-project>
gcloud config set run/region asia-east1
```

---

## One-shot deploy

From the repo root:

```bash
gcloud run deploy sentinelcloud \
  --source . \
  --region asia-east1 \
  --project <your-gcp-project> \
  --min-instances 0 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --allow-unauthenticated \
  --port 8080
```

Cloud Build picks up the repo-root `Dockerfile`, produces a standalone Next.js image, pushes it to Artifact Registry, and rolls a new Cloud Run revision. First build runs 4 to 6 minutes; subsequent builds finish in 90 to 120 seconds because Cloud Build caches the `node_modules` layer.

The command prints a `*.run.app` URL at the end. Open it. The home page should render with the scenario gallery.

---

## Step-by-step

Use this path the first time you set up the project, or when bringing up a fresh fork.

### 1. Set the active account and project

```bash
gcloud auth login
gcloud config set project <your-gcp-project>
gcloud config set run/region asia-east1
gcloud auth application-default login
```

`auth application-default` writes Application Default Credentials (ADC) to `~/.config/gcloud/application_default_credentials.json`. The Vertex AI SDK and Firestore SDK both read ADC on the local box; on Cloud Run they read the runtime service account instead.

### 2. Enable the required services

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  --project <your-gcp-project>
```

Run once per project. Idempotent.

### 3. Artifact Registry repo

The build pipeline pushes images to `cloud-run-source-deploy` in the runtime region. The repo already exists on the reference project. To recreate on a fresh project:

```bash
gcloud artifacts repositories create cloud-run-source-deploy \
  --repository-format=docker \
  --location=asia-east1 \
  --description="Cloud Run source deploys" \
  --project <your-gcp-project>
```

### 4. Vertex AI region

The LLM gateway calls `us-central1` even though Cloud Run runs in `asia-east1`. Reason: Gemini 2.5 Pro and `text-embedding-005` ship to `us-central1` first and have the highest published quota there. `asia-east1` and `asia-south1` lag by one to two model generations. Cross-region latency adds about 180 ms per call, accepted in exchange for model parity. To pin a different Vertex region later, set `SENTINEL_VERTEX_REGION` at deploy time and update `web/lib/llm/vertex.ts`.

No setup command is needed; the API was enabled in step 2.

### 5. Firestore in Native mode

Check current state:

```bash
gcloud firestore databases describe --database='(default)' --project <your-gcp-project>
```

If the command errors with `NOT_FOUND`, create the database:

```bash
gcloud firestore databases create \
  --location=asia-south1 \
  --type=firestore-native \
  --project <your-gcp-project>
```

`asia-south1` keeps user data inside India, aligning with DPDP Act 2023 residency. Cross-region read from `asia-east1` adds about 40 ms; acceptable for the demo workload.

### 6. Secrets

`ANTHROPIC_API_KEY` is optional. Without it, the gateway falls back to Vertex AI Gemini, then to the local stub. `SENTINEL_ADMIN_EMAILS` is the allowlist for admin-only routes.

Create the secrets (skip `ANTHROPIC_API_KEY` if you do not have one):

```bash
printf "%s" "sk-ant-your-real-key" | gcloud secrets create ANTHROPIC_API_KEY \
  --data-file=- --replication-policy=automatic --project <your-gcp-project>

printf "%s" "<owner-email>,you@example.com" | gcloud secrets create SENTINEL_ADMIN_EMAILS \
  --data-file=- --replication-policy=automatic --project <your-gcp-project>
```

Grant the Cloud Run runtime service account read access:

```bash
PROJECT_NUMBER=$(gcloud projects describe <your-gcp-project> --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding ANTHROPIC_API_KEY \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project <your-gcp-project>

gcloud secrets add-iam-policy-binding SENTINEL_ADMIN_EMAILS \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project <your-gcp-project>
```

Grant Firestore and Vertex AI access to the same runtime account:

```bash
gcloud projects add-iam-policy-binding <your-gcp-project> \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding <your-gcp-project> \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/aiplatform.user"
```

### 7. Deploy with secrets attached

```bash
gcloud run deploy sentinelcloud \
  --source . \
  --region asia-east1 \
  --project <your-gcp-project> \
  --min-instances 0 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "SENTINEL_REGION=asia-east1,SENTINEL_GEMINI_MODEL=gemini-2.5-flash" \
  --set-secrets "ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,SENTINEL_ADMIN_EMAILS=SENTINEL_ADMIN_EMAILS:latest"
```

If you skipped the Anthropic secret, drop it from `--set-secrets`:

```bash
gcloud run deploy sentinelcloud \
  --source . \
  --region asia-east1 \
  --project <your-gcp-project> \
  --min-instances 0 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "SENTINEL_REGION=asia-east1,SENTINEL_GEMINI_MODEL=gemini-2.5-flash" \
  --set-secrets "SENTINEL_ADMIN_EMAILS=SENTINEL_ADMIN_EMAILS:latest"
```

### 8. Map the custom domain

The reference deploy is published at `sentinelcloud.dmj.one`. To map a domain to a fresh deploy:

```bash
gcloud beta run domain-mappings create \
  --service sentinelcloud \
  --domain sentinelcloud.dmj.one \
  --region asia-east1 \
  --project <your-gcp-project>
```

The command prints a CNAME or A/AAAA record set. Copy the records into your DNS provider for `dmj.one`. Cloud Run provisions a managed TLS certificate within 15 to 60 minutes after DNS resolves. Verify with:

```bash
gcloud beta run domain-mappings describe \
  --domain sentinelcloud.dmj.one \
  --region asia-east1 \
  --project <your-gcp-project>
```

`status.conditions[].type=Ready` reports `True` once the certificate is live.

---

## Health checks

Cloud Run uses TCP startup checks by default on port 8080. SentinelCloud also exposes an application-level health endpoint:

```bash
curl -sS https://sentinelcloud.dmj.one/api/health | jq
```

Expected shape:

```json
{
  "status": "ok",
  "release": "sentinelcloud-00042-abc",
  "checks": {
    "firestore": "ok",
    "vertex": "ok",
    "secrets": "ok"
  },
  "uptime_s": 1287
}
```

A degraded dependency returns HTTP 200 with `status: "degraded"` and a non-`ok` value in the offending check. A hard failure returns HTTP 503. Wire this into uptime monitoring:

```bash
gcloud monitoring uptime create sentinelcloud-health \
  --resource-type=uptime-url \
  --resource-labels=host=sentinelcloud.dmj.one,project_id=<your-gcp-project> \
  --path=/api/health \
  --period=60s \
  --timeout=10s \
  --project <your-gcp-project>
```

---

## Rollback

List recent revisions:

```bash
gcloud run revisions list \
  --service sentinelcloud \
  --region asia-east1 \
  --project <your-gcp-project> \
  --limit 10 \
  --format='table(name, active, creationTimestamp.date(), servingState)'
```

Send 100% of traffic to the previous known-good revision (replace `sentinelcloud-00041-xyz` with a real name from the list above):

```bash
gcloud run services update-traffic sentinelcloud \
  --region asia-east1 \
  --project <your-gcp-project> \
  --to-revisions=sentinelcloud-00041-xyz=100
```

Promote the latest revision back when you have a fix:

```bash
gcloud run services update-traffic sentinelcloud \
  --region asia-east1 \
  --project <your-gcp-project> \
  --to-latest
```

Canary 10% of traffic to a new revision before going to 100%:

```bash
gcloud run services update-traffic sentinelcloud \
  --region asia-east1 \
  --project <your-gcp-project> \
  --to-revisions=sentinelcloud-00041-xyz=90,sentinelcloud-00042-abc=10
```

A full rollback completes in under 60 seconds. Cloud Run keeps the prior container images warm in Artifact Registry, so traffic shift is the only step.

---

## Cost notes

- `--min-instances 0` keeps the service at scale-to-zero. Idle cost is zero apart from a few cents per month for Artifact Registry storage and Cloud Logging.
- Cold start lands at 2 to 4 seconds on a 1 vCPU, 1 GiB instance. The Next.js standalone bundle is around 120 MB. Most of the cold time is Node startup plus Firestore SDK init.
- Set `--min-instances 1` for the demo window before a viva or recruiter visit. That removes cold starts but costs about USD 10 per month at the 1 vCPU, 1 GiB tier.
- Vertex AI Gemini 2.5 Pro charges per 1K tokens. Each demo run uses 8K to 25K tokens across all agents. Budget USD 0.05 to USD 0.15 per scenario run. Set a billing alert at USD 50 per month while iterating.
- Firestore stays inside the free tier for the demo (under 50K reads, 20K writes, 1 GiB stored per day).
- Anthropic key is optional. Leave it unset to keep spend on Google Cloud only.
