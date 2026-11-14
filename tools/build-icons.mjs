// Builds icons/icons.json from the vendored Tabler Icons source (vendor/tabler).
// Tabler Icons (https://tabler.io/icons, MIT) ships one SVG per icon under
// icons/outline and icons/filled, plus a manifest (icons.json) describing each
// icon's category and tags. This script parses them into a style-keyed path
// table so the package ships every icon for the styles it defines. Build step
// only: CI consumes the committed icons.json offline and never touches the
// network. The upstream source is not committed (gitignored under vendor/).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const STYLES = ['outline', 'filled'];
const VERSION = '3.52.0';
const root = path.resolve(import.meta.dirname, '..');
const vendor = path.join(root, 'vendor', 'tabler');
const manifestPath = path.join(vendor, 'icons.json');
const outPath = path.join(root, 'icons', 'icons.json');

if (!existsSync(manifestPath)) {
  process.stderr.write(
    `missing upstream source at ${manifestPath}\n` +
      'fetch it before rebuilding:\n' +
      '  npm pack @tabler/icons@' + VERSION + ' && tar xzf tabler-icons-' + VERSION + '.tgz\n' +
      '  mkdir -p vendor/tabler && cp -R package/icons package/icons.json package/LICENSE vendor/tabler/\n',
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Pull the drawable <path d> values from one SVG, dropping the full-frame
// background path (M0 0h24v24H0z) that only clears the canvas.
function pathsOf(svg) {
  const out = [];
  const re = /<path\b[^>]*\bd="([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const d = m[1].trim();
    if (d === 'M0 0h24v24H0z') continue;
    out.push({ d });
  }
  return out;
}

function readStyle(dir, name) {
  const p = path.join(vendor, 'icons', dir, `${name}.svg`);
  if (!existsSync(p)) return null;
  const paths = pathsOf(readFileSync(p, 'utf8'));
  return paths.length ? paths : null;
}

const icons = [];
const categories = new Set();
for (const [name, meta] of Object.entries(manifest)) {
  if (name.startsWith('__')) continue;
  const styles = {};
  const outline = readStyle('outline', name);
  if (outline) styles.outline = outline;
  const filled = readStyle('filled', name);
  if (filled) styles.filled = filled;
  if (Object.keys(styles).length === 0) continue;
  if (meta.category) categories.add(meta.category);
  icons.push({
    id: name,
    name,
    category: meta.category || 'Other',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    viewBox: '0 0 24 24',
    paths: styles.outline || styles.filled,
    styles,
  });
}
icons.sort((a, b) => a.id.localeCompare(b.id));

const doc = {
  format: 1,
  license: 'MIT',
  attribution: 'Tabler Icons (https://tabler.io/icons), MIT. Full text in LICENSE and NOTICE.',
  source: {
    site: 'https://tabler.io/icons',
    repository: 'https://github.com/tabler/tabler-icons',
    version: VERSION,
    redistributed: true,
  },
  viewBox: '0 0 24 24',
  styles: STYLES,
  count: icons.length,
  categories: [...categories].sort(),
  icons,
};

writeFileSync(outPath, JSON.stringify(doc) + '\n');
process.stdout.write(`wrote ${outPath}: ${icons.length} icons, ${categories.size} categories\n`);
