# Enterprise Edition (`ee/`)

> **This directory is not Apache-2.0.** Code here is licensed under
> [LICENSE-EE](../LICENSE-EE) — free for personal, lab, evaluation and
> educational use; a commercial licence is required for production and
> business use. Everything outside this directory is Apache-2.0.
> See [COMMERCIAL.md](../COMMERCIAL.md).

**Status: scaffold. Nothing has been built here yet.** The open-source
edition is complete and self-sufficient; this tree exists so that if
enterprise features are added, the licensing boundary is unambiguous from
the first commit rather than retrofitted later.

## Rules for this directory

1. **Additive only.** Nothing may move from the Apache-2.0 tree into `ee/`,
   and no open-source feature may be removed or crippled to create demand
   for an enterprise one.
2. **One-way dependencies.** `ee/` may import from the Apache-2.0 tree.
   The Apache-2.0 tree must never import from `ee/` — otherwise the open
   edition would stop working without commercial code.
3. **Every file carries the header** below, so the licence of any file is
   obvious in isolation.
4. **Never shipped in the open-source artifacts.** `ee/` is excluded from
   the Docker image (`.dockerignore`) and from the `gitbook-cli` npm
   tarball, so published Apache-2.0 artifacts contain no enterprise code.
5. **No outside contributions**, keeping ownership unambiguous.

All five rules are enforced in CI by
[`scripts/check-license-boundary.sh`](../scripts/check-license-boundary.sh).

## Required file header

Every source file in this directory must begin with:

```js
/*
 * tamir-gitbook Enterprise Edition
 * Copyright (c) 2026 Tamir Suliman. All rights reserved.
 * Licensed under the tamir-gitbook Enterprise Edition License (LICENSE-EE).
 * NOT licensed under Apache-2.0.
 */
```

Use the equivalent comment syntax for other file types.

## Candidate features

Ideas only — none of this is implemented or promised:

- Authentication in front of a served book (SSO / OIDC / LDAP)
- Managing many books or tenants from one deployment
- An air-gapped mirror of the GitBook engine and plugin registry, for
  networks that cannot reach npm
- Access and change audit logging
- Bulk import/export and migration tooling

Anything that makes the *open* edition work properly — compatibility fixes,
security patches, the CLI, the image — belongs in the Apache-2.0 tree, not
here.
