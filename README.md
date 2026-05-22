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
  - `FULL_CODEX_FIRST`: Codex explored first and Claude later resumes the exact
    origin Codex thread with `task --resume-thread <thread-id>`.
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
- Separates skill workflow version from product iteration version, so a V8 skill
  can manage product iterations such as `V1.12`, `V1.13`, and `V1.14`.

## Install Order

Install in this order:

1. Install the Codex plugin for Claude Code, then apply/verify this repository's
   exact-thread patch.
2. Install OpenSpec.
3. Install `codex-claude-collaboration` for Codex and Claude.

The order matters because Claude needs the Codex plugin before it can dispatch
implementation work to Codex, and this skill requires the plugin command
`codex-companion task --resume-thread <thread-id>` for safe concurrent routing.

## 1. Install The Codex Plugin

In Claude Code, install the OpenAI Codex plugin:

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

Until the upstream thread-resume PR is included in the published plugin, apply
the bundled runtime patch from this repository:

```bash
git clone https://github.com/qiunai/codex-claude-collaboration-skill.git
cd codex-claude-collaboration-skill

node codex-claude-collaboration/scripts/install-codex-plugin-cc-resume-thread.mjs
```

Then verify the broker that Claude will call:

```bash
CODEX_COMPANION="${CODEX_COMPANION:-$HOME/.claude/plugins/marketplaces/openai-codex/plugins/codex/scripts/codex-companion.mjs}"
node codex-claude-collaboration/scripts/verify-codex-companion.mjs \
  --command "$CODEX_COMPANION"
```

Expected result: JSON with `"supports_resume_thread": true`.

The plugin patch is stored at:

```text
codex-claude-collaboration/plugins/codex-plugin-cc/
```

Upstream PR:

<https://github.com/openai/codex-plugin-cc/pull/344>

## 2. Install OpenSpec

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

## 3. Install The Collaboration Skill

Clone the repository, then copy the skill folder into either or both skill
locations:

```bash
git clone https://github.com/qiunai/codex-claude-collaboration-skill.git
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

## One-Paste Bootstrap

This installs the repository, patches/verifies the Codex plugin if it is already
installed, installs OpenSpec with npm, and copies the skill into both agent
skill directories:

```bash
git clone https://github.com/qiunai/codex-claude-collaboration-skill.git
cd codex-claude-collaboration-skill

node codex-claude-collaboration/scripts/install-codex-plugin-cc-resume-thread.mjs
npm install -g @fission-ai/openspec@latest
node codex-claude-collaboration/scripts/migrate-runtime-state.mjs

mkdir -p ~/.codex/skills ~/.claude/skills
rm -rf ~/.codex/skills/codex-claude-collaboration
rm -rf ~/.claude/skills/codex-claude-collaboration
cp -R codex-claude-collaboration ~/.codex/skills/
cp -R codex-claude-collaboration ~/.claude/skills/

CODEX_COMPANION="${CODEX_COMPANION:-$HOME/.claude/plugins/marketplaces/openai-codex/plugins/codex/scripts/codex-companion.mjs}"
node codex-claude-collaboration/scripts/verify-codex-companion.mjs \
  --command "$CODEX_COMPANION"
```

If the plugin patch step says no installed plugin root was found, first run the
Claude Code plugin commands from step 1, then rerun the patch command.

## Requirements

- Codex with local skill support.
- Claude Desktop when using Desktop delivery.
- Node.js for bundled validation scripts.
- Git and `jq`.
- OpenSpec for proposal/spec-driven collaboration.
- `codex-companion` available on `PATH` for Claude-to-Codex implementation
  dispatch, or set `CODEX_COMPANION` to the executable path. Install the Codex
  plugin first and ensure the broker advertises
  `task --resume-thread <thread-id>`.
- Exact broker continuity uses `codex-companion task --resume-thread <thread-id>`.
  Do not use `--resume-last` for automated collaboration routing when multiple
  Claude/Codex tasks may be active.
- Verify the actual executable before dispatch:
  `node ~/.claude/skills/codex-claude-collaboration/scripts/verify-codex-companion.mjs --command "$CODEX_COMPANION"`.
  If `CODEX_COMPANION` points at a `.mjs` plugin script, the workflow invokes it
  through `node`.

No personal paths, local project names, tokens, or state files are required by
the repository. Runtime state is written locally outside the installed skill
tree, by default under `~/.claude/codex-claude-collaboration/state/`, and
should not be committed.

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
4. Codex captures the current Codex thread:
   ```bash
   node ~/.codex/skills/codex-claude-collaboration/scripts/codex-session-context.mjs \
     --thread-id "$CODEX_THREAD_ID"
   ```
   Use the Codex thread id as the resume target. Some UI output may call this
   value a "Codex session ID", but the broker parameter is `thread-id`.
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
   origin Codex thread id in state and resumes it with `codex-companion task
   --resume-thread <thread-id>`.
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
10. Claude reviews. If clean, Claude archives, comments on the PR, merges, and
    deletes the remote feature branch without waiting for another user approval.
    Local branches/worktrees are kept by default. If not, Claude sends rework to
    the stored Codex thread with `--resume-thread`. Structural
    Blocking/Harmful/High implementation rounds are capped at three; minor
    cleanup and merge conflicts continue until clean.

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
- `FULL_CODEX_FIRST` requires `origin_codex_thread_id`.
- `CLAUDE_FIRST` is only for cases with no prior Codex thread.
- Use `codex-companion task --resume-thread <thread-id>` for Codex re-entry.
- Treat `--resume-last` as unsafe for automated routing: it means "latest
  resumable task in the current context", not "the task that belongs to this
  Claude conversation".
- Codex implementation must run in a worktree based on the pushed proposal
  branch. Do not assume a Codex-first exploration worktree created from `main`
  contains Claude's proposal files.
- Runtime collaboration state must be created before Codex starts and should
  live under `~/.claude/codex-claude-collaboration/state/`, not inside the
  installed skill directory.
- When upgrading from an older version, run
  `node codex-claude-collaboration/scripts/migrate-runtime-state.mjs` before
  deleting or replacing installed skill directories.
- If exact resume is unavailable in an older broker, stop and upgrade/patch the
  broker instead of falling back to `--resume-last` in a concurrent workflow.
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
