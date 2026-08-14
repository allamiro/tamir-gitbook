# Themes

Ready-made looks for your wiki, inspired by the theme options on today's
GitBook.com (light/dark modes, accent colors, rounded corners, gradient
headers). Pick one by pointing `book.json` at it:

```json
{
  "styles": {
    "website": "themes/modern.css"
  }
}
```

Restart (or let live reload rebuild) and the theme is applied.

| Theme | File | Look |
|-------|------|------|
| Modern | `themes/modern.css` | Clean light theme: soft sidebar, blue accent, rounded corners, styled hint blocks — the default for this wiki |
| Modern Dark | `themes/modern-dark.css` | The same design in dark mode |
| Gradient | `themes/gradient.css` | Modern with a violet-to-blue gradient header band and gradient page titles |
| Classic | *(remove the `styles` entry)* | The original GitBook 3.x look |

## Change the accent color

Each theme defines its palette in CSS variables at the top of the file.
Change the accent in one place:

```css
:root {
    --tg-accent: #2962ff;                      /* your brand color */
    --tg-accent-soft: rgba(41, 98, 255, 0.08); /* same color, low alpha */
}
```

## Reader-side modes

Independent of the theme, readers can use the built-in font-settings toggle
(the `A` button in the toolbar) to switch between White, Sepia, and Night
reading modes and adjust the font family and size. If you ship
`modern-dark.css`, consider it the site's default look rather than combining
it with the Night reading mode.

## Attribution footer

The image bundles a small `site-footer` plugin that appends a line like
*Built with ♥ by Your Name* to the bottom of every page. It does nothing
until a book opts in, so no one inherits someone else's footer:

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
used on its own. The footer picks up
the current theme's border, muted-text and accent colours automatically, and
is written into the HTML at build time — so it survives `gitbook build` and
needs no JavaScript.

Source: [`gitbook-plugin-site-footer/`](../gitbook-plugin-site-footer/).

## Make your own

Copy any theme file, adjust the variables and rules, save it under
`themes/`, and point `book.json` at it. The classic GitBook DOM you're
styling: `.book-summary` (sidebar), `.book-header` (top bar),
`.markdown-section` (page content), `#book-search-input` (search).
