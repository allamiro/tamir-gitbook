# tamir-gitbook-wiki

A Docker image for self-hosting GitBook wikis. Everything in it is current
and maintained: it runs on Node.js 24 LTS with this project's maintained
GitBook CLI, ships with zero known vulnerabilities of any severity, and is
published multi-arch (amd64 and arm64) with signed images.

The well-known legacy GitBook errors — `cb.apply is not a function`,
`primordials is not defined`, crashes on page refresh — **do not apply to
this image**. They came from the abandoned upstream `gitbook-cli`, which this
project replaced with a maintained CLI and a patched engine. Everything is
tested in CI on Node 10, 22, 24, and 26.

Source, full documentation, issues and releases:
https://github.com/allamiro/tamir-gitbook

## Tags

| Tag | Meaning |
|-----|---------|
| `x.y.z` (e.g. `2.2.0`) | Immutable release — pin this in production |
| `x.y`, `x` | Rolling within minor / major |
| `latest`, `main` | Last successful build of the main branch |
| `sha-<shortsha>` | Exact commit build |

Also published to GHCR: `ghcr.io/allamiro/tamir-gitbook-wiki`

## Quick start

Serve the sample book:

```
docker run -d -p 4000:4000 allamiro1/tamir-gitbook-wiki:latest
```

Serve your own book (a directory with `book.json` and `SUMMARY.md`), with
live reload:

```
docker run -d -p 4000:4000 -p 35729:35729 \
  -v "$(pwd)":/gitbook -v gitbook_modules:/gitbook/node_modules \
  allamiro1/tamir-gitbook-wiki:latest
```

One-off static site build (output in `./_book`):

```
docker run --rm -v "$(pwd)":/gitbook -v gitbook_modules:/gitbook/node_modules \
  allamiro1/tamir-gitbook-wiki:latest gitbook build
```

Or use the ready-made compose file from the repository:

```
git clone https://github.com/allamiro/tamir-gitbook.git
cd tamir-gitbook
docker compose up -d
```

## Options

| | |
|---|---|
| Ports | `4000` site, `35729` live reload (map it 1:1: `-p 35729:35729`) |
| Volumes | `/gitbook` your book directory; when bind-mounting it, also mount a named volume at `/gitbook/node_modules` to keep the built-in plugins |
| Commands | `gitbook serve` (default), `gitbook build`, `gitbook install`, `gitbook ls-remote` |
| Health | built-in healthcheck; wait for `healthy` in `docker ps` |

## Notes

- The site takes a few seconds to appear after start: the book is rebuilt on
  startup. Wait for the container to report `healthy`.
- If GitBook exits with `Couldn't locate plugins`, you bind-mounted over
  `/gitbook` without the `gitbook_modules` volume shown above.
- Images are Trivy-scanned on every release and weekly; results are public in
  the repository's Security tab. Images are cosign-signed (keyless OIDC).
- The GitBook CLI is also available as a standalone npm package on every
  release: https://github.com/allamiro/tamir-gitbook/releases

License: Apache-2.0. Maintainer: Tamir Suliman.
