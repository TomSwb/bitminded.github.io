# Bitminded.ch

The source of [**bitminded.ch**](https://bitminded.ch), my personal site: a window on my journey from zero code in 2024 to writing software by hand, and the place where I show my projects and games.

## What's on it

- **Home:** who I am, why I code, and my AI policy.
- **Projects:** cards for my products (C projects, this site) and my games, each linking to its GitHub repo and, for games, to the playable version on itch.io.
- **Legal and privacy notices** (Swiss site, no tracking, no forms, no analytics).

## How it's built

Plain **HTML, CSS and JavaScript**: no framework, no build step, no dependencies.

- **Data-driven project cards.** The projects page reads `products.json` and `games.json` with `fetch()` and builds one card per entry in JavaScript. Adding a project means adding an entry to the JSON, not editing HTML.
- **Output escaping.** Every value from the JSON passes through an `escapeHtml()` function before it is inserted into the page, so text in the data can never be interpreted as HTML or script.
- **Shared design tokens.** Colours and spacing live as CSS variables in `css/variables.css`, used by every page.
- **SEO and sharing.** Meta description, canonical URL, Open Graph tags (link previews on LinkedIn and messaging apps), `sitemap.xml` and crawler rules.
- **Hosting.** GitHub Pages with the custom domain `bitminded.ch` (`CNAME`), served through Cloudflare.

```
index.html          home page
projects/           projects page, cards script and JSON data
legal/              legal notice and privacy notice
css/                shared variables and home page styles
assets/             icons, logos and game images
```

## Run it locally

The project cards load JSON with `fetch()`, which browsers block for files opened directly from disk. Serve the folder instead:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## History

- **2025:** the first version was a much larger site (accounts, admin area, database) built with heavy AI assistance. It is archived in [bitminded-1.0-vide-coded](https://github.com/TomSwb/bitminded-1.0-vide-coded).
- **July 2026:** replaced by this version, rebuilt by hand and deliberately simple.

## AI use

- **Code:** the site is written by hand. AI assistants were used as a learning aid, to explain concepts and debug ideas, not to generate the code.
- **Documentation and proofreading:** this README was drafted with Claude (Anthropic) from the site's code and reviewed by me; Claude also proofread the site's English text (spelling and grammar only).

## License

Personal website. All rights reserved.
