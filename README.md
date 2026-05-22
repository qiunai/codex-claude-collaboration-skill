# Codex-Claude Collaboration Skill

`codex-claude-collaboration` is a portable skill for coordinating Codex and
Claude across research, OpenSpec exploration, implementation, review, rework,
and merge.

The skill is designed for teams that want Codex and Claude to work as two
reviewing agents instead of a one-way task runner. Codex can gather tool-backed
evidence first, Claude can challenge and deepen the analysis, then Codex can
implement while Claude reviews the result.

## What It Does

- Sends Codex research packets to Claude Desktop through Computer Use.
- Forces phase checks so exploration packets and implementation results cannot
  be mixed up.
- Carries workflow type:
  - `FULL_CODEX_FIRST`: Codex explored first and Claude keeps the origin Codex
    session id as provenance. Broker continuity can use `task --resume-last`
    only when the broker's most recent thread is known to be that origin
    session.
  - `CLAUDE_FIRST`: Claude started first and may create the first Codex task
    thread.
- Requires evidence labels in research packets:
  `[CONFIRMED]`, `[LIKELY]`, `[UNKNOWN]`, `[USER-OBSERVED]`.
- Uses a FIFO lock for Claude Desktop so concurrent agents do not type into the
  wrong conversation.
- Validates project context, branch `main`, worktree mode, session naming, and
  group placement for new Claude Desktop exploration sessions.
- Enforces Claude Desktop session policy for new exploration sessions:
  Bypass Permission, latest visible Opus model, and Extra High reasoning. If the
  UI is not already in that state, the workflow tells Codex to repair it before
  sending.
- Separates skill workflow version from product iteration version, so a V7 skill
  can manage product iterations such as `V1.12`, `V1.13`, and `V1.14`.

## Install

Clone the repository, then copy the skill folder into either or both skill
locations:

```bash
git clone https://github.com/<owner>/codex-claude-collaboration-skill.git
cd codex-claude-collaboration-skill

# Install for Codex
mkdir -p ~/.codex/skills
cp -R codex-claude-collaboration ~/.codex/skills/

# Install for Claude
mkdir -p ~/.claude/skills
cp -R codex-claude-collaboration ~/.claude/skills/
```

Restart Codex or Claude if the skill list is already loaded in the current
session.

## Requirements

- Codex with local skill support.
- Claude Desktop when using Desktop delivery.
- Node.js for bundled validation scripts.
- Git and `jq`.
- `codex-companion` available on `PATH` for Claude-to-Codex implementation
  dispatch, or set `CODEX_COMPANION` to the executable path.
- Broker continuity uses `codex-companion task --resume-last`. This repository
  does not require or document unsupported exact-thread resume commands.
- Optional but recommended: OpenSpec commands available in the target project.

No personal paths, local project names, tokens, or state files are required by
the repository. Runtime state is written locally under the installed skill's
`state/` directory and should not be committed.

## OpenSpec

This collaboration workflow assumes project changes are managed with OpenSpec.
Most deeper collaboration loops use OpenSpec artifacts as the shared contract
between Codex and Claude:

- `proposal.md` for intent and scope.
- `design.md` for technical approach.
- `tasks.md` for implementation phases and verification gates.
- `specs/*/spec.md` for requirements and scenarios.

Official OpenSpec links:

- Website: <https://openspec.dev/>
- GitHub repository: <https://github.com/Fission-AI/OpenSpec>
- Installation docs: <https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md>

Install with npm:

```bash
npm install -g @fission-ai/openspec@latest
```

Alternative install with Nix:

```bash
nix profile install github:Fission-AI/OpenSpec
```

After installation, initialize or use OpenSpec inside your project according to
the OpenSpec documentation and your coding agent's integration.

## Full Workflow

Use this when the user starts in Codex and wants Claude to audit Codex's
findings before implementation.

1. Codex investigates with local tools and writes:
   `.codex-claude-collaboration/codex-explore-summary.md`
2. Codex validates the packet:
   ```bash
   node ~/.codex/skills/codex-claude-collaboration/scripts/validate-claude-packet.mjs \
     .codex-claude-collaboration/codex-explore-summary.md
   ```
3. Codex resolves local project context:
   ```bash
   node ~/.codex/skills/codex-claude-collaboration/scripts/version-context.mjs \
     --current-version V1.12 \
     --next-version V1.13 \
     --version-file path/to/version-file \
     --changelog-path CHANGELOG.md

   node ~/.codex/skills/codex-claude-collaboration/scripts/project-context.mjs \
     --cwd "$(pwd)" \
     --version V1.13 \
     --summary "editor optimization" \
     --expected-project "$(basename "$(git rev-parse --show-toplevel)")"
   ```
4. Codex captures the current Codex session:
   ```bash
   node ~/.codex/skills/codex-claude-collaboration/scripts/codex-session-context.mjs \
     --session-id "$CURRENT_CODEX_SESSION_ID"
   ```
5. Codex sends a Claude Desktop prompt that starts with:
   ```text
   /openspec:explore 
   ```
   The space after `explore` is required.
   Before sending, the Claude Desktop session must be set to Bypass Permission,
   the newest visible Opus model, and Extra High reasoning.
6. Claude explores, creates or updates OpenSpec artifacts, and later sends the
   proposal back to Codex.
7. Because the packet used `workflow_type=FULL_CODEX_FIRST`, Claude keeps the
   origin Codex session id in state. It may use `codex-companion task
   --resume-last` only when the broker's last thread is verified as that origin
   session; otherwise it creates a fresh Codex implementation task.
   Implementation still runs from a worktree based on the pushed proposal
   branch, because the original Codex exploration worktree may have been
   created from `main` and may not contain Claude's proposal artifacts.
8. Codex implements, writes:
   `.codex-claude-collaboration/implementation-result.json`
9. Codex reports back through Claude Desktop with:
   ```text
   codex-claude DONE <collaboration_id> round <n>: <STATUS> — <PR_URL_OR_NONE>
   Summary: <short summary>
   ```
10. Claude reviews. If clean, Claude archives and merges. If not, Claude sends
    rework through broker continuity (`--resume-last` after verification) or a
    fresh task from the same implementation worktree. Structural implementation
    rounds are capped at three.

When the implementation changes the product iteration, the PR should update the
project version file and Changelog before merge. After merge, future sessions
read the new version from `main` and use the next version for the following
iteration.

## Partial Workflow

Use this when the user starts in Claude and already has enough context for a
proposal.

1. Claude explores and prepares OpenSpec proposal/design/tasks/specs.
2. Claude sets `workflow_type=CLAUDE_FIRST`.
3. Claude creates the first Codex task thread with `codex-companion`.
4. Codex implements and writes `implementation-result.json`.
5. Codex reports back through Claude Desktop.
6. Claude reviews, requests rework, or merges.

## Safety Rules

- Do not infer workflow type. The entry agent must set it.
- `FULL_CODEX_FIRST` requires `origin_codex_session_id`, but that id is a
  provenance marker and is not passed to `codex-companion` as an exact resume
  argument.
- `CLAUDE_FIRST` is only for cases with no prior Codex session.
- Do not use unsupported exact-thread broker resume or native direct resume
  commands in this workflow.
- Codex implementation must run in a worktree based on the pushed proposal
  branch. Do not assume a Codex-first exploration worktree created from `main`
  contains Claude's proposal files.
- If an agent reports that exact Codex thread resume is unsupported, treat that
  as expected. The supported broker continuity path is last-thread continuity
  (`task --resume-last`) after positive verification, or a fresh task from the
  same proposal implementation worktree.
- Run `phase-guard.mjs` before any Computer Use send.
- Do not touch Claude Desktop unless the FIFO lock is acquired.
- For new Claude Desktop exploration sessions, inspect and repair:
  - Local project selected.
  - Project name matches the current repository.
  - Branch is `main`.
  - Worktree is enabled.
  - Permission mode is `Bypass Permission`.
  - Model is the newest visible Opus option.
  - Reasoning level is `Extra High`.
  - Prompt starts with `/openspec:explore `.
  - Session is renamed with a product version prefix such as
    `V1.13 editor optimization`.
  - Session is moved into the correct project group.

## Repository Layout

```text
codex-claude-collaboration/
  SKILL.md
  OPERATIONS.md
  BASELINE.md
  review-checklist.md
  scripts/
  state/README.md
  templates/
```

## Development Purpose

This skill exists to make cross-model collaboration precise, auditable, and
repeatable:

- Codex contributes tool access, implementation, browser/desktop automation, and
  evidence collection.
- Claude contributes deep review, OpenSpec exploration, proposal quality, and
  merge judgment.
- Both agents preserve provenance instead of turning assumptions into facts.

The goal is not to make one model blindly trust the other. The goal is to move
evidence, uncertainty, and decisions through a controlled loop where each side
can challenge the other.
