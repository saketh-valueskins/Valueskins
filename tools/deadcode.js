#!/usr/bin/env node
/**
 * Reachability analyzer for the Next.js Pages Router app.
 * Roots = everything under src/pages (Next entry points) + middleware + _app/_document.
 * Walks static imports/exports/require and reports files never reached.
 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

const all = walk(SRC);

// Resolve a specifier from a file to an on-disk path
function resolve(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package
  const cands = [];
  for (const ext of EXTS) cands.push(base + ext);
  for (const ext of EXTS) cands.push(path.join(base, 'index' + ext));
  cands.push(base);
  for (const c of cands) {
    try { if (fs.statSync(c).isFile()) return c; } catch {}
  }
  return null;
}

const IMPORT_RE = /(?:import|export)\s+(?:[\s\S]*?)\s*from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;

const graph = new Map();
for (const f of all) {
  const src = fs.readFileSync(f, 'utf8');
  const deps = new Set();
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src))) {
    const spec = m[1] || m[2] || m[3] || m[4];
    if (!spec) continue;
    const r = resolve(spec, f);
    if (r) deps.add(r);
  }
  graph.set(f, deps);
}

// Roots: all page files + middleware
const pagesDir = path.join(SRC, 'pages');
const roots = all.filter(f =>
  f.startsWith(pagesDir + path.sep) ||
  f === path.join(SRC, 'middleware.ts') ||
  f.includes('__tests__') ||
  f.endsWith('.test.ts') || f.endsWith('.test.tsx')
);

const seen = new Set();
const stack = [...roots];
while (stack.length) {
  const f = stack.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  for (const d of graph.get(f) || []) if (!seen.has(d)) stack.push(d);
}

const orphans = all.filter(f => !seen.has(f)).sort();

const rel = f => path.relative(path.dirname(SRC), f);

console.log(`TOTAL source files: ${all.length}`);
console.log(`REACHABLE from pages/: ${seen.size}`);
console.log(`ORPHANED (never imported): ${orphans.length}\n`);

// group orphans by top dir under src
const groups = {};
for (const o of orphans) {
  const r = path.relative(SRC, o);
  const top = r.split(path.sep).slice(0, 2).join('/');
  (groups[top] ||= []).push(rel(o));
}
for (const g of Object.keys(groups).sort()) {
  console.log(`\n## ${g}  (${groups[g].length})`);
  for (const f of groups[g]) {
    const lines = fs.readFileSync(path.join(path.dirname(SRC), f), 'utf8').split('\n').length;
    console.log(`   ${f}  [${lines} lines]`);
  }
}

const totalLines = orphans.reduce((a, f) => a + fs.readFileSync(f, 'utf8').split('\n').length, 0);
console.log(`\n=== ORPHANED TOTAL: ${orphans.length} files, ${totalLines} lines ===`);
