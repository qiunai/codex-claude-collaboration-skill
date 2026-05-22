# Baseline

V7 defines Codex-Claude Collaboration as a two-way cooperation workflow:

- `CODEX_EXPLORE`: Codex gathers reviewable evidence with tools/plugins.
- `SEND_TO_CLAUDE`: Codex sends a labeled evidence packet through Claude Desktop.
- `CLAUDE_EXPLORE`: Claude audits, expands, and proposes via OpenSpec.
- `CODEX_IMPLEMENT`: Codex executes the accepted OpenSpec change.
- `REVIEW` / `REWORK`: Claude reviews and loops back through broker continuity
  or the same implementation worktree.

Active skill path:

`~/.claude/skills/codex-claude-collaboration/`

Deprecated transport paths using Claude CLI resume/print modes are intentionally
not part of this baseline. All Codex -> Claude messages go through Claude
Desktop Computer Use with exact session targeting and FIFO Desktop locking.

Historical pre-V7 state was moved outside the active skill tree:

`~/.claude/skills-disabled/codex-claude-collaboration-legacy-state/`
