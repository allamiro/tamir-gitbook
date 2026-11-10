#!/bin/sh
# Build a book with the working-tree modern-gradient plugin, using the
# published image (no local GitBook install needed).
#
#   scripts/build-theme-preview.sh <book-dir> <out-dir>
#
# The book is bind-mounted at /gitbook, a named volume seeded from the image
# provides /gitbook/node_modules (as in docker-compose.yml), and
# ./gitbook-plugin-modern-gradient is bind-mounted over the plugin's folder
# in it, so edits are picked up without rebuilding the image.
#
# Environment:
#   TAMIR_GITBOOK_IMAGE  image to build with (default allamiro1/tamir-gitbook-wiki:latest)
#   MG_NODE_MODULES      node_modules volume name (default tamir-gitbook-preview-node-modules)
#   MG_PLUGIN=0          do not mount the working-tree plugin (build as the image has it)
set -eu

if [ "$#" -ne 2 ]; then
    echo "usage: $0 <book-dir> <out-dir>" >&2
    exit 2
fi

repo=$(cd "$(dirname "$0")/.." && pwd)
book=$(cd "$1" && pwd)
mkdir -p "$2"
out=$(cd "$2" && pwd)

image=${TAMIR_GITBOOK_IMAGE:-allamiro1/tamir-gitbook-wiki:latest}
volume=${MG_NODE_MODULES:-tamir-gitbook-preview-node-modules}

if [ "$out" = "$book" ] || [ "$out" = "/" ] || [ "$out" = "$repo" ]; then
    echo "refusing to build into $out (GitBook empties the output folder)" >&2
    exit 2
fi

set -- --rm \
    -v "$book:/gitbook" \
    -v "$volume:/gitbook/node_modules" \
    -v "$out:/out"

if [ "${MG_PLUGIN:-1}" != "0" ]; then
    set -- "$@" -v "$repo/gitbook-plugin-modern-gradient:/gitbook/node_modules/gitbook-plugin-modern-gradient:ro"
fi

docker run "$@" "$image" gitbook build /gitbook /out
