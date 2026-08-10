# Tamir-GitBook

[![Build & Publish](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-publish.yml)
[![CI](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-image.yml/badge.svg)](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-image.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/allamiro1/tamir-gitbook-wiki)](https://hub.docker.com/r/allamiro1/tamir-gitbook-wiki)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A lightweight Docker image for hosting GitBook wikis, optimized for fast setup and minimal resource usage. Ships the legacy GitBook CLI (3.2.3) on Node.js 10 — the last Node version compatible with it — with all known compatibility issues (graceful-fs polyfills) fixed in the image, so `gitbook serve` just works.

## Quick reference

- **Docker Hub:** [`allamiro1/tamir-gitbook-wiki`](https://hub.docker.com/r/allamiro1/tamir-gitbook-wiki)
- **GHCR:** `ghcr.io/allamiro/tamir-gitbook-wiki`
- **Architectures:** `linux/amd64`, `linux/arm64` — both built on native runners
- **Ports:** `4000` (site), `35729` (LiveReload)
- **Source / issues:** https://github.com/allamiro/tamir-gitbook
- **Maintainer:** Tamir Suliman

## Supported tags

Versions are cut automatically on every merge to `main` (Conventional Commits: `feat:` bumps minor, `fix:` bumps patch).

| Tag | Meaning | Use it when |
|-----|---------|-------------|
| `x.y.z` (e.g. `1.0.0`) | Immutable release | Production — pin the full version |
| `x.y`, `x` | Rolling within minor / major | You want patch/minor updates automatically |
| `latest` | Last successful build of `main` | Trying things out |
| `main` | Same as `latest` | — |
| `sha-<shortsha>` | Exact commit build | Audits, reproducible pipelines, rollback |

Each release also appears on the [GitHub Releases](https://github.com/allamiro/tamir-gitbook/releases) page with generated changelog notes.

## Quick Start

### Option 1 — docker compose (recommended)

```bash
git clone https://github.com/allamiro/tamir-gitbook.git
cd tamir-gitbook

docker compose up -d
```

This builds the image, starts the GitBook server, and serves your book at http://localhost:4000 with live reload. Because the project directory is bind-mounted into the container, edits to your Markdown files show up immediately.

### Option 2 — pull the published image

```bash
# From Docker Hub
docker run -d -p 4000:4000 -p 35729:35729 -v "$(pwd)":/gitbook allamiro1/tamir-gitbook-wiki:latest

# Or from GitHub Container Registry
docker run -d -p 4000:4000 -p 35729:35729 -v "$(pwd)":/gitbook ghcr.io/allamiro/tamir-gitbook-wiki:latest
```

Run this from any directory containing a GitBook project (`book.json` + `SUMMARY.md`); omit the volume mount to serve the sample content baked into the image.

### Option 3 — build locally

```bash
docker build -t tamir-gitbook-wiki .
docker run -d -p 4000:4000 -p 35729:35729 -v "$(pwd)":/gitbook tamir-gitbook-wiki
```

## Project Structure

```
.
├── book.json          # GitBook configuration (plugins, theme, PDF settings)
├── README.md          # Introduction page
├── SUMMARY.md         # Table of contents
├── chapter-1/         # Chapter 1 content
│   ├── README.md
│   └── getting-started.md
└── chapter-2/         # Chapter 2 content
    ├── README.md
    └── configuration.md
```

## Customizing Content

1. Edit Markdown files in the project directory — live reload picks up changes automatically
2. Modify `book.json` to configure plugins and settings
3. Update `SUMMARY.md` to change the table of contents
4. Build a static site with `docker exec <container> gitbook build` (output in `_book/`)

## Building other outputs

```bash
# Static HTML site → _book/
docker compose exec gitbook gitbook build

# Install/refresh plugins declared in book.json
docker compose exec gitbook gitbook install
```

## Versioning & releases

Every merge to `main` that touches code or config triggers the release pipeline:

1. **Auto-tag** — a semantic version tag (`vX.Y.Z`) is computed from Conventional Commit messages and pushed, and a GitHub Release with generated notes is created.
2. **Build & Publish** — multi-arch images (`linux/amd64` + `linux/arm64`, built natively, no QEMU) are pushed to **Docker Hub** and **GHCR** with the full tag set above.
3. Published manifests are **signed with cosign** (keyless, GitHub OIDC) and **scanned with Trivy**.

Verify a signature:

```bash
cosign verify ghcr.io/allamiro/tamir-gitbook-wiki:latest \
  --certificate-identity-regexp 'https://github.com/allamiro/tamir-gitbook/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## Technical Notes

- Built on Node.js 10.x — intentionally, as it is the last major Node version compatible with GitBook CLI 3.2.3. The legacy GitBook toolchain is unmaintained upstream, so treat this as a documentation-serving convenience, not an internet-facing production service.
- Includes fixes for the `graceful-fs` polyfill incompatibilities that break GitBook on modern npm
- Pre-configured plugins: search, expandable chapters, syntax highlighting, back-to-top button
- Container `HEALTHCHECK` polls the site so orchestrators can detect a failed build

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — commit messages follow Conventional Commits since they drive automatic versioning.

## License

MIT — see [LICENSE](LICENSE).
