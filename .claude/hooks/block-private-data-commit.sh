#!/usr/bin/env bash
# PreToolUse hook on Bash — blocks `git add` of the private files.
# Rationale: CLAUDE.md, section Git ("Do not commit the database file, the
# `data/` directory or a `.env` file"). `.gitignore` gives the first defence,
# but `git add --force` goes around it, and a new file type can arrive before
# someone adds the pattern. This hook gives the second defence.
#
# A commit of the database publishes the balances of the user, and a commit of
# `.env` publishes the secret of Better Auth. Git keeps both in the history
# after a later delete.

set -euo pipefail

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null) || cmd=""

# Collapse repeated whitespace so the regex sees the actual git command.
normalized=$(printf '%s' "$cmd" | tr -s ' ')

# Match an `add` subcommand. The optional group admits the global options
# between `git` and the subcommand (`-C <dir>`, `-c k=v`, `--git-dir=…`).
GIT_ADD='git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+add([[:space:]]|$)'

# Is this token a path that the repository must never contain?
is_forbidden_path() {
  local token="$1"
  # Remove the quotes that stay after the word split, then a leading `./`.
  token=${token#\'}
  token=${token%\'}
  token=${token#\"}
  token=${token%\"}
  token=${token#./}

  # `.env.example` is the one file of this family under version control.
  case "$token" in
  .env.example | */.env.example) return 1 ;;
  esac

  case "$token" in
  data | data/* | */data | */data/*) return 0 ;;
  *.db | *.db-wal | *.db-shm | *.sqlite | *.sqlite3) return 0 ;;
  .env | .env.* | */.env | */.env.*) return 0 ;;
  esac

  return 1
}

reason=""
offender=""

# Examine each command of the line on its own. A path in a neighbour command —
# a commit message, a later `rm` — must not start this hook.
while IFS= read -r segment; do
  [ -n "$segment" ] || continue
  printf '%s' "$segment" | grep -qE "$GIT_ADD" || continue

  # `set -f` stops the shell from expanding a pattern such as `*.db` against
  # the files of the working directory during the word split.
  set -f
  # shellcheck disable=SC2086
  set -- $segment
  set +f

  for token in "$@"; do
    case "$token" in
    --force | --force=*)
      reason="force"
      offender="$token"
      break
      ;;
    --*) ;;
    -*f*)
      reason="force"
      offender="$token"
      break
      ;;
    esac
    if is_forbidden_path "$token"; then
      reason="path"
      offender="$token"
      break
    fi
  done

  [ -n "$reason" ] && break
done <<EOF
$(printf '%s' "$normalized" | sed 's/&&/\n/g; s/||/\n/g; s/;/\n/g; s/|/\n/g')
EOF

if [ -n "$reason" ]; then
  echo "Blocked by .claude/hooks/block-private-data-commit.sh:" >&2
  if [ "$reason" = "force" ]; then
    echo "  \`git add\` with $offender goes around .gitignore (CLAUDE.md, section Git)." >&2
    echo "  Name each file that you want to add, and do not use the force option." >&2
  else
    echo "  \`$offender\` is a private file (CLAUDE.md, section Git)." >&2
    echo "  The database file, the data/ directory and a .env file stay out of git." >&2
    echo "  For a new variable, add the name to .env.example with no value." >&2
  fi
  exit 2
fi

exit 0
