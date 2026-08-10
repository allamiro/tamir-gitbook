# 📚 Tamir-GitBook

[![Build & Publish](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-publish.yml)
[![CI](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-image.yml/badge.svg)](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-image.yml)
[![Tests](https://github.com/allamiro/tamir-gitbook/actions/workflows/tests.yml/badge.svg)](https://github.com/allamiro/tamir-gitbook/actions/workflows/tests.yml)
[![Release](https://img.shields.io/github/v/release/allamiro/tamir-gitbook?logo=github)](https://github.com/allamiro/tamir-gitbook/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/allamiro1/tamir-gitbook-wiki?logo=docker)](https://hub.docker.com/r/allamiro1/tamir-gitbook-wiki)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

A lightweight Docker image for hosting GitBook wikis, optimized for fast setup and minimal resource usage. Ships the legacy GitBook CLI (3.2.3) on Node.js 10 — the last Node version compatible with it — with all known compatibility issues (`graceful-fs` polyfills) fixed inside the image, so `gitbook serve` just works.

## 🔎 Quick reference

| | |
|---|---|
| 🐳 **Docker Hub** | [`allamiro1/tamir-gitbook-wiki`](https://hub.docker.com/r/allamiro1/tamir-gitbook-wiki) |
| 📦 **GHCR** | `ghcr.io/allamiro/tamir-gitbook-wiki` |
| 🏗️ **Architectures** | `linux/amd64`, `linux/arm64` — both built on native runners (no QEMU) |
| 🔌 **Ports** | `4000` (site), `35729` (LiveReload) |
| 🐞 **Issues** | https://github.com/allamiro/tamir-gitbook/issues |
| 👤 **Maintainer** | Tamir Suliman |

## 🏷️ Supported tags

Versions are cut automatically on every merge to `main` (Conventional Commits: `feat:` bumps minor, `fix:` bumps patch).

| Tag | Meaning | Use it when |
|-----|---------|-------------|
| `x.y.z` (e.g. `1.0.0`) | Immutable release | Production — pin the full version |
| `x.y`, `x` | Rolling within minor / major | You want patch/minor updates automatically |
| `latest` | Last successful build of `main` | Trying things out |
| `main` | Same as `latest` | — |
| `sha-<shortsha>` | Exact commit build | Audits, reproducible pipelines, rollback |

Each release also appears on the [GitHub Releases](https://github.com/allamiro/tamir-gitbook/releases) page with generated changelog notes.

## 🚀 Quick Start

### Option 1 — docker compose (recommended for editing)

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

Run this from any directory containing a GitBook project (`book.json` + `SUMMARY.md`); omit the volume mount to serve the sample content baked into the image. Both registries carry identical multi-arch images — Apple Silicon and other arm64 hosts pull the native `linux/arm64` build automatically.

### Option 3 — build locally

```bash
docker build -t tamir-gitbook-wiki .
docker run -d -p 4000:4000 -p 35729:35729 -v "$(pwd)":/gitbook tamir-gitbook-wiki
```

## 🗂️ Project structure

```text
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

## ✏️ Customizing content

1. Edit Markdown files in the project directory — live reload picks up changes automatically
2. Modify `book.json` to configure plugins and settings
3. Update `SUMMARY.md` to change the table of contents

Build other outputs from inside the running container:

```bash
# Static HTML site → _book/  (ideal for production hosting behind any web server)
docker compose exec gitbook gitbook build

# Install/refresh plugins declared in book.json
docker compose exec gitbook gitbook install
```

## 🔄 Versioning & releases

Every merge to `main` that touches code or config triggers the release pipeline:

1. **Auto-tag** — a semantic version tag (`vX.Y.Z`) is computed from Conventional Commit messages and pushed, and a GitHub Release with generated notes is created.
2. **Build & Publish** — multi-arch images (`linux/amd64` + `linux/arm64`, each built on native runners) are pushed to **GHCR** and — when Docker Hub credentials are configured — **Docker Hub**, with the full tag set above.
3. Published manifests are **signed with cosign** and **scanned with Trivy**, with results uploaded to the [Security tab](https://github.com/allamiro/tamir-gitbook/security).

## 🔐 Security

- 🛡️ **Trivy scans** run on every published image and weekly against `latest`; findings appear under Security → Code scanning.
- ✍️ **Cosign signatures** (keyless, GitHub OIDC) on every published manifest:

  ```bash
  cosign verify ghcr.io/allamiro/tamir-gitbook-wiki:latest \
    --certificate-identity-regexp 'https://github.com/allamiro/tamir-gitbook/' \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com
  ```

- ⚠️ **Know what you are running:** the legacy GitBook toolchain (and its Node 10 runtime) is unmaintained upstream. Treat this image as a documentation-serving convenience for trusted networks; for public hosting, export static HTML with `gitbook build` and serve it with any web server.
- 📄 See [SECURITY.md](SECURITY.md) for the vulnerability reporting process.

## 🩺 Troubleshooting

### `TypeError: cb.apply is not a function` (graceful-fs)

```text
/usr/local/lib/node_modules/gitbook-cli/.../graceful-fs/polyfills.js:287
      if (cb) cb.apply(this, arguments)
                 ^
TypeError: cb.apply is not a function
```

This happens when the GitBook CLI runs on a **modern Node.js** (12+, including Node 22) — for example when the compose file points at a plain `node` image instead of this one. The legacy CLI is only compatible with Node ≤ 10, and this image both pins Node 10 **and** patches the `graceful-fs` polyfills. Fix: use `allamiro1/tamir-gitbook-wiki` / `ghcr.io/allamiro/tamir-gitbook-wiki` as the image (or build from this repo's Dockerfile) rather than a stock Node image.

### Site not reachable right after start

`gitbook serve` rebuilds the book on startup, which can take a few seconds (longer for large books). The container ships a `HEALTHCHECK`; wait for `docker ps` to report `healthy`.

### Live reload not working

Make sure port `35729` is published (`-p 35729:35729`) and the project directory is bind-mounted (`-v "$(pwd)":/gitbook`).

## 🛠️ Technical notes

- Built on Node.js 10.x — intentionally, as it is the last major Node version compatible with GitBook CLI 3.2.3
- Includes fixes for the `graceful-fs` polyfill incompatibilities that break GitBook on modern npm
- Pre-configured plugins: search, expandable chapters, syntax highlighting, back-to-top button
- Container `HEALTHCHECK` polls the site so orchestrators can detect a failed build

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — commit messages follow Conventional Commits since they drive automatic versioning. Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

Apache License 2.0 — see [LICENSE](LICENSE).
