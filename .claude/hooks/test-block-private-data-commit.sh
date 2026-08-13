#!/usr/bin/env bash
# Tests for .claude/hooks/block-private-data-commit.sh
#
# The tests give the hook a synthetic Bash tool call. Then they compare the exit
# code (2 = block, 0 = pass). Run the tests from the root of the repository:
#   ./.claude/hooks/test-block-private-data-commit.sh
#
# The PASS cases hold the value of the hook: a hook that blocks a normal
# `git add` becomes an obstacle, and then someone makes it inactive.

set -uo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
HOOK="$SCRIPT_DIR/block-private-data-commit.sh"

if [ ! -x "$HOOK" ]; then
  echo "FAIL: the hook is not executable: $HOOK" >&2
  exit 1
fi

failures=0
rc=0

run_hook() {
  local cmd="$1"
  local payload
  payload=$(printf '%s' "$cmd" | python3 -c '
import json, sys
print(json.dumps({"tool_input": {"command": sys.stdin.read()}}))')
  printf '%s' "$payload" | bash "$HOOK" >/dev/null 2>&1
  rc=$?
}

assert_block() {
  run_hook "$1"
  if [ "$rc" -ne 2 ]; then
    echo "FAIL: expected BLOCK (exit 2), but got exit $rc for: $1" >&2
    failures=$((failures + 1))
  fi
}

assert_pass() {
  run_hook "$1"
  if [ "$rc" -ne 0 ]; then
    echo "FAIL: expected PASS (exit 0), but got exit $rc for: $1" >&2
    failures=$((failures + 1))
  fi
}

# --- PASS: the normal work. `git add -A` and `git add .` stay free, because
# .gitignore holds the private patterns. ---
assert_pass "git add -A"
assert_pass "git add ."
assert_pass "git add docs/architecture.md"
assert_pass "git add src/shared/convert.ts src/shared/convert.test.ts"
assert_pass "git add drizzle/0000_initial.sql"
assert_pass "git add .env.example"
assert_pass "git add -A && git commit -m 'feat: add the data/ mount to compose.yml'"
assert_pass "git add -p src/server/db/schema.ts"
assert_pass "git status"
assert_pass "npm run test"
assert_pass "git add -u"
assert_pass "rm -rf data/ && git add -A"
assert_pass "git add metadata/notes.md"
assert_pass "git add src/client/components/board/FlapBadge.tsx"

# --- BLOCK: a named private path ---
assert_block "git add data/yume.db"
assert_block "git add data/"
assert_block "git add data"
assert_block "git add ./data/backup/yume-2026-08-11.db"
assert_block "git add yume.sqlite"
assert_block "git add data/yume.db-wal"
assert_block "git add .env"
assert_block "git add .env.local"
assert_block "git add docs/architecture.md .env"
assert_block "git add 'data/yume.db'"
assert_block "git -C . add data/yume.db"

# --- BLOCK: the force option goes around .gitignore ---
assert_block "git add -f data/yume.db"
assert_block "git add --force src/shared/convert.ts"
assert_block "git add -Af"

if [ "$failures" -gt 0 ]; then
  echo "$failures test(s) failed." >&2
  exit 1
fi

echo "All the tests of block-private-data-commit passed."
