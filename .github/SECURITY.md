# Security Policy

For the full security posture, threat model, and headers, see
[`docs/SECURITY.md`](../docs/SECURITY.md).

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | yes       |
| earlier | no        |

## Reporting a vulnerability

Please email **contact@dmj.one** with the words **SentinelCloud security**
in the subject line. Do not open a public GitHub issue.

We aim to acknowledge within 48 hours, triage within 7 days, and ship
a fix within 30 days for high-severity reports.

## Scope

In scope:
- The deployed Cloud Run service at `sentinelcloud.dmj.one`.
- Anything published in this repository.

Out of scope:
- Brute force / volumetric DDoS against the public site.
- Vulnerabilities in third-party services we depend on (Vertex AI,
  Cloudflare, GitHub) unless they manifest as a config bug here.
