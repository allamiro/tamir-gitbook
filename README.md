# Tamir-GitBook

A lightweight Docker image for hosting GitBook wikis, optimized for fast setup and minimal resource usage. Includes GitBook CLI for seamless book creation and serving on Node.js 10.x (compatible with GitBook 3.2.3).  

## GitBook Docker Project

This repository contains a Docker setup for building and serving a GitBook using Node.js and GitBook CLI, with all compatibility issues resolved.  

### Prerequisites

Before you begin, make sure you have Docker and Docker Compose installed on your machine:

- [Docker Installation](https://docs.docker.com/get-docker/)
- [Docker Compose Installation](https://docs.docker.com/compose/install/)

### Quick Start

To get started quickly, simply run:

```bash
# Clone the repository
git clone https://github.com/allamiro/tamir-gitbook.git
cd tamir-gitbook

# Start GitBook with Docker Compose
docker-compose up -d
```  

This will build the image, start the GitBook server, and make it available at http://localhost:4000.

### Build and Run with Docker

#### 1. Build the Docker Image

```bash
docker build -t tamir-gitbook-wiki .
```  

#### 2. Serve the GitBook

```bash
docker run -p 4000:4000 -p 35729:35729 -v $(pwd):/gitbook tamir-gitbook-wiki
```  

This will expose the GitBook server at http://localhost:4000 with live reload enabled on port 35729.

### Project Structure

The project includes a basic GitBook structure:

```
.
├── book.json          # GitBook configuration
├── README.md          # Introduction page
├── SUMMARY.md         # Table of contents
├── chapter-1/         # Chapter 1 content
│   ├── README.md
│   └── getting-started.md
└── chapter-2/         # Chapter 2 content
    ├── README.md
    └── configuration.md
```

### Customizing Content

To customize your GitBook:

1. Edit Markdown files in the project directory
2. Changes will be automatically reflected thanks to live reload
3. Modify `book.json` to configure plugins and settings
4. Update `SUMMARY.md` to change the table of contents

### Technical Notes

- Built on Node.js 10.x (compatible with GitBook)
- Includes fixes for graceful-fs polyfills
- Configured with useful plugins: search, expandable chapters, etc.
- Uses Docker volumes for efficient caching
