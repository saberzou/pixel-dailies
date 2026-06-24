#!/usr/bin/env bash
# Usage: append-and-publish.sh <source-image-path> <title> <universe> [size=32] [palette=6] [category=heroes]
# Converts the source image to a pixel-art entry, appends to data.js, commits, pushes.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="$1"
TITLE="$2"
UNIVERSE="$3"
SIZE="${4:-32}"
PALETTE="${5:-6}"
CATEGORY="${6:-heroes}"

if [ ! -f "$SRC" ]; then
  echo "ERROR: source image not found: $SRC" >&2
  exit 1
fi

ENTRY=$(node scripts/png-to-pixel.js "$SRC" "$TITLE" "$UNIVERSE" "$SIZE" "$PALETTE" "$CATEGORY")

CATEGORY="$CATEGORY" node -e "
const fs = require('fs');
const src = fs.readFileSync('data.js','utf8');
const arr = JSON.parse(src.replace(/^const gallery = /,'').replace(/;\s*\$/,''));
const entry = $ENTRY;
const cat = process.env.CATEGORY;
// Guard against dupes (same title within the same category)
if (arr.some(p => p.category === cat && p.title === entry.title)) {
  console.error('Already present, skipping append:', entry.title);
  process.exit(2);
}
arr.push(entry);
fs.writeFileSync('data.js', 'const gallery = ' + JSON.stringify(arr, null, 2) + ';\n');
console.log('appended', entry.title);
"

bash /Users/saberzou/.openclaw/workspace/scripts/validate-js.sh data.js

git add data.js
git commit -m "${CATEGORY}: add ${TITLE}"
git push
echo "OK: published ${TITLE}"
