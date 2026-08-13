FROM node:24-alpine

# Runs on current Node LTS: the maintained gitbook-cli (3.x, in gitbook-cli/)
# replaced the abandoned upstream CLI whose bundled programmatic npm was the
# actual source of every modern-Node crash. Version/revision labels are
# applied by CI (docker/metadata-action); only static metadata lives here.
LABEL org.opencontainers.image.title="tamir-gitbook-wiki" \
      org.opencontainers.image.description="GitBook documentation server on current Node.js LTS with a maintained GitBook CLI" \
      org.opencontainers.image.authors="Tamir Suliman" \
      org.opencontainers.image.source="https://github.com/allamiro/tamir-gitbook" \
      org.opencontainers.image.licenses="Apache-2.0"

# Install dependencies; keep the global npm current (the base image's bundled
# npm lags on its own dependency patches)
RUN apk add --no-cache \
    bash \
    curl \
    git \
    ca-certificates \
    && npm install -g npm@latest --loglevel=error

# Set working directory
WORKDIR /gitbook

# Install the maintained GitBook CLI from the vendored source. Pack + install
# the tarball (a plain folder install would be symlinked by modern npm), then
# drop the source copy — the real install lives under /usr/local/lib.
COPY gitbook-cli /opt/gitbook-cli
COPY scripts/patch-vulnerable-deps.sh /usr/local/bin/patch-vulnerable-deps.sh
RUN cd /opt/gitbook-cli && \
    # Install exactly the tarball just packed: a glob would happily pick up a
    # stray gitbook-cli-*.tgz left in the build context and install that instead
    npm install -g "$(npm pack --loglevel=error | tail -1)" --loglevel=error && \
    cd / && rm -rf /opt/gitbook-cli && \
    mkdir -p /root/.gitbook && \
    # Pre-install the GitBook engine, then patch its known-vulnerable
    # nested dependencies with fixed releases
    gitbook fetch 3.2.3 && \
    sh /usr/local/bin/patch-vulnerable-deps.sh /root/.gitbook/versions/3.2.3 && \
    sh /usr/local/bin/patch-vulnerable-deps.sh /usr/local/lib/node_modules/npm && \
    # Drop npm/tmp leftovers so they don't ship (or get flagged by scanners)
    rm -rf /tmp/* /root/.npm

# Copy package files first (for better layer caching)
COPY package*.json ./
RUN npm install --no-audit --no-fund && npm cache clean --force && \
    # The baked plugins carry their own vulnerable copies (e.g. highlight.js)
    sh /usr/local/bin/patch-vulnerable-deps.sh /gitbook/node_modules

# Copy the sample book only. Repository scaffolding (git metadata, CI
# definitions, the CLI source, compose files) has no business in the served
# book: `gitbook build` copies every file it finds into the generated site,
# so anything left here is published alongside the documentation.
COPY book.json SUMMARY.md intro.md ./
COPY chapter-1 ./chapter-1
COPY chapter-2 ./chapter-2
COPY themes ./themes
COPY images ./images

# GitBook site (4000) and LiveReload (35729)
EXPOSE 4000 35729

# gitbook serve rebuilds the book on startup, so allow a generous start period
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://localhost:4000/ >/dev/null || exit 1

# Command to run GitBook
CMD ["gitbook", "serve"]
