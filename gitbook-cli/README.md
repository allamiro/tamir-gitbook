# gitbook-cli (maintained) — v3.x

## What changed vs the abandoned upstream 2.3.2

- **3.0.1** — support npm ≥ 12 (its `npm view --json` wraps results in an array).

- **3.0.0** — runs on modern Node.js (tested on 10, 22, 24). The bundled
  programmatic npm was replaced with spawning the system `npm` CLI (breaking:
  `npm` must be on `PATH` — it always is with any Node install). `optimist`
  replaced with `minimist`; `lodash`, `semver`, `tmp`, `commander`, `q`,
  `mocha` updated. `npm audit` on runtime dependencies: **0 vulnerabilities**.
  With the bundled npm gone, the classic GitBook 3.2.3 engine `install`s,
  `build`s, and `serve`s on Node 22 — verified end to end (the bundled npm
  was the actual cause of the historic modern-Node crashes).

> **This is an actively maintained copy** of the GitBook command line interface,
> imported from the original [GitbookIO/gitbook-cli](https://github.com/GitbookIO/gitbook-cli)
> (which its authors stopped developing) into
> [allamiro/tamir-gitbook](https://github.com/allamiro/tamir-gitbook).
> Bug fixes, dependency updates, and modernization work happen here — report
> problems and ideas in the
> [tamir-gitbook issue tracker](https://github.com/allamiro/tamir-gitbook/issues).
> The `tamir-gitbook-wiki` Docker image installs the CLI from this directory.

> The GitBook command line interface.

**Note:** The purpose of the gitbook command is to load and run the version of GitBook you have specified in your book (or the latest one), irrespective of its version. The GitBook CLI only support versions `>=2.0.0` of GitBook.

`gitbook-cli` store GitBook's versions into `~/.gitbook`, you can set the `GITBOOK_DIR` environment variable to use another directory.

## How to install it?

Install **from this maintained source** — do *not* use `npm install -g gitbook-cli`,
which pulls the abandoned upstream package from the npm registry without our fixes:

```bash
git clone https://github.com/allamiro/tamir-gitbook.git
npm install -g ./tamir-gitbook/gitbook-cli
```

Works on Node.js 10 through current LTS (22/24 tested in CI); the
[tamir-gitbook-wiki Docker image](https://github.com/allamiro/tamir-gitbook)
packages everything preconfigured on Node 22.

## Development & tests

```bash
cd gitbook-cli
npm install
npm run test:unit   # fast offline unit tests (run in CI)
npm test            # full suite — installs GitBook versions from the npm registry
```

## How to use it?

### Run GitBook

Run command `gitbook build`, `gitbook serve` (read [GitBook documentation](https://github.com/GitbookIO/gitbook/blob/master/docs/setup.md) for details).

List all available commands using:

```
$ gitbook help
```

#### Specify a specific version

By default, GitBook CLI will read the gitbook version to use from the book configuration, but you can force a specific version using `--gitbook` option:

```
$ gitbook build ./mybook --gitbook=2.0.1
```

and list available commands in this version using:

```
$ gitbook help --gitbook=2.0.1
```

#### Manage versions

List installed versions:

```
$ gitbook ls
```

List available versions on NPM:

```
$ gitbook ls-remote
```

Install a specific version:

```
$ gitbook fetch 2.1.0

# or a pre-release

$ gitbook fetch beta
```

Update to the latest version

```
$ gitbook update
```

Uninstall a specific version

```
$ gitbook uninstall 2.0.1
```

Use a local folder as a GitBook version (for developement)

```
$ gitbook alias ./mygitbook latest
```
