#!/bin/sh
# Replace known-vulnerable packages nested inside the legacy GitBook engine
# tree with their patched releases. Each replacement is version-guarded: a
# directory is only swapped when it contains exactly the vulnerable version,
# so re-runs and engine updates are safe no-ops.
#
# Replacements are installed self-contained (npm --global-style) so packages
# whose patched versions grew new dependencies keep working. Verified against
# GitBook 3.2.3: serve, build, and plugin install are exercised by CI after
# this script runs.
set -eu

ROOT="${1:?usage: patch-vulnerable-deps.sh <tree-root>}"
CACHE="$(mktemp -d)"
trap 'rm -rf "$CACHE"' EXIT

get() { # name version -> cached self-contained install
    key="$1@$2"
    if [ ! -d "$CACHE/$key" ]; then
        mkdir -p "$CACHE/$key"
        npm install "$key" --prefix "$CACHE/$key" --global-style \
            --loglevel=error --no-save --no-audit --no-package-lock --no-fund >/dev/null
    fi
}

replace() { # name from-version to-version
    name="$1"; from="$2"; to="$3"
    find "$ROOT" -type d -name "$name" -path "*/node_modules/$name" -not -path '*/.bin/*' \
    | while IFS= read -r dir; do
        pj="$dir/package.json"
        [ -f "$pj" ] || continue
        v=$(node -p "try{require('$pj').version}catch(e){''}" 2>/dev/null || echo '')
        [ "$v" = "$from" ] || continue
        get "$name" "$to"
        rm -rf "$dir"
        cp -R "$CACHE/$name@$to/node_modules/$name" "$dir"
        echo "  patched $name@$from -> $to  ($dir)"
    done
}

echo "Patching known-vulnerable packages under $ROOT"

# The engine's bundled npm is replaced with a system-npm shim by the CLI
# itself (gitbook-cli/lib/patches.js, applied during `gitbook fetch`), so it
# is already gone by the time this script runs — along with the vulnerable
# dependency tree it used to drag in. Nothing to do here.


# request 2.72.0 depends on hawk/hoek (no fixed releases exist). 2.88.2 is
# the final request and dropped hawk entirely.
replace request 2.72.0 2.88.2

# Direct drop-in security bumps (same API surface, verified by smoke tests).
replace ajv 6.12.6 6.14.0
replace bl 1.1.2 1.2.3
replace body-parser 1.14.2 1.20.6
replace body-parser 1.20.3 1.20.6
replace debug 2.2.0 2.6.9
replace deep-extend 0.4.2 0.5.1
replace form-data 1.0.1 2.5.6
replace form-data 2.3.3 2.5.6
replace form-data 2.5.4 2.5.6
replace fresh 0.3.0 0.5.2
replace highlight.js 9.2.0 10.4.1
replace highlight.js 9.8.0 10.4.1
replace highlight.js 9.18.2 10.4.1
replace ip 1.1.5 1.1.9
replace lodash 3.10.1 4.18.1
replace lodash 4.17.21 4.18.1
replace mime 1.3.4 1.6.0
replace minimist 0.0.8 0.2.4
replace moment 2.13.0 2.30.1
replace ms 0.7.1 2.0.0
replace node.extend 1.0.8 1.1.7
replace nth-check 1.0.2 2.1.1
replace object-path 0.9.2 0.11.8
replace open 0.0.5 7.4.2
replace qs 5.1.0 6.15.2
replace qs 5.2.0 6.15.2
replace qs 6.1.4 6.15.2
replace qs 6.5.3 6.15.2
replace qs 6.5.5 6.15.2
replace qs 6.13.0 6.15.2
replace qs 6.14.2 6.15.2
replace semver 4.3.6 5.7.2
replace semver 5.1.0 5.7.2
replace semver 5.7.1 5.7.2
replace send 0.13.2 0.19.0
replace static-eval 0.1.1 2.0.2
replace tmp 0.0.28 0.2.7
replace tough-cookie 2.2.2 4.1.3
replace tough-cookie 2.5.0 4.1.3
replace tunnel-agent 0.4.3 0.6.0
replace urijs 1.18.0 1.19.11

# Fixes inside the replacement trees themselves (npm 6's vintage deps and
# the current global npm's lagging deps).
replace ansi-regex 3.0.0 3.0.1
replace ansi-regex 4.1.0 4.1.1
replace brace-expansion 1.1.11 1.1.18
replace brace-expansion 5.0.7 5.0.9
replace cross-spawn 5.1.0 6.0.6
replace http-cache-semantics 3.8.1 4.1.1
replace minimatch 3.1.2 3.1.4
replace tar 4.4.19 7.5.21
replace tar 7.5.19 7.5.21
replace ip-address 10.2.0 10.3.1
replace undici 6.27.0 6.28.0

# NOT patched (documented in .trivyignore):
# - immutable 3.8.3: the engine's core data layer. immutable 4 breaks its
#   Record definitions ("Cannot define Record with property 'entries'") —
#   verified by attempting the swap; serve fails to render pages.
# - braces 1.8.5 / 2.3.2: ReDoS via crafted glob patterns; globs here come
#   from the book author, not untrusted input. No fixed 1.x/2.x exists and
#   braces 3 breaks the chokidar 1.x/micromatch 2.x consumers.

# send 0.13 reads res._headers, which modern Node removed — any conditional
# request (browser cache revalidation) crashes the serve process. Route the
# reads through res.getHeaders() with a _headers fallback.
SEND_JS="$ROOT/node_modules/send/index.js"
if [ -f "$SEND_JS" ] && grep -q 'this\.res\._headers' "$SEND_JS"; then
    sed -i \
        -e 's#this\.res\._headers#(this.res.getHeaders ? this.res.getHeaders() : this.res._headers or_else {})#g' \
        -e 's#Object\.keys(res\._headers #Object.keys((res.getHeaders ? res.getHeaders() : res._headers) #' \
        -e 's#res\._headers = null#if (res.getHeaderNames) { res.getHeaderNames().forEach(function (h) { res.removeHeader(h) }) } else { res._headers = null }#' \
        -e 's#or_else#||#g' \
        "$SEND_JS"
    echo "  patched send res._headers for modern Node"
fi

# npmi JSON.parses installed package.json files raw; plugin packages with a
# UTF-8 BOM crash it (surfaced once npm 6 resolves newer plugin releases).
NPMI_JS="$ROOT/node_modules/npmi/npmi.js"
if [ -f "$NPMI_JS" ]; then
    sed -i "s|var pkg = JSON.parse(pkgRawData);|var pkg = JSON.parse(String(pkgRawData).replace(/^\\\\uFEFF/, ''));|" "$NPMI_JS"
    echo "  patched npmi BOM handling"
fi

# hawk/hoek were only ever request's dependencies; request 2.88.2 no longer
# uses them and no fixed hawk 3.x / hoek 2.x exists — remove the orphans.
for orphan in hawk hoek; do
    if [ -d "$ROOT/node_modules/$orphan" ]; then
        rm -rf "$ROOT/node_modules/$orphan"
        echo "  removed orphaned $orphan"
    fi
done

echo "Patch pass complete"
