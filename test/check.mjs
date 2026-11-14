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

const ids = new Set();
for (const icon of doc.icons) {
  assert.match(icon.id, /^[a-z0-9-]+$/, `bad id ${icon.id}`);
  assert.ok(!ids.has(icon.id), `duplicate id ${icon.id}`);
  ids.add(icon.id);
  assert.equal(icon.name, icon.id);
  assert.equal(icon.viewBox, '0 0 24 24');
  const styles = Object.keys(icon.styles || {});
  assert.ok(styles.length >= 1, `icon ${icon.id} has no drawing style`);
  for (const style of styles) {
    assert.ok(['outline', 'filled'].includes(style), `unexpected style ${style} on ${icon.id}`);
    assert.ok(Array.isArray(icon.styles[style]) && icon.styles[style].length >= 1,
      `style ${style} on ${icon.id} has no paths`);
    for (const p of icon.styles[style]) assert.ok(typeof p.d === 'string' && p.d.length > 0);
  }
}

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
