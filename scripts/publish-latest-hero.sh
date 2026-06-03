#!/usr/bin/env bash
# Usage: publish-latest-hero.sh
# Reads the most recent hero-YYYYMMDD-*.{png,jpg} from the image-gen media dir,
# parses the matching roster entry, then appends + publishes.
# This collapses steps 3+4 of the cron into one idempotent call so the agent
# can't bail between image_generate and publish.
set -euo pipefail
cd "$(dirname "$0")/.."

MEDIA_DIR="/Users/saberzou/.openclaw/media/tool-image-generation"
TODAY=$(date +%Y%m%d)

# Find the newest hero image from today. Fall back to newest overall if today's missing.
IMG=$(ls -t "$MEDIA_DIR"/hero-"$TODAY"-*.{png,jpg} 2>/dev/null | head -1 || true)
if [ -z "$IMG" ]; then
  IMG=$(ls -t "$MEDIA_DIR"/hero-2*-*.{png,jpg} 2>/dev/null | head -1 || true)
fi
if [ -z "$IMG" ] || [ ! -f "$IMG" ]; then
  echo "ERROR: no hero image found in $MEDIA_DIR" >&2
  exit 1
fi

# Pick the next hero from the roster (this is the same one image_generate was called for,
# as long as nothing was appended to data.js between gen and publish).
META=$(node scripts/pick-next-hero.js)
TITLE=$(node -e "console.log(JSON.parse(process.argv[1]).title)" "$META")
UNIVERSE=$(node -e "console.log(JSON.parse(process.argv[1]).universe)" "$META")

if [ -z "$TITLE" ] || [ -z "$UNIVERSE" ]; then
  echo "ERROR: could not parse roster entry: $META" >&2
  exit 1
fi

echo "Publishing: $TITLE ($UNIVERSE) from $IMG"
bash scripts/append-and-publish.sh "$IMG" "$TITLE" "$UNIVERSE" 32 6
