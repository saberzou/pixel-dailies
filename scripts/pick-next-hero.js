#!/usr/bin/env node
// Pick the next hero from the roster, skipping any whose title is already in data.js.
// Prints JSON: { title, universe, prompt } to stdout. Exits 1 if roster exhausted.
const fs = require('fs');
const path = require('path');
const dir = path.dirname(__dirname);
const roster = JSON.parse(fs.readFileSync(path.join(dir, 'scripts/heroes-roster.json'), 'utf8'));
const src = fs.readFileSync(path.join(dir, 'data.js'), 'utf8');
const arr = JSON.parse(src.replace(/^const gallery = /, '').replace(/;\s*$/, ''));
const usedTitles = new Set(arr.filter(p => p.category === 'heroes').map(p => p.title));
const next = roster.find(h => !usedTitles.has(h.title));
if (!next) {
  console.error('Roster exhausted');
  process.exit(1);
}
process.stdout.write(JSON.stringify(next));
