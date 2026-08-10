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
  the repository's [Security tab](https://github.com/allamiro/tamir-gitbook/security/code-scanning).
- Published manifests are **signed with cosign** (keyless, GitHub OIDC) — see
  the README for verification instructions.
- The image intentionally runs the legacy GitBook CLI (3.2.3) on Node.js 10,
  which is end-of-life upstream. It is meant for serving documentation in
  trusted environments — **do not expose it directly to the public internet**;
  put a reverse proxy or static export (`gitbook build`) in front for
  production hosting.

## Reporting a Vulnerability

Please report vulnerabilities privately via
[GitHub Security Advisories](https://github.com/allamiro/tamir-gitbook/security/advisories/new).
Do **not** open a public issue for security reports.

You can expect an initial response within 7 days. If the report is accepted,
a fix will be released as a new patch version and credited to you unless you
prefer otherwise.
