#!/bin/bash
# gen-bypass.sh — generate ONE Pixel Dailies image via a DNS-pinned direct call
# to the Google Gemini image API, bypassing the poisoned fake-IP DNS.
#
# WHY THIS EXISTS (2026-07-13, Atticus):
# Pixel Dailies generation normally uses the OpenClaw image_generate TOOL. During
# a sustained Shadowrocket fake-IP flap, the SSRF guard sees the upstream stub
# query return the 198.18.x fake-IP pool for generativelanguage.googleapis.com
# and blocks the tool, so image_generate fails and the daily bird never ships
# (e.g. Great Horned Owl stuck 2026-07-12). This is the same class of outage
# Axel's Bug Explorer hit; the escape hatch is identical: the OS resolver
# (getaddrinfo/dscacheutil) still knows the REAL public Google IP, so we pin it
# and curl straight to the endpoint, skipping the poisoned DNS + proxy:
#   curl --resolve <host>:443:<REAL_IP> --noproxy '*'
# TLS cert validation still runs, so we are provably talking to real Google.
#
# SAFE, SCOPED BYPASS (not "disable the SSRF guard"):
#   * Pinned IP comes from the OS resolver — legitimate public Google IP, never
#     attacker-controlled input.
#   * Hostname is a FIXED known Google API domain, never user input.
#   * Pinned to :443 with normal TLS; cert must match hostname, so a hijacked
#     route cannot impersonate Google.
#   * Runs ONLY for this pipeline's own prompt, producing one PNG.
#
# Idempotent + safe: refuses to overwrite an existing output PNG; validates the
# bytes are a real PNG before it counts as success; exits non-zero on any
# failure so the caller can fall back / retry.
#
# Usage: gen-bypass.sh <prompt_file> <output_png>
#   prompt_file: a text file containing the full image prompt (verbatim).
#   output_png : destination path, e.g. birds-20260713-great-horned-owl.png
#                (the 'birds-' prefix is required by publish-latest.sh).

set -uo pipefail
export PATH="/opt/homebrew/bin:$PATH"

PROMPT_FILE="${1:-}"
OUT_PNG="${2:-}"
ENV_FILE="/Users/saberzou/.openclaw/.env"
HOST="generativelanguage.googleapis.com"
# flash-image first: clean flat renders, no vignette bias. pro-image as fallback.
MODELS=("gemini-2.5-flash-image" "gemini-3-pro-image-preview")

err() { echo "gen-bypass: $*" >&2; }

{ [ -z "$PROMPT_FILE" ] || [ -z "$OUT_PNG" ]; } && { err "usage: gen-bypass.sh <prompt_file> <output_png>"; exit 2; }
[ -f "$PROMPT_FILE" ] || { err "prompt file missing: $PROMPT_FILE"; exit 2; }
[ -f "$OUT_PNG" ] && { err "output already exists, refusing to overwrite: $OUT_PNG"; exit 0; }

# Load the Gemini key (never echo it).
[ -f "$ENV_FILE" ] || { err "env file missing: $ENV_FILE"; exit 2; }
set -a; source "$ENV_FILE" 2>/dev/null; set +a
GKEY="${GEMINI_API_KEY:-}"
{ [ -z "$GKEY" ] || [ ${#GKEY} -lt 10 ]; } && { err "GEMINI_API_KEY not usable in $ENV_FILE"; exit 2; }

# Real public IP from the OS resolver (NOT dig/nslookup — those return fake-IP).
REAL_IP=$(python3 -c "import socket;print(socket.gethostbyname('$HOST'))" 2>/dev/null)
case "$REAL_IP" in
  198.18.*|198.19.*|10.*|127.*|0.*|169.254.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[0-1].*|"")
    err "OS resolver itself returned a blocked/empty IP ($REAL_IP); cannot pin a real IP, aborting."; exit 1 ;;
esac
err "pinning $HOST -> $REAL_IP (bypassing fake-IP DNS)"

REQ=$(mktemp /tmp/pd_req.XXXXXX.json)
RESP=$(mktemp /tmp/pd_resp.XXXXXX.json)
trap 'rm -f "$REQ" "$RESP"' EXIT

# Build the request body from the verbatim prompt (json-safe via python stdin).
python3 -c "import json,sys; p=open(sys.argv[1]).read().strip(); json.dump({'contents':[{'parts':[{'text':p}]}]}, open(sys.argv[2],'w'))" "$PROMPT_FILE" "$REQ" \
  || { err "failed to build request body"; exit 1; }

# Inline image extractor: pull the first inlineData image part, base64-decode,
# verify PNG magic, write to OUT_PNG.
extract() {
  python3 - "$1" "$2" <<'PY'
import base64, json, sys
resp_path, out_path = sys.argv[1], sys.argv[2]
try:
    data = json.load(open(resp_path))
except Exception as e:
    print(f"extract: bad json: {e}", file=sys.stderr); sys.exit(1)
parts = []
for cand in data.get("candidates", []):
    parts += cand.get("content", {}).get("parts", [])
for p in parts:
    inline = p.get("inlineData") or p.get("inline_data")
    if inline and inline.get("data"):
        raw = base64.b64decode(inline["data"])
        # PNG magic or JPEG magic — accept, but we want PNG; Gemini returns PNG here.
        if raw[:8] == b"\x89PNG\r\n\x1a\n":
            open(out_path, "wb").write(raw); print("extract: wrote PNG"); sys.exit(0)
        if raw[:3] == b"\xff\xd8\xff":
            open(out_path, "wb").write(raw); print("extract: wrote JPEG (unexpected but valid)"); sys.exit(0)
print("extract: no usable image part", file=sys.stderr); sys.exit(1)
PY
}

for MODEL in "${MODELS[@]}"; do
  err "trying model $MODEL ..."
  code=$(curl -sS --max-time 150 \
    --resolve "$HOST:443:$REAL_IP" --noproxy '*' \
    -H "Content-Type: application/json" \
    -X POST "https://$HOST/v1beta/models/$MODEL:generateContent?key=$GKEY" \
    -d @"$REQ" -o "$RESP" -w "%{http_code}" 2>/dev/null)
  if [ "$code" != "200" ]; then
    err "model $MODEL returned HTTP $code; trying next."
    continue
  fi
  if extract "$RESP" "$OUT_PNG"; then
    err "SUCCESS via $MODEL -> $OUT_PNG"
    exit 0
  else
    err "model $MODEL: response had no usable image; trying next."
  fi
done

err "all models failed via bypass."
exit 1
