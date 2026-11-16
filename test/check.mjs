#!/usr/bin/env node
// Self-check for the opurom-icons package: manifest integrity, entry document
// shape, license notice and per-icon style data. Zero dependencies.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'opurom-pkg.json'), 'utf8'));

for (const field of ['name', 'version', 'kind', 'entry', 'license', 'files']) {
  assert.ok(manifest[field] !== undefined, `manifest must declare ${field}`);
}
assert.equal(manifest.name, 'opurom-icons');
assert.equal(manifest.kind, 'icons');
assert.equal(manifest.license, 'MIT');
assert.ok(manifest.files.includes(manifest.entry), 'entry must be part of files');

for (const file of manifest.files) {
  assert.doesNotThrow(() => readFileSync(path.join(root, file)), `missing file ${file}`);
}

const doc = JSON.parse(readFileSync(path.join(root, manifest.entry), 'utf8'));
assert.equal(doc.format, 1);
assert.equal(doc.license, 'MIT');
assert.equal(doc.viewBox, '0 0 24 24');
assert.deepEqual(doc.styles, ['outline', 'filled']);
assert.ok(Array.isArray(doc.icons), 'icons must be an array');
assert.equal(doc.count, doc.icons.length, 'count must match icon array length');
assert.ok(doc.icons.length > 5000, 'expected more than five thousand icons');

// The manifest describes the same vendored set as the entry document: a stale
// count, style list or source would ship wrong metadata to the registry.
assert.equal(manifest.count, doc.count, 'manifest count must match entry count');
assert.equal(manifest.viewBox, doc.viewBox, 'manifest viewBox must match entry viewBox');
assert.deepEqual(manifest.styles, doc.styles, 'manifest styles must match entry styles');
assert.equal(manifest.license, doc.license, 'manifest license must match entry license');
assert.equal(manifest.attribution, doc.attribution, 'manifest attribution must match entry');
assert.deepEqual(manifest.iconSource, doc.source, 'manifest iconSource must match entry source');
assert.ok(doc.attribution && doc.attribution.length > 0, 'entry must carry an attribution');
for (const field of ['site', 'repository', 'version']) {
  assert.ok(doc.source && typeof doc.source[field] === 'string' && doc.source[field].length > 0,
    `entry source must declare ${field}`);
}

const ids = new Set();
const categories = new Set();
for (const icon of doc.icons) {
  assert.match(icon.id, /^[a-z0-9-]+$/, `bad id ${icon.id}`);
  assert.ok(!ids.has(icon.id), `duplicate id ${icon.id}`);
  ids.add(icon.id);
  assert.equal(icon.name, icon.id);
  assert.equal(icon.viewBox, '0 0 24 24');
  assert.ok(typeof icon.category === 'string' && icon.category.length > 0,
    `icon ${icon.id} must carry a category`);
  categories.add(icon.category);
  assert.ok(Array.isArray(icon.tags), `tags on ${icon.id} must be an array`);
  // The top-level path list mirrors the outline style: pkg_icons.rs reads it as
  // the IR `paths`, so drift here ships different art than the styles table.
  const mirror = icon.styles.outline || icon.styles.filled;
  assert.ok(Array.isArray(icon.paths) && icon.paths.length >= 1,
    `icon ${icon.id} has no top-level paths`);
  assert.deepEqual(icon.paths, mirror, `paths on ${icon.id} must mirror the outline style`);
  // Every emitter strokes the mirrored paths, so an icon without an outline
  // form cannot be painted: fail at check time instead of shipping art that
  // renders as a hollow outline of a silhouette.
  assert.ok(Array.isArray(icon.styles.outline) && icon.styles.outline.length >= 1,
    `icon ${icon.id} has no outline style`);
  const styles = Object.keys(icon.styles || {});
  assert.ok(styles.length >= 1, `icon ${icon.id} has no drawing style`);
  for (const style of styles) {
    assert.ok(['outline', 'filled'].includes(style), `unexpected style ${style} on ${icon.id}`);
    assert.ok(Array.isArray(icon.styles[style]) && icon.styles[style].length >= 1,
      `style ${style} on ${icon.id} has no paths`);
    for (const p of icon.styles[style]) {
      assert.ok(typeof p.d === 'string' && p.d.length > 0, `empty path on ${icon.id}/${style}`);
      assert.match(p.d.trim(), /^[Mm]/, `path on ${icon.id}/${style} must start with moveto`);
    }
  }
}

// The category list is the index callers filter by: it must list exactly the
// categories the icons carry, sorted the way the builder writes them.
assert.deepEqual(doc.categories, [...categories].sort(),
  'categories must equal the sorted set of icon categories');

const license = readFileSync(path.join(root, 'LICENSE'), 'utf8');
assert.match(license, /MIT/, 'LICENSE must be the MIT text');
const notice = readFileSync(path.join(root, 'NOTICE'), 'utf8');
assert.match(notice, /Tabler/i, 'NOTICE must credit Tabler');
assert.match(notice, /MIT/, 'NOTICE must mention MIT');

const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
assert.match(readme, /tabler\.io\/icons/, 'README must link Tabler');
assert.match(readme, /MIT/, 'README must state the MIT license');

const CJK = /[\u3400-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/;
for (const file of ['README.md', 'NOTICE', 'LICENSE', manifest.entry, 'opurom-pkg.json']) {
  const body = readFileSync(path.join(root, file), 'utf8');
  assert.ok(!CJK.test(body), `${file} must be free of CJK characters`);
}

const digest = createHash('sha256').update(readFileSync(path.join(root, manifest.entry))).digest('hex');
process.stdout.write(`opurom-icons: ${doc.icons.length} icons, ${doc.categories.length} categories, entry sha256 ${digest.slice(0, 16)}\n`);
