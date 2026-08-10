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

```
feat: add gitbook-plugin-anchors to the default plugin set
fix: correct LiveReload port mapping in docker-compose
docs: clarify volume-mount usage in README
```

Documentation-only pushes (README, LICENSE, CONTRIBUTING) do not trigger a new
image version.

## Submitting Changes

1. Push to your fork
2. Submit a Pull Request — CI lints the Dockerfile and smoke-tests the image
3. Once merged to `main`, a version tag, GitHub Release, and multi-arch image
   push to Docker Hub + GHCR happen automatically

## Code Style

- Follow existing code formatting
- Add comments for complex logic
- Update documentation as needed