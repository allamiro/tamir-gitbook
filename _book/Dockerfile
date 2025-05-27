FROM node:10.24.1-alpine3.11

# Metadata
LABEL maintainer="Tamir Suliman"
LABEL version="1.1"
LABEL description="Docker image for GitBook with Node.js 10.x"

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

# Install GitBook CLI with compatibility fixes
RUN npm install -g gitbook-cli@2.3.2 && \
    # Create necessary directories for gitbook installation
    mkdir -p /root/.gitbook && \
    # Fix graceful-fs issues by replacing the polyfills.js file
    sed -i "s/\.\.\/\.\.\/\.\.\/fs\"/fs/" /usr/local/lib/node_modules/gitbook-cli/node_modules/npm/node_modules/graceful-fs/polyfills.js && \
    sed -i 's/fs\.stat = statFix(fs\.stat)/\/\/ fs\.stat = statFix(fs\.stat)/g' /usr/local/lib/node_modules/gitbook-cli/node_modules/npm/node_modules/graceful-fs/polyfills.js && \
    sed -i 's/fs\.fstat = statFix(fs\.fstat)/\/\/ fs\.fstat = statFix(fs\.fstat)/g' /usr/local/lib/node_modules/gitbook-cli/node_modules/npm/node_modules/graceful-fs/polyfills.js && \
    sed -i 's/fs\.lstat = statFix(fs\.lstat)/\/\/ fs\.lstat = statFix(fs\.lstat)/g' /usr/local/lib/node_modules/gitbook-cli/node_modules/npm/node_modules/graceful-fs/polyfills.js && \
    # Pre-install GitBook to cache common dependencies
    gitbook fetch 3.2.3

# Copy package files first (for better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the files
COPY . .

# Expose the port for GitBook
EXPOSE 4000

# Command to run GitBook
CMD ["gitbook", "serve"]
