# 📚 Tamir-GitBook

[![Build & Publish](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-publish.yml)
[![CI](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-image.yml/badge.svg)](https://github.com/allamiro/tamir-gitbook/actions/workflows/docker-image.yml)
[![Tests](https://github.com/allamiro/tamir-gitbook/actions/workflows/tests.yml/badge.svg)](https://github.com/allamiro/tamir-gitbook/actions/workflows/tests.yml)
[![Release](https://img.shields.io/github/v/release/allamiro/tamir-gitbook?logo=github)](https://github.com/allamiro/tamir-gitbook/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/allamiro1/tamir-gitbook-wiki?logo=docker)](https://hub.docker.com/r/allamiro1/tamir-gitbook-wiki)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

A lightweight Docker image for hosting GitBook wikis, optimized for fast setup and minimal resource usage. Runs on **current Node.js LTS (24)** thanks to this repo's [maintained GitBook CLI](#-maintained-gitbook-cli) — the abandoned upstream CLI's bundled npm was the real source of the infamous modern-Node crashes, and with it replaced, the classic GitBook 3.2.3 engine installs, builds, and serves cleanly on today’s Node.

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

This pulls the published multi-arch image, starts the GitBook server, and serves your book at http://localhost:4000 with live reload. Because the project directory is bind-mounted into the container, edits to your Markdown files show up immediately.

Pin a version or switch registries with `TAMIR_GITBOOK_IMAGE`:

```bash
TAMIR_GITBOOK_IMAGE=ghcr.io/allamiro/tamir-gitbook-wiki:1.0.2 docker compose up -d
```

To build the image from local sources instead (image development), use the dev override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Option 2 — pull the published image

```bash
# From Docker Hub
docker run -d -p 4000:4000 -p 35729:35729 \
  -v "$(pwd)":/gitbook -v gitbook_modules:/gitbook/node_modules \
  allamiro1/tamir-gitbook-wiki:latest

# Or from GitHub Container Registry
docker run -d -p 4000:4000 -p 35729:35729 \
  -v "$(pwd)":/gitbook -v gitbook_modules:/gitbook/node_modules \
  ghcr.io/allamiro/tamir-gitbook-wiki:latest
```

Run this from any directory containing a GitBook project (`book.json` + `SUMMARY.md`); omit both volume mounts to serve the sample content baked into the image. The `gitbook_modules` named volume matters when bind-mounting: it re-exposes the plugins baked into the image, which the bind mount would otherwise mask (without it, GitBook exits with `Couldn't locate plugins …`). Both registries carry identical multi-arch images — Apple Silicon and other arm64 hosts pull the native `linux/arm64` build automatically.

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
├── chapter-2/         # Chapter 2 content
│   ├── README.md
│   └── configuration.md
└── gitbook-cli/       # Vendored, maintained GitBook CLI source (built into the image)
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

Every merge to `main` publishes rolling multi-arch images (`latest`, `main`, `sha-*`) to **GHCR** and **Docker Hub**. Versioned releases are **batched**: the Auto-tag workflow runs weekly (and on demand from the Actions tab) and groups everything merged since the previous tag into one release —

1. **Auto-tag** — a semantic version tag (`vX.Y.Z`) is computed from the Conventional Commit messages in the batch (highest bump wins), and a GitHub Release with generated notes covering all changes is created.
2. **Build & Publish** — multi-arch images (`linux/amd64` + `linux/arm64`, each built on native runners) are pushed to both registries with the versioned tag set (`x.y.z`, `x.y`, `x`).
3. Published manifests are **signed with cosign** and **scanned with Trivy**, with results uploaded to the [Security tab](https://github.com/allamiro/tamir-gitbook/security).

## 🔐 Security

- 🛡️ **Trivy scans** run on every published image and weekly against `latest`; findings appear under Security → Code scanning. The image ships with **zero known CRITICAL/HIGH vulnerabilities**: every patchable package in the legacy engine tree is replaced with a fixed release at build time ([`scripts/patch-vulnerable-deps.sh`](scripts/patch-vulnerable-deps.sh)); the four unpatchable findings are risk-assessed and documented in [`.trivyignore`](.trivyignore).
- ✍️ **Cosign signatures** (keyless, GitHub OIDC) on every published manifest:

  ```bash
  cosign verify ghcr.io/allamiro/tamir-gitbook-wiki:latest \
    --certificate-identity-regexp 'https://github.com/allamiro/tamir-gitbook/' \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com
  ```

- ⚠️ **Know what you are running:** the runtime is current Node LTS (24) and the CLI is maintained here, but the GitBook 3.2.3 *engine* is legacy code, unmaintained upstream. Treat this image as a documentation-serving convenience for trusted networks; for public hosting, export static HTML with `gitbook build` and serve it with any web server.
- 📄 See [SECURITY.md](SECURITY.md) for the vulnerability reporting process.

## 🩺 Troubleshooting

### `TypeError: cb.apply is not a function` (graceful-fs)

```text
/usr/local/lib/node_modules/gitbook-cli/.../graceful-fs/polyfills.js:287
      if (cb) cb.apply(this, arguments)
                 ^
TypeError: cb.apply is not a function
```

This is the signature crash of the **abandoned upstream `gitbook-cli` from the npm registry** on modern Node — its bundled programmatic npm ships a `graceful-fs` that monkey-patches `fs` APIs removed in Node 12+. This repo's [maintained CLI](#-maintained-gitbook-cli) eliminated that bundled npm entirely, which is why this image runs on current Node LTS. If you hit this error, you're running the old registry CLI (`npm install -g gitbook-cli`) — install ours instead (see above) or use this image.

### Site not reachable right after start

`gitbook serve` rebuilds the book on startup, which can take a few seconds (longer for large books). The container ships a `HEALTHCHECK`; wait for `docker ps` to report `healthy`.

### Live reload not working

Make sure port `35729` is published (`-p 35729:35729`) and the project directory is bind-mounted (`-v "$(pwd)":/gitbook`).

## 🧰 Maintained GitBook CLI

Upstream [GitbookIO/gitbook-cli](https://github.com/GitbookIO/gitbook-cli) is deprecated, so this repository **owns and maintains its own copy** in [`gitbook-cli/`](gitbook-cli/) — the image installs the CLI from that directory, not from npm. Improvements landed here so far:

- **Runs on modern Node** (tested on Node 10, 22, and 24 in CI): the bundled programmatic `npm` — the source of the infamous `cb.apply` crash — was replaced with spawning the system npm CLI. With that fixed, the classic GitBook 3.2.3 engine `install`s, `build`s, and `serve`s on Node 22 — verified end to end; this image runs on Node 22 LTS
- Versioned independently of the dead upstream (which stopped at 2.3.2): our maintained line starts at **3.0.0**
- Vulnerable dependencies replaced or bumped (`optimist`→`minimist`, `lodash`, `semver`, `tmp`, `commander`, `q`); `npm audit` on runtime deps: **0 vulnerabilities**
- Unit tests run in CI on every PR across Node 10/22/24

**Versioning note:** upstream's CLI stopped at 2.3.2 — our maintained line continues from **3.0.0** upward (independent of this repo's release tags, which version the whole project).

**Install the CLI as a package** (outside Docker): each [release](https://github.com/allamiro/tamir-gitbook/releases) attaches a `gitbook-cli-vX.Y.Z.tgz` tarball — grab the URL of the latest one from the releases page:

```bash
npm install -g https://github.com/allamiro/tamir-gitbook/releases/download/<release-tag>/gitbook-cli-<release-tag>.tgz
# or from a clone:
npm install -g ./tamir-gitbook/gitbook-cli
```

## 🛠️ Technical notes

- Built on current Node.js LTS (`node:24-alpine`) — possible because the maintained CLI removed the bundled npm that broke GitBook on Node 12+
- The GitBook CLI is installed from this repo's maintained source, never the abandoned npm registry package
- Pre-configured plugins: search, expandable chapters, syntax highlighting, back-to-top button
- Container `HEALTHCHECK` polls the site so orchestrators can detect a failed build

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — commit messages follow Conventional Commits since they drive automatic versioning. Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

Apache License 2.0 — see [LICENSE](LICENSE).
