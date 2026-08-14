# Themes

Ready-made looks for your wiki. Every theme is a single CSS file with its
palette in variables at the top, so recolouring one is a two-line edit.

## Applying a theme

Point `book.json` at the CSS file:

```json
{
  "styles": {
    "website": "themes/apple.css"
  }
}
```

That is the whole mechanism — `styles.website` is a path, relative to your
book's root, to a stylesheet loaded after GitBook's own. Then:

- **With live reload running** (`docker compose up -d`), just save `book.json`;
  the page reloads with the new theme.
- **Otherwise**, restart the container: `docker compose restart`.
- **For a static site**, rebuild: `gitbook build`.

To go back to the stock GitBook look, remove the `styles` entry entirely.

Other formats can have their own stylesheet if you generate them —
`"styles": { "website": "themes/apple.css", "pdf": "themes/print.css" }`.

## Available themes

| Theme | File | Look |
|-------|------|------|
| Modern | `themes/modern.css` | Clean light theme: soft sidebar, blue accent, rounded corners, styled hint blocks — the default for this wiki |
| Modern Dark | `themes/modern-dark.css` | The same design in dark mode |
| Gradient | `themes/gradient.css` | Modern with a violet-to-blue gradient header band and gradient page titles |
| Apple | `themes/apple.css` | apple.com's documentation style: San Francisco type with tight tracking, large light headings, lots of whitespace, soft grey code panels and a translucent header |
| GitHub | `themes/github.css` | GitHub's own repository/docs look: Primer greys, underlined `h1`/`h2`, boxed code, zebra-striped tables |
| Classic | *(remove the `styles` entry)* | The original GitBook 3.x look |

## Changing the accent colour

Each theme defines its palette in CSS variables at the top of the file.
Change the accent in one place and everything follows — links, the active
sidebar item, code chips, the footer:

```css
:root {
    --tg-accent: #0071e3;                      /* your brand colour */
    --tg-accent-soft: rgba(0, 113, 227, 0.08); /* same colour, low alpha */
}
```

The full set: `--tg-accent`, `--tg-accent-soft`, `--tg-bg`, `--tg-sidebar-bg`,
`--tg-border`, `--tg-text`, `--tg-muted`, `--tg-radius`, `--tg-font`,
`--tg-mono`.

## Reader-side modes

Independent of the theme, readers can use the built-in font-settings toggle
(the `A` button in the toolbar) to switch between White, Sepia and Night
reading modes and adjust the font family and size. If you ship
`modern-dark.css`, treat it as the site's default look rather than combining
it with the Night reading mode.

## Attribution footer

The image bundles a small `site-footer` plugin that appends a line like
*Built with ♥ by Your Name · Powered by GitBook* to the bottom of every page.
It does nothing until a book opts in, so no one inherits someone else's
footer:

```json
{
  "plugins": ["site-footer"],
  "pluginsConfig": {
    "site-footer": {
      "author": "Your Name",
      "url": "https://github.com/you",
      "prefix": "Built with",
      "heart": true,
      "poweredBy": true
    }
  }
}
```

`url` is optional (the name renders as plain text without it), `prefix`
defaults to "Built with", and `heart: false` drops the ♥. `poweredBy: true`
adds a *Powered by GitBook* credit linking to the
[GitBook project](https://github.com/GitbookIO/gitbook); pass an object
(`{ "label": "…", "url": "…" }`) to point it elsewhere. Either half can be
used on its own. The footer picks up the current theme's border, muted-text
and accent colours automatically, and is written into the HTML at build time
— so it survives `gitbook build` and needs no JavaScript.

Source: [`gitbook-plugin-site-footer/`](../gitbook-plugin-site-footer/).

## Make your own

Copy any theme file, adjust the variables and rules, save it under `themes/`,
and point `book.json` at it. The classic GitBook DOM you are styling:

| Selector | Part of the page |
|----------|------------------|
| `.book-summary` | the sidebar |
| `.book-summary ul.summary li.active > a` | the current page in the sidebar |
| `.book-header` | the top bar |
| `.markdown-section` | the page content |
| `.markdown-section pre` / `code` | code blocks and inline code |
| `#book-search-input` | the search box |
| `.navigation` | the previous/next chevrons |
| `.site-footer` | the attribution footer, if enabled |
