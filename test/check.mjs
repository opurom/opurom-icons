#!/usr/bin/env node
// Self-check for the opurom-icons package: manifest integrity, entry document
// shape, license notice and per-icon style data. Zero dependencies.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { iconForSemantic, isBuiltin, semanticForGallery } from '../lib/semantics.mjs';

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
const byKeyword = new Map();
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
  for (const tag of icon.tags) {
    assert.ok(typeof tag === 'string' && tag.length > 0,
      `tag ${JSON.stringify(tag)} on ${icon.id} must be a non-empty string`);
    if (!byKeyword.has(tag)) byKeyword.set(tag, []);
    byKeyword.get(tag).push(icon.id);
  }
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

// The README promises keyword search over tags, digits included: an upstream
// numeric tag must be reachable through the same string lookup callers use.
assert.ok((byKeyword.get('911') || []).includes('ambulance'),
  'numeric keyword 911 must resolve to its icon');

// Shipped semantic aliases: every name resolves once, every id exists, and the
// two names with no counterpart carry an explicit degrade decision.
const table = JSON.parse(readFileSync(path.join(root, 'icons/semantics.json'), 'utf8'));
assert.equal(table.format, 1);
const semanticNames = Object.keys(table.semantics);
assert.equal(semanticNames.length, 34, 'component semantics must cover all surveyed names');
for (const [name, id] of Object.entries(table.semantics)) {
  assert.match(name, /^[a-z0-9_]+$/, `bad semantic name ${name}`);
  assert.ok(ids.has(id), `semantic ${name} maps to missing id ${id}`);
  assert.equal(iconForSemantic(name), id, `lookup for ${name} must be stable`);
}
const aliases = {
  close: 'x',
  expand_more: 'chevron-down',
  more_vert: 'dots-vertical',
  access_time: 'clock',
  done: 'check',
  arrow_back: 'arrow-left',
  skip_next: 'player-skip-forward',
  ios_share: 'share-2',
};
for (const [name, id] of Object.entries(aliases)) {
  assert.equal(iconForSemantic(name), id, `alias ${name} must resolve to ${id}`);
}
assert.throws(() => iconForSemantic('no_such_name'), /unknown semantic name/);

const galleryNames = Object.keys(table.gallery);
assert.equal(galleryNames.length, 71, 'gallery map must cover all surveyed names');
for (const name of galleryNames) {
  const semantic = semanticForGallery(name);
  assert.ok(semantic === null || /^[a-z0-9_]+$/.test(semantic), `bad semantic for ${name}`);
  assert.ok(ids.has(name) || isBuiltin(name),
    `gallery name ${name} must be a package id or built-in`);
}
assert.deepEqual(table.builtin.filter((n) => !ids.has(n)), table.builtin.slice().sort(),
  'builtin list must be sorted and free of package ids');
assert.equal(semanticForGallery('layout-bottombar'), null);
assert.equal(semanticForGallery('calendar'), 'calendar_today');
for (const name of ['layout-bottombar', 'calendar']) {
  assert.ok(typeof table.degrade[name] === 'string' && table.degrade[name].length > 0,
    `${name} must carry a degrade decision`);
}
assert.throws(() => semanticForGallery('not-a-gallery-name'), /unknown gallery name/);

const license = readFileSync(path.join(root, 'LICENSE'), 'utf8');
assert.match(license, /MIT/, 'LICENSE must be the MIT text');
const notice = readFileSync(path.join(root, 'NOTICE'), 'utf8');
assert.match(notice, /Tabler/i, 'NOTICE must credit Tabler');
assert.match(notice, /MIT/, 'NOTICE must mention MIT');

const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
assert.match(readme, /tabler\.io\/icons/, 'README must link Tabler');
assert.match(readme, /MIT/, 'README must state the MIT license');

const CJK = /[\u3400-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/;
for (const file of ['README.md', 'NOTICE', 'LICENSE', manifest.entry, 'opurom-pkg.json',
  'icons/semantics.json', 'lib/semantics.mjs']) {
  const body = readFileSync(path.join(root, file), 'utf8');
  assert.ok(!CJK.test(body), `${file} must be free of CJK characters`);
}

const digest = createHash('sha256').update(readFileSync(path.join(root, manifest.entry))).digest('hex');
process.stdout.write(`opurom-icons: ${doc.icons.length} icons, ${doc.categories.length} categories, ${semanticNames.length} aliases, ${galleryNames.length} gallery names, entry sha256 ${digest.slice(0, 16)}\n`);
