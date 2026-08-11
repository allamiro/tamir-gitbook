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

## Make your own

Copy any theme file, adjust the variables and rules, save it under
`themes/`, and point `book.json` at it. The classic GitBook DOM you're
styling: `.book-summary` (sidebar), `.book-header` (top bar),
`.markdown-section` (page content), `#book-search-input` (search).
