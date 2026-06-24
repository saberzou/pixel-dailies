#!/usr/bin/env bash
# Usage: publish-latest.sh <category>   (default: heroes)
# Reads the most recent <category>-YYYYMMDD-*.{png,jpg} from the image-gen media dir,
# parses the matching roster entry for that category, then appends + publishes.
# Collapses the gen->publish steps into one idempotent call so the agent can't
# bail between image_generate and publish.
set -euo pipefail
cd "$(dirname "$0")/.."

CATEGORY="${1:-heroes}"
MEDIA_DIR="/Users/saberzou/.openclaw/media/tool-image-generation"
TODAY=$(date +%Y%m%d)

# Find the newest image for this category from today. Fall back to newest overall.
IMG=$(ls -t "$MEDIA_DIR"/"$CATEGORY"-"$TODAY"-*.{png,jpg} 2>/dev/null | head -1 || true)
if [ -z "$IMG" ]; then
  IMG=$(ls -t "$MEDIA_DIR"/"$CATEGORY"-2*-*.{png,jpg} 2>/dev/null | head -1 || true)
fi
if [ -z "$IMG" ] || [ ! -f "$IMG" ]; then
  echo "ERROR: no $CATEGORY image found in $MEDIA_DIR" >&2
  exit 1
fi

# Pick the next entry from this category's roster (same one image_generate was called
# for, as long as nothing was appended to data.js between gen and publish).
META=$(node scripts/pick-next.js "$CATEGORY")
TITLE=$(node -e "console.log(JSON.parse(process.argv[1]).title)" "$META")
UNIVERSE=$(node -e "console.log(JSON.parse(process.argv[1]).universe)" "$META")

if [ -z "$TITLE" ] || [ -z "$UNIVERSE" ]; then
  echo "ERROR: could not parse roster entry: $META" >&2
  exit 1
fi

echo "Publishing: $TITLE ($UNIVERSE) [$CATEGORY] from $IMG"
bash scripts/append-and-publish.sh "$IMG" "$TITLE" "$UNIVERSE" 32 6 "$CATEGORY"
