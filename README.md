# Tamir-gitbook
A lightweight Docker image for hosting GitBook wikis, optimized for fast setup and minimal resource usage. Includes GitBook CLI for seamless book creation and serving on Node.js
## GitBook Docker Project

This repository contains a Docker setup for building and serving a GitBook using Node.js and GitBook CLI.

### Prerequisites

Before you begin, make sure you have Docker and Docker Compose installed on your machine.

- [Docker Installation](https://docs.docker.com/get-docker/)
- [Docker Compose Installation](https://docs.docker.com/compose/install/)

### Build and Run with Docker

#### 1. Build the Docker Image

Run the following command to build the Docker image:

```bash
docker build -t tamir-gitbook-wiki .
```

#### 2. Server the Gitbook

```bash
docker run -p 4000:4000 tamir-gitbook-wiki
```
This will expose the GitBook server at http://localhost:4000.

### Use Docker Compose

Alternatively, you can use docker-compose to build and run the project with a single command:

```bash

docker-compose up -d

```
This will automatically build the image, start the GitBook server, and map it to http://localhost:4000.
