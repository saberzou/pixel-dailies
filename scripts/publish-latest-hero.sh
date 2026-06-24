#!/usr/bin/env bash
# Back-compat shim: delegates to publish-latest.sh heroes.
set -euo pipefail
exec bash "$(dirname "$0")/publish-latest.sh" heroes
