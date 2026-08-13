#!/bin/sh
# Enforce the open-core boundary: everything outside ee/ is Apache-2.0 and
# must stay independently usable, while ee/ is commercially licensed and must
# never leak into the published Apache-2.0 artifacts.
#
# Run from the repository root:  sh scripts/check-license-boundary.sh
set -eu

fail=0
note() { echo "  $1"; }
problem() { echo "FAIL: $1"; fail=1; }

echo "Checking the Apache-2.0 / Enterprise Edition boundary"

# 1. The licences themselves must exist and be distinguishable.
for f in LICENSE LICENSE-EE NOTICE COMMERCIAL.md ee/README.md; do
    [ -f "$f" ] || problem "missing $f"
done

# 2. The Apache-2.0 tree must never depend on ee/. If it did, the open
#    edition would stop working without commercially licensed code.
offenders=$(grep -rIl --exclude-dir=node_modules --exclude-dir=.git \
    --exclude-dir=_book --exclude-dir=ee \
    -e "require(['\"].*\.\./ee/" -e "require(['\"]\./ee/" -e "from ['\"].*/ee/" \
    . 2>/dev/null | grep -v -e './scripts/check-license-boundary.sh' \
                            -e './COMMERCIAL.md' -e './ee/' || true)
if [ -n "$offenders" ]; then
    problem "Apache-2.0 code imports from ee/:"
    echo "$offenders" | while IFS= read -r f; do note "$f"; done
else
    note "OK: no Apache-2.0 file imports from ee/"
fi

# 3. Every source file under ee/ must declare its licence, so no file is
#    ambiguous when read on its own. (README.md carries the notice in prose.)
if [ -d ee ]; then
    unmarked=$(find ee -type f \
        \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.ts' \
           -o -name '*.sh' -o -name '*.css' -o -name '*.py' \) 2>/dev/null \
        | while IFS= read -r f; do
            grep -q 'Enterprise Edition License' "$f" || echo "$f"
        done)
    if [ -n "$unmarked" ]; then
        problem "enterprise files without the EE licence header:"
        echo "$unmarked" | while IFS= read -r f; do note "$f"; done
    else
        note "OK: every enterprise source file carries the EE header"
    fi
fi

# 4. ee/ must be excluded from the published Docker image, which is
#    Apache-2.0 and must contain no commercially licensed code.
if grep -qE '^ee/?$' .dockerignore 2>/dev/null; then
    note "OK: ee/ is excluded from the Docker build context"
else
    problem "ee/ is not listed in .dockerignore — it could ship in the image"
fi

# 5. ee/ must not reach the gitbook-cli npm tarball either. The CLI packs
#    only its own directory, so the boundary holds as long as ee/ stays out
#    of it.
if [ -e gitbook-cli/ee ]; then
    problem "gitbook-cli/ee exists — enterprise code inside the published package"
else
    note "OK: no enterprise code inside gitbook-cli/"
fi

if [ "$fail" -eq 0 ]; then
    echo "Boundary intact."
else
    echo "Boundary violated — see the failures above."
    exit 1
fi
