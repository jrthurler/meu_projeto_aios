
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(npm run lint*)",
      "Bash(npm run typecheck*)",
      "Bash(npm run test*)",
      "Bash(npm run build*)",
      "Bash(npm install*)",
      "Bash(npm ci*)",
      "Bash(npm ls *)",
      "Bash(git status*)",
      "Bash(git log*)",
      "Bash(git diff*)",
      "Bash(git branch*)",
      "Bash(git stash*)",
      "Bash(git fetch*)",
      "Bash(git checkout*)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(gh pr *)",
      "Bash(gh issue *)",
      "Bash(gh repo view*)",
      "Bash(gh auth status*)",
      "Bash(gh api *)",
      "Bash(ls *)",
      "Bash(mkdir *)",
      "Bash(node scripts/*)",
      "Bash(node -e *)",
      "Bash(echo *)",
      "Bash(cat *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(test *)",
      "Bash(which *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force*)",
      "Bash(git push -f *)",
      "Bash(*--no-verify*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -f*)",
      "Bash(git checkout -- .)",
      "Bash(git restore .)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./private/**)"
    ]
  },
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CLAUDE_CONTEXT_COLLAPSE": "1"
  },
  "promptSuggestionEnabled": false,
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Grep|Glob|Bash|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "REPO=$(git rev-parse --show-toplevel 2>/dev/null) && node \"$REPO/packages/core/memory/hints-injector.cjs\" || true"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "REPO=$(git rev-parse --show-toplevel 2>/dev/null) && bash \"$REPO/.claude/hooks/post-edit-lint.sh\" || true"
          }
        ]
      }
    ]
  }
}