#!/usr/bin/env node
// Back-compat shim: delegates to pick-next.js with category "heroes".
// Kept so existing crons / scripts referencing pick-next-hero.js keep working.
require('child_process');
const { execFileSync } = require('child_process');
const path = require('path');
try {
  const out = execFileSync('node', [path.join(__dirname, 'pick-next.js'), 'heroes'], { encoding: 'utf8' });
  process.stdout.write(out);
} catch (e) {
  if (e.stderr) process.stderr.write(e.stderr);
  process.exit(e.status || 1);
}
