FROM ubuntu:22.04
# Install curl, bash, and unzip
RUN apt-get update && apt-get install -y curl bash unzip && \
    rm -rf /var/lib/apt/lists/*
# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    export BUN_INSTALL="$HOME/.bun" && \
    export PATH="$BUN_INSTALL/bin:$PATH"
WORKDIR /gitbook
# Copy the files to the working directory
COPY . /gitbook
# Install dependencies using Bun
RUN /root/.bun/bin/bun install
# Expose the port for GitBook
EXPOSE 4000
# Command to run GitBook's development server
CMD ["/root/.bun/bin/bun", "start"]
