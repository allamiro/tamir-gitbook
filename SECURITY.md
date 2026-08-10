# Security Policy

## Supported Versions

Only the most recent release receives security updates. Pin the full
`x.y.z` tag in production and re-pull to pick up patched images.

| Version | Supported |
| ------- | --------- |
| Latest release (`x.y.z` on `main`) | ✅ |
| Older tags | ❌ |

## Image security posture

- Every published image is scanned with **Trivy** (CRITICAL/HIGH) at release
  time, and the latest image is **re-scanned weekly**; results are uploaded to
  the repository's [Security tab](https://github.com/allamiro/tamir-gitbook/security).
- The image ships with **zero known CRITICAL/HIGH vulnerabilities**: the
  legacy engine's vulnerable nested dependencies are replaced with patched
  releases at build time (`scripts/patch-vulnerable-deps.sh`, exercised by
  CI's serve/build/plugin-install smoke tests). The small set of findings
  with no viable fix is risk-assessed and documented in `.trivyignore`.
- Published manifests are **signed with cosign** (keyless, GitHub OIDC) — see
  the README for verification instructions.
- The image runs on current **Node.js LTS (24)** with this repo's maintained
  GitBook CLI. The GitBook 3.2.3 *engine* it serves, however, is legacy code
  that is unmaintained upstream. The image is meant for serving documentation
  in trusted environments — **do not expose it directly to the public
  internet**; put a reverse proxy or static export (`gitbook build`) in front
  for production hosting.

## Reporting a Vulnerability

Please report vulnerabilities privately via
[GitHub Security Advisories](https://github.com/allamiro/tamir-gitbook/security/advisories/new).
Do **not** open a public issue for security reports.

You can expect an initial response within 7 days. If the report is accepted,
a fix will be released as a new patch version and credited to you unless you
prefer otherwise.
