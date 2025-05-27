# Configuration

GitBook allows you to customize your book using a flexible configuration in the `book.json` file.

## Basic Configuration

Here's a sample `book.json` configuration:

```json
{
  "title": "My Book",
  "author": "Author Name",
  "language": "en",
  "plugins": ["search", "theme-default"],
  "pluginsConfig": {
    "theme-default": {
      "showLevel": true
    }
  }
}
```

## Plugins

GitBook has a rich ecosystem of plugins that can enhance your book:

- `search`: Add search functionality (included by default)
- `highlight`: Syntax highlighting for code blocks
- `expandable-chapters`: Make chapters expandable/collapsible
- `back-to-top-button`: Add a back-to-top button
- `copy-code-button`: Add a copy button to code blocks

## PDF Configuration

For PDF output, you can configure options like:

```json
"pdf": {
  "pageNumbers": true,
  "fontSize": 12,
  "fontFamily": "Arial",
  "paperSize": "a4"
}
```
