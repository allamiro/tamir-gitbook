# Contributing to Tamir-GitBook

## Getting Started

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/tamir-gitbook.git
   ```

3. Create a new branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run locally:

   ```bash
   npm start
   ```

## Commit Messages — Conventional Commits

Releases are cut automatically from commit messages on `main`, so please follow
[Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Effect on version |
|--------|-------------------|
| `BREAKING CHANGE:` in the commit body | major (`1.0.0` → `2.0.0`) |
| `feat:` | minor (`1.0.0` → `1.1.0`) |
| `fix:`, `perf:`, `refactor:` | patch (`1.0.0` → `1.0.1`) |
| `docs:`, `chore:`, anything else | patch (default) |

> Note: use the full `BREAKING CHANGE:` footer for major bumps — the bare
> `feat!:` shorthand is not detected by the tagging action.

Examples:

```text
feat: add gitbook-plugin-anchors to the default plugin set
fix: correct LiveReload port mapping in docker-compose
docs: clarify volume-mount usage in README
```

Documentation-only pushes (README, LICENSE, CONTRIBUTING) do not trigger a new
image version.

## Submitting Changes

1. Push to your fork
2. Submit a Pull Request — CI lints the Dockerfile, smoke-tests the image,
   and runs the vendored CLI unit tests
3. Once merged to `main`, rolling images (`latest`/`main`/`sha-*`) publish to
   Docker Hub + GHCR automatically; versioned releases are cut weekly (or on
   demand) and group all merges since the previous release into one tag

## Vendored GitBook CLI (`gitbook-cli/`)

The `gitbook-cli/` directory is a vendored, maintained copy of the deprecated
upstream CLI — the Docker image installs it from this source. Changes there
ship in the image, so they trigger releases like any other code change.
Fixes should go into this source (rather than post-install patches in the
Dockerfile) whenever possible.

## Licensing of contributions

Contributions to this repository are accepted under the
[Apache License 2.0](LICENSE), the same terms as the rest of the project.

The [`ee/`](ee/) directory is the one exception: it is commercially licensed
(see [COMMERCIAL.md](COMMERCIAL.md)) and does not take outside contributions,
so its ownership stays unambiguous. Everything else — the image, the CLI, the
patches, the themes, the docs — is open source, and that is where changes are
welcome. CI enforces the boundary with
`scripts/check-license-boundary.sh`.

## Code Style

- Follow existing code formatting
- Add comments for complex logic
- Update documentation as needed
