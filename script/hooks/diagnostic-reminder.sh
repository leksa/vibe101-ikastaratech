#!/usr/bin/env bash
# PostToolUse hook: reminds the agent to run the diagnostic gate after
# editing application code (backend .js / frontend .vue|.js).
#
# Claude Code pipes the tool payload as JSON on stdin. We pull the edited
# file path and only fire for source files under backend/ or frontend/.
# Output on stdout is surfaced back to the agent as context.

payload="$(cat)"

# Extract file_path without requiring jq.
file="$(printf '%s' "$payload" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

case "$file" in
  *backend/*.js|*frontend/*.js|*frontend/*.vue)
    cat <<'EOF'
DIAGNOSTIC GATE — sebelum lanjut / sebelum tes browser:
  1. LSP diagnostics pada file yang baru diubah (perbaiki error/warning nyata).
  2. Unit test backend:  (cd backend && node --test)
  3. Baru jalankan tes browser / Playwright.
Lihat CLAUDE.md > "Diagnostic Gate".
EOF
    ;;
esac
exit 0
