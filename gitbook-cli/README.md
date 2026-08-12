# gitbook-cli (maintained) — the GitBook CLI that works on modern Node.js

> **This is the actively maintained continuation** of the GitBook command line
> interface. The original [GitbookIO/gitbook-cli](https://github.com/GitbookIO/gitbook-cli)
> was abandoned at 2.3.2 and crashes on every Node.js newer than 10
> (`TypeError: cb.apply is not a function`, `primordials is not defined`).
> This copy lives in [allamiro/tamir-gitbook](https://github.com/allamiro/tamir-gitbook),
> where it is developed, tested, and released — report problems and ideas in
> [that issue tracker](https://github.com/allamiro/tamir-gitbook/issues).

## Why this version works where upstream doesn't

| | Abandoned upstream 2.3.2 | This maintained 3.x |
|---|---|---|
| Node.js support | ≤ 10 only (EOL) | **10 through 26** — CI-tested on every release |
| npm interaction | Bundles a frozen programmatic npm (removed in npm 8; source of the `cb.apply` crash) | Spawns **your system npm** — works with npm 6 through 12+ |
| Installed engine | Pristine 2016 tree — `gitbook serve` dies on any browser cache revalidation | `gitbook fetch` **auto-patches** the engine for modern Node |
| Dependencies | Years of known CVEs (`minimist`, `lodash`, `semver`, …) | Replaced or updated — `npm audit` on runtime deps: **0 vulnerabilities** |
| Distribution | Dead npm registry package | Release tarball, source install, or the [tamir-gitbook-wiki Docker image](https://github.com/allamiro/tamir-gitbook) |

**Note:** the `gitbook` command loads and runs the version of GitBook you have
specified in your book (or the latest one). It supports GitBook engine
versions `>=2.0.0`, and stores them in `~/.gitbook` (override the location
with the `GITBOOK_DIR` environment variable).

## Install

Do **not** use `npm install -g gitbook-cli` — that pulls the abandoned
upstream package from the npm registry, without any of these fixes. Instead:

```bash
# Option A — release tarball (attached to every release of the parent repo)
npm install -g https://github.com/allamiro/tamir-gitbook/releases/download/<tag>/gitbook-cli-<tag>.tgz

# Option B — from source
git clone https://github.com/allamiro/tamir-gitbook.git
npm install -g ./tamir-gitbook/gitbook-cli

# Option C — skip the install entirely: the Docker image ships everything
docker run -d -p 4000:4000 allamiro1/tamir-gitbook-wiki:latest
```

Requires Node.js ≥ 10 and npm on `PATH` (any Node install provides both).

## Use

```bash
gitbook fetch 3.2.3      # install the GitBook engine (auto-patched for modern Node)
gitbook build ./mybook   # build a static site into _book/
gitbook serve ./mybook   # serve with live reload on :4000
gitbook help             # list all commands
```

### Manage engine versions

```bash
gitbook ls           # installed versions
gitbook ls-remote    # versions available on the npm registry
gitbook fetch 2.1.0  # install a specific version (or a tag: gitbook fetch beta)
gitbook update       # update to the latest version
gitbook uninstall 2.0.1
gitbook alias ./mygitbook latest   # use a local folder as an engine (development)
gitbook build ./mybook --gitbook=2.0.1   # force a version for one command
```

## Changelog (vs upstream 2.3.2)

- **3.2.0** — `gitbook fetch` now also replaces the engine's bundled npm
  (~40 MB) with a small shim over the system npm. Without it `gitbook
  install` crashes on any modern Node, because the engine drives npm through
  the programmatic API removed in npm 8. The shim also fixes plugin installs
  evicting each other: each plugin is installed into a scratch prefix and
  copied in, so npm cannot prune the previously installed ones as
  "extraneous".

- **3.1.0** — `gitbook fetch` applies Node compatibility patches to the
  installed engine (guarded string fixes; currently the `send` header-API fix,
  without which browser cache revalidation crashes `gitbook serve` on modern
  Node).
- **3.0.1** — support npm ≥ 12 (its `npm view --json` wraps results in an
  array).
- **3.0.0** — runs on modern Node.js. The bundled programmatic npm was
  replaced with spawning the system `npm` CLI (breaking: `npm` must be on
  `PATH`). `optimist` replaced with `minimist`; `lodash`, `semver`, `tmp`,
  `commander`, `q`, `mocha` updated; `npm audit` on runtime dependencies:
  **0 vulnerabilities**. With the bundled npm gone, the classic GitBook 3.2.3
  engine installs, builds, and serves on current Node — verified end to end.

## Development & tests

```bash
cd gitbook-cli
npm install
npm run test:unit   # fast offline unit tests (run in CI on Node 10/22/24/26)
npm test            # full suite — installs GitBook versions from the npm registry
```

Licensed Apache-2.0, like the parent repository.
