// Semantic name lookup over the shipped alias table. Zero dependencies.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const table = JSON.parse(
  readFileSync(path.join(import.meta.dirname, '..', 'icons', 'semantics.json'), 'utf8'),
);

export function iconForSemantic(name) {
  const id = table.semantics[name];
  if (typeof id !== 'string') throw new Error(`unknown semantic name: ${name}`);
  return id;
}

export function semanticForGallery(name) {
  if (!Object.hasOwn(table.gallery, name)) throw new Error(`unknown gallery name: ${name}`);
  return table.gallery[name];
}

export function isBuiltin(name) {
  return Object.hasOwn(table, 'builtin') && table.builtin.includes(name);
}
