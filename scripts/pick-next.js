#!/usr/bin/env node
// Pick the next entry from a category's roster, skipping any whose title is
// already in data.js for that category.
// Usage: node pick-next.js <category>   (default: heroes)
// Roster file resolved as scripts/<category>-roster.json (heroes -> heroes-roster.json).
// Prints JSON: { title, universe, prompt } to stdout. Exits 1 if roster exhausted.
const fs = require('fs');
const path = require('path');

const category = (process.argv[2] || 'heroes').toLowerCase();
const dir = path.dirname(__dirname);

const rosterPath = path.join(dir, 'scripts', `${category}-roster.json`);
if (!fs.existsSync(rosterPath)) {
  console.error(`No roster file for category "${category}" (expected ${rosterPath})`);
  process.exit(2);
}

const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
const src = fs.readFileSync(path.join(dir, 'data.js'), 'utf8');
const arr = JSON.parse(src.replace(/^const gallery = /, '').replace(/;\s*$/, ''));
const usedTitles = new Set(arr.filter(p => p.category === category).map(p => p.title));
const next = roster.find(h => !usedTitles.has(h.title));
if (!next) {
  console.error('Roster exhausted');
  process.exit(1);
}
process.stdout.write(JSON.stringify({ ...next, category }));
