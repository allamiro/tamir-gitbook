FROM node:10.24.1-alpine3.11

# Node 10 is intentional: it is the last major version compatible with the
# legacy GitBook CLI (3.2.3). Version/revision labels are applied by CI
# (docker/metadata-action); only static metadata lives here.
LABEL org.opencontainers.image.title="tamir-gitbook-wiki" \
      org.opencontainers.image.description="GitBook CLI 3.2.3 documentation server on Node.js 10" \
      org.opencontainers.image.authors="Tamir Suliman" \
      org.opencontainers.image.source="https://github.com/allamiro/tamir-gitbook" \
      org.opencontainers.image.licenses="Apache-2.0"

# Install dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    ca-certificates \
    unzip \
    openssh

# Set working directory
WORKDIR /gitbook

# Install GitBook CLI from the vendored source (gitbook-cli/) — we own and
# maintain this copy since upstream is deprecated. The CLI spawns the system
# npm (it no longer bundles a programmatic npm), so the old graceful-fs
# post-install patches are gone with it.
COPY gitbook-cli /opt/gitbook-cli
RUN npm install -g /opt/gitbook-cli && \
    mkdir -p /root/.gitbook && \
    # Pre-install GitBook to cache common dependencies
    gitbook fetch 3.2.3 && \
    # Drop npm/tmp leftovers from the fetch so they don't ship (or get
    # flagged by scanners) in the final image
    rm -rf /tmp/* /root/.npm

# Copy package files first (for better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the files
COPY . .

# GitBook site (4000) and LiveReload (35729)
EXPOSE 4000 35729

# gitbook serve rebuilds the book on startup, so allow a generous start period
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://localhost:4000/ >/dev/null || exit 1

# Command to run GitBook
CMD ["gitbook", "serve"]
