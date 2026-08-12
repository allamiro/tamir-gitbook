#!/bin/sh
# End-to-end check of the *published* CLI package on a clean machine:
# install the release tarball, fetch the GitBook engine from the npm
# registry, create a book from scratch, install a plugin, build it, serve it,
# and exercise a browser-style conditional request.
#
# Nothing here uses this repository's working tree — that is the point. It
# catches drift the image build would hide: a bad release asset, npm or
# registry behaviour changes, plugin metadata changes, a new Node release.
#
# Usage:  e2e-cold-install.sh <url-or-path-of-gitbook-cli-tarball>
set -eu

TARBALL="${1:?usage: e2e-cold-install.sh <cli-tarball-url-or-path>}"
ENGINE_VERSION="${ENGINE_VERSION:-3.2.3}"
PORT="${PORT:-4000}"
BOOK_DIR="${BOOK_DIR:-/tmp/e2e-book}"

log() { echo "==> $*"; }

log "Installing prerequisites"
if command -v apk >/dev/null 2>&1; then
    apk add --no-cache git curl >/dev/null 2>&1
fi

log "Node $(node --version), npm $(npm --version)"

log "Installing the released CLI: $TARBALL"
npm install -g "$TARBALL" --loglevel=error
gitbook --version || true

log "Fetching the GitBook engine $ENGINE_VERSION from the registry"
gitbook fetch "$ENGINE_VERSION"

log "Creating a book from scratch in $BOOK_DIR"
rm -rf "$BOOK_DIR"
mkdir -p "$BOOK_DIR"
cd "$BOOK_DIR"
printf '# Cold install check\n\nThis book was created by the end-to-end test.\n' > README.md
printf '# Summary\n\n* [Intro](README.md)\n* [Second page](second.md)\n' > SUMMARY.md
printf '# Second page\n\nMore content.\n' > second.md
# Two plugins: proves plugin resolution works and that installing the second
# one does not evict the first
printf '{ "plugins": ["anchors", "page-toc-button"] }\n' > book.json

log "Installing plugins"
gitbook install

for plugin in gitbook-plugin-anchors gitbook-plugin-page-toc-button; do
    if [ ! -d "node_modules/$plugin" ]; then
        echo "ERROR: $plugin was not installed" >&2
        exit 1
    fi
done
log "Both plugins present after install"

log "Building the book"
gitbook build
test -f _book/index.html || { echo "ERROR: no _book/index.html" >&2; exit 1; }
grep -qi "Cold install check" _book/index.html \
    || { echo "ERROR: built page is missing its content" >&2; exit 1; }
test -f _book/second.html || { echo "ERROR: second page not built" >&2; exit 1; }
log "Static build produced the expected pages"

log "Serving the book on port $PORT"
gitbook serve --port "$PORT" >/tmp/e2e-serve.log 2>&1 &
SERVE_PID=$!
# shellcheck disable=SC2064
trap "kill $SERVE_PID 2>/dev/null || true" EXIT

up=""
i=0
while [ "$i" -lt 40 ]; do
    if curl -fsS "http://localhost:$PORT/" >/dev/null 2>&1; then
        up=yes
        break
    fi
    if ! kill -0 "$SERVE_PID" 2>/dev/null; then
        echo "ERROR: gitbook serve exited early" >&2
        tail -20 /tmp/e2e-serve.log >&2
        exit 1
    fi
    i=$((i + 1))
    sleep 3
done
[ -n "$up" ] || { echo "ERROR: server never came up" >&2; tail -20 /tmp/e2e-serve.log >&2; exit 1; }

curl -fsS "http://localhost:$PORT/" | grep -qi "Cold install check" \
    || { echo "ERROR: served page is missing its content" >&2; exit 1; }
log "Server is serving the book"

# A browser revalidating its cache once crashed the server outright; make
# sure conditional requests behave and the process survives them.
etag=$(curl -fsSI "http://localhost:$PORT/" \
    | awk -F': ' 'tolower($1)=="etag"{print $2}' | tr -d '\r')
if [ -n "$etag" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' \
        -H "If-None-Match: $etag" "http://localhost:$PORT/")
    [ "$code" = "304" ] \
        || { echo "ERROR: expected 304 for a matching ETag, got $code" >&2; exit 1; }
    log "Conditional request returned 304 as expected"
else
    log "WARNING: server sent no ETag; skipping the revalidation check"
fi

curl -fsS "http://localhost:$PORT/second.html" >/dev/null \
    || { echo "ERROR: server died or second page unreachable" >&2; exit 1; }

log "All cold-install checks passed"
