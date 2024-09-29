FROM node:18-alpine
# Install Bun
RUN apk add --no-cache bash curl && \
    curl -fsSL https://bun.sh/install | bash && \
    export BUN_INSTALL="$HOME/.bun" && \
    export PATH="$BUN_INSTALL/bin:$PATH"
# Set the working directory
WORKDIR /gitbook
COPY . /gitbook
RUN /root/.bun/bin/bun install
EXPOSE 3000
CMD ["/root/.bun/bin/bun", "dev"]
