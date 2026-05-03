import { Section } from '@/components/Section';

export const dynamic = 'force-static';

export default function Docs() {
  return (
    <>
      <Section
        kicker="Docs"
        title="Run it, deploy it, point it at your cluster."
        sub="Three modes: local development, Cloud Run deploy, and connector mode against a real project."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="glass p-5">
            <h3 className="text-[16px] font-semibold mb-2">Run locally</h3>
            <pre className="code text-[12.5px]"><code>{`git clone https://github.com/Code-with-ME-Rohit/sentinelcloud
cd sentinelcloud/web
npm install
npm run dev
# open http://localhost:8080`}</code></pre>
            <p className="mt-3 text-[13.5px] text-[var(--color-fg-2)]">
              By default, the LLM gateway uses Vertex AI Gemini if Application Default Credentials are present.
              Otherwise it falls back to a deterministic stub so the demo always works.
            </p>
          </article>

          <article className="glass p-5">
            <h3 className="text-[16px] font-semibold mb-2">Deploy to Cloud Run</h3>
            <pre className="code text-[12.5px]"><code>{`gcloud config set project <your-gcp-project>
gcloud run deploy sentinelcloud \\
  --source . \\
  --region asia-east1 \\
  --min-instances 0 \\
  --max-instances 10 \\
  --memory 1Gi --cpu 1 \\
  --port 8080 \\
  --allow-unauthenticated`}</code></pre>
            <p className="mt-3 text-[13.5px] text-[var(--color-fg-2)]">
              Cold-start is acceptable on the free tier. Domain mapping commands are in <a className="underline" href="https://github.com/Code-with-ME-Rohit/sentinelcloud/blob/main/docs/DEPLOY.md">DEPLOY.md</a>.
            </p>
          </article>

          <article className="glass p-5">
            <h3 className="text-[16px] font-semibold mb-2">Connector mode</h3>
            <pre className="code text-[12.5px]"><code>{`# Bind a service account with least privilege
gcloud iam service-accounts create sentinelcloud-runtime
gcloud projects add-iam-policy-binding <your-gcp-project> \\
  --member=serviceAccount:sentinelcloud-runtime@<your-gcp-project>.iam.gserviceaccount.com \\
  --role=roles/aiplatform.user

# Optional Anthropic key
echo -n $KEY | gcloud secrets create anthropic-key --data-file=-

# Deploy with the bound SA
gcloud run services update sentinelcloud \\
  --service-account sentinelcloud-runtime@<your-gcp-project>.iam.gserviceaccount.com \\
  --region asia-east1`}</code></pre>
            <p className="mt-3 text-[13.5px] text-[var(--color-fg-2)]">
              Connector mode replaces simulated actuators with real ones. It is gated behind the admin allowlist and is off by default.
            </p>
          </article>
        </div>
      </Section>

      <Section kicker="Environment" title="The five env vars that matter.">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead className="text-[11.5px] uppercase tracking-wider text-[var(--color-fg-3)]">
              <tr><th className="py-2 pr-4 text-left">Var</th><th className="py-2 pr-4 text-left">Default</th><th className="py-2 pr-4 text-left">Purpose</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              <tr><td className="py-2.5 pr-4 font-mono text-[var(--color-accent)]">GOOGLE_CLOUD_PROJECT</td><td className="py-2.5 pr-4 font-mono text-[var(--color-fg-3)]">{'<your-gcp-project>'}</td><td className="py-2.5 pr-4">Project for Vertex AI and Firestore.</td></tr>
              <tr><td className="py-2.5 pr-4 font-mono text-[var(--color-accent)]">SENTINEL_REGION</td><td className="py-2.5 pr-4 font-mono">asia-east1</td><td className="py-2.5 pr-4">Cloud Run region used in metadata.</td></tr>
              <tr><td className="py-2.5 pr-4 font-mono text-[var(--color-accent)]">ANTHROPIC_API_KEY</td><td className="py-2.5 pr-4 font-mono text-[var(--color-fg-3)]">unset</td><td className="py-2.5 pr-4">Optional Claude provider as second opinion.</td></tr>
              <tr><td className="py-2.5 pr-4 font-mono text-[var(--color-accent)]">SENTINEL_FORCE_STUB</td><td className="py-2.5 pr-4 font-mono">0</td><td className="py-2.5 pr-4">Force the deterministic stub. Useful for offline demos.</td></tr>
              <tr><td className="py-2.5 pr-4 font-mono text-[var(--color-accent)]">SENTINEL_ADMIN_EMAILS</td><td className="py-2.5 pr-4 font-mono text-[var(--color-fg-3)]">{'<owner-email>'}</td><td className="py-2.5 pr-4">Comma-separated allowlist for connector-mode actions.</td></tr>
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
