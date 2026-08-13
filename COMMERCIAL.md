# Licensing

This project is **open core**. Almost all of it is open source; a small,
clearly separated part is commercial.

## What is open source (Apache-2.0)

Everything outside the `ee/` directory, which is to say everything the
project ships today:

- the `tamir-gitbook-wiki` Docker image and its build
- the maintained [`gitbook-cli`](gitbook-cli/) and its release tarball
- the engine compatibility patches and vulnerability remediation in `scripts/`
- the themes, the sample book, the CI pipeline and the documentation

Use it for anything, including commercially, under the [Apache License
2.0](LICENSE). This will not change: the open-source parts stay open source,
and past releases remain Apache-2.0 permanently in any case.

## What is commercial (Enterprise Edition)

Only code inside [`ee/`](ee/), licensed under [LICENSE-EE](LICENSE-EE).
Enterprise features are **additive**: the open-source edition is a complete,
working product on its own and never has functionality removed to sell it
back. Nothing in `ee/` is required to run, build, serve, or secure a wiki.

Enterprise code is **free for personal and lab use** — personal projects,
home labs, evaluation, development, teaching and non-commercial research
cost nothing and require no agreement. A commercial licence is needed only
for production use and for use by organizations in the course of business.

> **Status:** the `ee/` tree is a scaffold. No enterprise features have been
> built yet — see [ee/README.md](ee/README.md) for what is planned and how
> the boundary is enforced.

## Why the split works this way

The core is a maintained continuation of GitBook's discontinued open-source
tooling. That code is Apache-2.0 and derives from third-party Apache-2.0
work, so it stays open — relicensing it would be neither possible nor
honest. Enterprise features are new, independently written code that never
existed upstream, kept in a separate directory so the boundary is obvious
and auditable.

The boundary is checked in CI by
[`scripts/check-license-boundary.sh`](scripts/check-license-boundary.sh),
which fails the build if Apache-licensed code imports from `ee/`, if an
enterprise file is missing its licence header, or if `ee/` could leak into
the published Apache-licensed artifacts.

## Getting a commercial licence

Open an issue on
[github.com/allamiro/tamir-gitbook](https://github.com/allamiro/tamir-gitbook/issues)
or contact the maintainer, Tamir Suliman, through the address on
[his GitHub profile](https://github.com/allamiro).

## Contributing

Contributions to the open-source parts are accepted under Apache-2.0, as
described in [CONTRIBUTING.md](CONTRIBUTING.md). The `ee/` tree does not
accept outside contributions, so that its ownership stays unambiguous.
