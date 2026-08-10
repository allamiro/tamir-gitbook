# Welcome to Tamir GitBook Wiki

This is a self-hosted GitBook wiki, served by the
[tamir-gitbook-wiki](https://github.com/allamiro/tamir-gitbook) Docker image.

Use the sidebar to browse the chapters, or the search box at the top to find
anything across the whole book.

## What's in this book

* [Chapter 1](chapter-1/README.md) — start here: what you need and how to get going
* [Chapter 2](chapter-2/README.md) — configuring your book to your liking

## Editing this wiki

The content is plain Markdown. With the recommended `docker compose` setup the
project directory is mounted into the container, so:

1. Edit any `.md` file (or add new ones and list them in `SUMMARY.md`)
2. Save — live reload rebuilds the book and refreshes your browser
3. Commit and push when you're happy with the result

For everything about the Docker image itself — tags, registries, security,
releases — see the
[project README on GitHub](https://github.com/allamiro/tamir-gitbook#readme).
