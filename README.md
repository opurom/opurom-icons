# opurom-icons

The complete [Tabler Icons](https://tabler.io/icons) set packaged for Opurom in the standard external icon-package format. Every icon ships as original vector geometry in each drawing style it defines, so every consumer renders the authentic artwork without conversion and no icon is left behind.

The package is MIT licensed. The full license text ships in `LICENSE`, the required credit in `NOTICE`, and the attribution string is embedded in the package manifest, so redistribution keeps every notice the upstream requires.

## Format

The package follows the `opurom-pkg` standard format with additive icon fields:

```json
{
  "name": "opurom-icons",
  "version": "0.1.0",
  "kind": "icons",
  "entry": "icons/icons.json",
  "license": "MIT",
  "attribution": "…",
  "iconSource": { "site": "https://tabler.io/icons", "repository": "https://github.com/tabler/tabler-icons", "version": "3.52.0", "redistributed": true },
  "viewBox": "0 0 24 24",
  "styles": ["outline", "filled"],
  "count": 5491,
  "files": ["…"]
}
```

The entry document is a plain JSON icon table. Each icon carries one path list per drawing style:

```json
{
  "format": 1,
  "license": "MIT",
  "attribution": "…",
  "source": { "site": "https://tabler.io/icons", "repository": "https://github.com/tabler/tabler-icons", "version": "3.52.0" },
  "viewBox": "0 0 24 24",
  "styles": ["outline", "filled"],
  "count": 5491,
  "categories": ["Animals", "Arrows", "…"],
  "icons": [
    {
      "id": "home",
      "name": "home",
      "category": "Buildings",
      "tags": ["house", "building", "…"],
      "viewBox": "0 0 24 24",
      "styles": {
        "outline": [{ "d": "…" }],
        "filled": [{ "d": "…" }]
      }
    }
  ]
}
```

`viewBox` is preserved per icon so renderers can paint the data unmodified at any size, and the geometry stays deterministic.

## Styles

Tabler draws each icon in up to two styles, both shipped here when present:

- `outline` — stroke-drawn geometry (`fill: none`, `stroke: currentColor`, `stroke-width: 2`).
- `filled` — the solid fill variant, present for the icons Tabler defines a filled form for.

## Names

Icons use Tabler's kebab-case identifiers (`home`, `brand-github`, …) and carry their upstream category plus keyword tags, so a caller can filter by category or search by keyword without a second data source.

## Refresh

The upstream source is not committed: `tools/build-icons.mjs` reads the raw `icons.json` and the per-icon SVGs from `vendor/tabler/` (gitignored). Fetch them from the npm package before rebuilding, then the script parses the source into `icons/icons.json`. CI never touches the network and offline builds consume the committed JSON.

```sh
node tools/build-icons.mjs
```

## Verify

```sh
node test/check.mjs
```

The check validates the manifest against the real files, the entry document shape, the license and notice text, the absence of CJK characters, and that every icon carries at least one drawing style.
