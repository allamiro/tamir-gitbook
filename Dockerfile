FROM node:10-alpine
# Metadata
LABEL maintainer="Tamir Suliman"
LABEL version="1.0"
LABEL description="Docker image for GitBook with Bun support"
RUN apk add --no-cache bash curl unzip
# Install Bun 
RUN curl -fsSL https://bun.sh/install | bash && \
    export BUN_INSTALL="$HOME/.bun" && \
    export PATH="$BUN_INSTALL/bin:$PATH"
WORKDIR /gitbook
# Copy the files to the working directory
COPY . /gitbook
RUN npm install -g gitbook-cli@2.3.2
# Expose the port for GitBook
EXPOSE 4000
# Command to run GitBook's
CMD ["gitbook", "serve"]
