# OPERATIONS.md — Codex-Claude Collaboration V7

V7 has two primary transfer directions:

- `SEND_TO_CLAUDE`: Codex research -> Claude OpenSpec Explore.
- `CODEX_IMPLEMENT`: Claude OpenSpec proposal -> Codex implementation/PR.

Both Codex -> Claude directions use Claude Desktop Computer Use with session
verification and the FIFO Desktop lock.

Workflow type ownership:

- Codex owns `FULL_CODEX_FIRST`. It sets this when Codex initiated exploration,
  writes `workflow_type=FULL_CODEX_FIRST` and `origin_codex_session_id` into the
  state file, and includes both fields in the prompt sent to Claude.
- Claude owns `CLAUDE_FIRST`. It sets this only when the user started in Claude
  and there is no prior Codex session id.
- Claude must never downgrade `FULL_CODEX_FIRST` to `CLAUDE_FIRST`. If the
  prompt says `FULL_CODEX_FIRST` but no origin Codex session id is available,
  stop instead of creating a new Codex thread.
- `origin_codex_session_id` identifies the originating Codex conversation for
  audit, and `origin_codex_thread_id` is the broker resume target.
- Use `codex-companion task --resume-thread <thread-id>` for automated
  collaboration routing. Do not use `--resume-last`; it searches for the latest
  resumable task thread in the current context and can select the wrong thread
  when multiple Claude sessions run concurrently.

## 1. Codex Explore -> Claude Review Packet

### 1.1 Codex Research Packet

When the user asks Codex to investigate before Claude, Codex should gather
reviewable material and write:

`.codex-claude-collaboration/codex-explore-summary.md`

Required structure:

```markdown
# Codex Explore Summary

## User Problem
- [USER-OBSERVED] ...

## Confirmed Evidence
- [CONFIRMED] ... Evidence: `path` / command / screenshot / log

## Likely Interpretations
- [LIKELY] ... Why: ...

## Unknowns For Claude
- [UNKNOWN] ...

## Suggested Claude Explore Questions
1. ...

## Candidate Scope
- Must fix:
- Optional:
- Out of scope:
```

Validate shape:

```bash
node ~/.claude/skills/codex-claude-collaboration/scripts/validate-claude-packet.mjs \
  .codex-claude-collaboration/codex-explore-summary.md
```

The packet should help Claude challenge Codex. Avoid persuasive certainty.

### 1.2 Send To Claude

Resolve release metadata first. If `NEXT_VERSION` is omitted, the script
increments the last numeric segment of `CURRENT_VERSION` (for example `V1.12`
-> `V1.13`).

```bash
VERSION_CONTEXT=$(node "$SKILL_DIR/scripts/version-context.mjs" \
  --current-version "$CURRENT_VERSION" \
  ${NEXT_VERSION:+--next-version "$NEXT_VERSION"} \
  ${VERSION_FILE:+--version-file "$VERSION_FILE"} \
  ${CHANGELOG_PATH:+--changelog-path "$CHANGELOG_PATH"})

PREVIOUS_VERSION=$(echo "$VERSION_CONTEXT" | jq -r '.previous_version')
ITERATION_VERSION=$(echo "$VERSION_CONTEXT" | jq -r '.iteration_version')
VERSION_FILE=$(echo "$VERSION_CONTEXT" | jq -r '.version_file')
CHANGELOG_PATH=$(echo "$VERSION_CONTEXT" | jq -r '.changelog_path')
```

Resolve the local project context after the iteration version is known:

```bash
PROJECT_NAME="${PROJECT_NAME:-$(basename "$(git rev-parse --show-toplevel)")}"
PROJECT_GROUP="${PROJECT_GROUP:-$PROJECT_NAME}"
SESSION_SUMMARY="${SESSION_SUMMARY:?set a short session summary}"

PROJECT_CONTEXT=$(node "$SKILL_DIR/scripts/project-context.mjs" \
  --cwd "$(pwd)" \
  --version "$ITERATION_VERSION" \
  --summary "$SESSION_SUMMARY" \
  --expected-project "$PROJECT_NAME" \
  --group "$PROJECT_GROUP")

GIT_PROJECT_PATH=$(echo "$PROJECT_CONTEXT" | jq -r '.git_project_path')
PROJECT_NAME=$(echo "$PROJECT_CONTEXT" | jq -r '.required_claude_project_name')
DESKTOP_SESSION_TITLE=$(echo "$PROJECT_CONTEXT" | jq -r '.desktop_session_title')
DESKTOP_GROUP_NAME=$(echo "$PROJECT_CONTEXT" | jq -r '.desktop_group_name')
```

Resolve the current Codex session. In a `FULL_CODEX_FIRST` workflow this value
is mandatory; if the runtime cannot provide it, stop and ask the user for the
current Codex session id instead of sending to Claude.

```bash
CODEX_SESSION_CONTEXT=$(node "$SKILL_DIR/scripts/codex-session-context.mjs" \
  --session-id "$CURRENT_CODEX_SESSION_ID")

ORIGIN_CODEX_SESSION_ID=$(echo "$CODEX_SESSION_CONTEXT" | jq -r '.origin_codex_session_id')
ORIGIN_CODEX_THREAD_ID=$(echo "$CODEX_SESSION_CONTEXT" | jq -r '.origin_codex_thread_id')
WORKFLOW_TYPE=$(echo "$CODEX_SESSION_CONTEXT" | jq -r '.workflow_type')
CODEX_RESUME_REQUIRED=$(echo "$CODEX_SESSION_CONTEXT" | jq -r '.codex_resume_required')
```

Render `templates/claude-review-packet.md` with:

- `COLLABORATION_ID`
- `CLAUDE_SESSION_ID`
- `CLAUDE_SESSION_JSONL_PATH`
- `CLAUDE_SESSION_TITLE`
- `WORKFLOW_TYPE`
- `ORIGIN_CODEX_SESSION_ID`
- `ORIGIN_CODEX_THREAD_ID`
- `CODEX_RESUME_REQUIRED`
- `ITERATION_VERSION`
- `PREVIOUS_VERSION`
- `VERSION_FILE`
- `CHANGELOG_PATH`
- `PACKET_PATH`
- `PACKET_CONTENT`
- `STATE_PATH`
- `SKILL_DIR`
- `DESKTOP_DELIVERY_LOCK_DIR`

Create/update state for this phase before sending:

```bash
STATE_FILE="$SKILL_DIR/state/$COLLABORATION_ID.json"

node "$SKILL_DIR/scripts/state.mjs" init \
  --file "$STATE_FILE" \
  --collaboration-id "$COLLABORATION_ID" \
  --execution-id "explore-$COLLABORATION_ID" \
  --change "$CHANGE" \
  --round 1 \
  --mode SEND_TO_CLAUDE \
  --claude-session-id "$CLAUDE_CODE_SESSION_ID" \
  --claude-session-jsonl-path "$CLAUDE_SESSION_JSONL_PATH" \
  --claude-session-title "$CLAUDE_SESSION_TITLE" \
  --claude-worktree "$(pwd)" \
  --codex-worktree "$(pwd)" \
  --local-branch "$(git branch --show-current)" \
  --remote-branch "none" \
  --project-name "$PROJECT_NAME" \
  --git-project-path "$GIT_PROJECT_PATH" \
  --base-branch main \
  --desktop-session-title "$DESKTOP_SESSION_TITLE" \
  --desktop-group-name "$DESKTOP_GROUP_NAME" \
  --iteration-version "$ITERATION_VERSION" \
  --previous-version "$PREVIOUS_VERSION" \
  --version-file "$VERSION_FILE" \
  --changelog-path "$CHANGELOG_PATH" \
  --desktop-permission-mode BYPASS_PERMISSION \
  --desktop-model-policy LATEST_OPUS \
  --desktop-reasoning-level EXTRA_HIGH \
  --workflow-type "$WORKFLOW_TYPE" \
  --origin-codex-session-id "$ORIGIN_CODEX_SESSION_ID" \
  --origin-codex-thread-id "$ORIGIN_CODEX_THREAD_ID" \
  --codex-explore-summary-path ".codex-claude-collaboration/codex-explore-summary.md" \
  --claude-packet-path ".codex-claude-collaboration/claude-review-packet.md"
```

Run this data guard before touching Claude Desktop. It confirms the plan and
artifact shape are coherent; it does not replace UI repair:

```bash
node "$SKILL_DIR/scripts/phase-guard.mjs" \
  --state "$STATE_FILE" \
  --phase explore-packet \
  --packet-path ".codex-claude-collaboration/codex-explore-summary.md" \
  --message-file ".codex-claude-collaboration/claude-review-packet.md"
```

Then acquire the FIFO Desktop lock, open Claude Desktop, create a new session,
repair project/model/permission/reasoning controls as needed, run the same guard
again, paste/send the rendered Claude Explore prompt, rename and group the
session, update state to `SENT_TO_CLAUDE`, and release the lock.

Computer Use mechanical sequence for this phase:

1. Click `New session`.
2. In the bottom selector row, inspect `Local`; if a remote/non-local mode is
   selected, switch to `Local`.
3. Inspect the project chip. If it is not `$PROJECT_NAME`, click the folder
   selector and switch to `$GIT_PROJECT_PATH`.
4. Inspect the branch chip. If it is not `main`, change it to `main`.
5. Inspect the `worktree` checkbox. If it is off, enable it.
6. Inspect permission mode. If it is not `Bypass Permission`, change it to
   `Bypass Permission` in this same new session.
7. Inspect the model selector. If it is not the newest visible Opus model,
   choose the highest/newest Opus option shown by Claude Desktop.
8. Inspect reasoning level. If it is not `Extra High`, change it to
   `Extra High`. If the UI abbreviates this as `XH`/`XK`, treat that as the
   Extra High target only when the label clearly maps to Extra High.
9. Re-check all repaired controls: Local, `$PROJECT_NAME`, `main`, worktree on,
   Bypass Permission, newest Opus, Extra High.
10. Run `phase-guard.mjs` again. If it fails, do not type into Claude Desktop.
11. Paste/send the rendered prompt. It must begin exactly with
   `/openspec:explore `, including the space after `explore`.
   The body must include `Workflow type`, `Origin Codex session`,
   `Origin Codex thread`, and `Codex continuity required`.
12. After send, if the session appears under `Ungrouped`, open the session menu,
   choose `Rename`, and set `$DESKTOP_SESSION_TITLE` such as
   `V1.13 editor optimization`.
13. Open the session menu again, choose `Move to group`, and move it to
   `$DESKTOP_GROUP_NAME`. If the project group does not exist, create the group
   first, then move the session.
14. Update state to `SENT_TO_CLAUDE` only after the prompt was sent and rename /
   group placement was completed or explicitly blocked with a reason.

Claude should enter OpenSpec Explore and treat Codex's packet as evidence to
audit, not as a decision.

## 2. Claude Explore -> Proposal

Claude reads the packet and should:

1. Re-check important Codex evidence.
2. Challenge `[LIKELY]` claims.
3. Expand `[UNKNOWN]` into concrete questions/tests.
4. Look for adjacent hidden cases.
5. Decide whether there is enough clarity to propose.
6. If ready, create/update OpenSpec proposal/design/tasks/specs.
7. Include version-file and Changelog updates in the proposal/tasks when the
   iteration changes the product version.

Claude should not implement during Explore.

## 3. Claude Proposal -> Codex Implementation

Before starting Codex, Claude determines workflow type:

```bash
WORKFLOW_TYPE="${WORKFLOW_TYPE:-CLAUDE_FIRST}"

if [ "$WORKFLOW_TYPE" = "FULL_CODEX_FIRST" ] && [ -z "${ORIGIN_CODEX_SESSION_ID:-}" ]; then
  echo "ERROR: FULL_CODEX_FIRST requires ORIGIN_CODEX_SESSION_ID"
  exit 2
fi
```

For `FULL_CODEX_FIRST`, these values come from the Codex packet Claude received.
For `CLAUDE_FIRST`, there is no origin Codex session id and Claude creates the
first Codex task thread.

For every product iteration, Claude's proposal/tasks must identify:

- Previous product version.
- New product iteration version.
- Version file to update.
- Changelog path and entry content.

### 3.1 Validate and Push Proposal

```bash
CHANGE="<change-name>"
openspec validate "$CHANGE"
git fetch origin
git checkout main && git pull --ff-only

if git show-ref --verify --quiet "refs/heads/feat/$CHANGE" || \
   git show-ref --verify --quiet "refs/remotes/origin/feat/$CHANGE"; then
  echo "ERROR: feat/$CHANGE exists; review or rework the existing collaboration, or rename"
  exit 2
fi

git checkout -b "feat/$CHANGE"
git add "openspec/changes/$CHANGE/" SCOPE.md
git commit -m "chore(openspec): propose $CHANGE"
git push -u origin "feat/$CHANGE"
```

Stage only change artifacts and explicit scope docs.

### 3.2 Create Codex Worktree and State

```bash
SHORT=$(uuidgen | tr -d '-' | head -c 4 | tr A-Z a-z)
COLLABORATION_ID="collab-${CHANGE}-${SHORT}"
EXECUTION_ID="exec-${CHANGE}-${SHORT}"
LOCAL_BRANCH="codex/${CHANGE}-${SHORT}"
CLAUDE_WORKTREE="$(pwd)"
MAIN_REPO="$(git -C "$CLAUDE_WORKTREE" rev-parse --show-toplevel)"
PROJECT_NAME="${PROJECT_NAME:-$(basename "$MAIN_REPO")}"
CODEX_WORKTREE="$HOME/.codex/worktrees/${CHANGE}-${SHORT}/$PROJECT_NAME"
SKILL_DIR="$HOME/.claude/skills/codex-claude-collaboration"
LOCK_DIR="$SKILL_DIR/state/desktop-delivery.lock"

git -C "$MAIN_REPO" worktree add "$CODEX_WORKTREE" -b "$LOCAL_BRANCH" "origin/feat/$CHANGE"
mkdir -p "$CODEX_WORKTREE/.codex-claude-collaboration/history"

SESSION_JSON=$(node "$SKILL_DIR/scripts/resolve-claude-session.mjs" --session-id "$CLAUDE_CODE_SESSION_ID")
CLAUDE_SESSION_JSONL_PATH=$(echo "$SESSION_JSON" | jq -r '.jsonl_path')
CLAUDE_SESSION_TITLE=$(echo "$SESSION_JSON" | jq -r '.custom_title')
STATE_FILE="$SKILL_DIR/state/$COLLABORATION_ID.json"

WORKFLOW_TYPE="${WORKFLOW_TYPE:-CLAUDE_FIRST}"
STATE_ARGS=(
  --file "$STATE_FILE"
  --collaboration-id "$COLLABORATION_ID"
  --execution-id "$EXECUTION_ID"
  --change "$CHANGE"
  --round 1
  --mode CODEX_IMPLEMENT
  --claude-session-id "$CLAUDE_CODE_SESSION_ID"
  --claude-session-jsonl-path "$CLAUDE_SESSION_JSONL_PATH"
  --claude-session-title "$CLAUDE_SESSION_TITLE"
  --claude-worktree "$CLAUDE_WORKTREE"
  --codex-worktree "$CODEX_WORKTREE"
  --local-branch "$LOCAL_BRANCH"
  --remote-branch "feat/$CHANGE"
  --workflow-type "$WORKFLOW_TYPE"
)

if [ -n "${ORIGIN_CODEX_SESSION_ID:-}" ]; then
  STATE_ARGS+=(--origin-codex-session-id "$ORIGIN_CODEX_SESSION_ID")
fi
if [ -n "${ORIGIN_CODEX_THREAD_ID:-}" ]; then
  STATE_ARGS+=(--origin-codex-thread-id "$ORIGIN_CODEX_THREAD_ID")
fi

node "$SKILL_DIR/scripts/state.mjs" init "${STATE_ARGS[@]}"
```

This implementation worktree is created from the pushed proposal branch and is
the only source of truth for Codex implementation edits. This is required for
both workflow types. In `FULL_CODEX_FIRST`, the original Codex exploration
worktree may have been created from `main` before Claude wrote proposal files,
so it must not be treated as containing the current proposal.

### 3.3 Start Codex

Render `templates/codex-execution.md`, then start Codex from the proposal
branch implementation worktree. If this collaboration began in Codex, resume
the exact stored Codex thread. This avoids `--resume-last` selecting another
Claude session's most recent task.

```bash
cd "$CODEX_WORKTREE"
unset OPENAI_API_KEY
export CODEX_CLAUDE_COLLABORATION_FULL_ACCESS=1
CODEX_COMPANION="${CODEX_COMPANION:-codex-companion}"

if [ "$WORKFLOW_TYPE" = "FULL_CODEX_FIRST" ]; then
  if [ -z "${ORIGIN_CODEX_THREAD_ID:-}" ]; then
    echo "ERROR: FULL_CODEX_FIRST requires ORIGIN_CODEX_THREAD_ID"
    exit 2
  fi
  JOB_OUT=$("$CODEX_COMPANION" \
    task --resume-thread "$ORIGIN_CODEX_THREAD_ID" --background --write --json \
    "$(cat "$CODEX_WORKTREE/.codex-claude-collaboration/goal.round-1.md")")
else
  JOB_OUT=$("$CODEX_COMPANION" \
    task --background --write --json \
    "$(cat "$CODEX_WORKTREE/.codex-claude-collaboration/goal.round-1.md")")
fi

node "$SKILL_DIR/scripts/state.mjs" update \
  --file "$STATE_FILE" \
  --codex-job-id "$(echo "$JOB_OUT" | jq -r '.jobId')" \
  --codex-thread-id "$(echo "$JOB_OUT" | jq -r '.threadId // empty')"
```

End the Claude turn and wait for Desktop delivery.

## 4. Codex Implementation -> Claude Review

Codex implements tasks, validates, pushes, opens/updates PR, writes
`.codex-claude-collaboration/implementation-result.json`, and sends:

```text
codex-claude DONE <collaboration_id> round <n>: <STATUS> — <PR_URL_OR_NONE>
Summary: <one concise Chinese sentence>
```

It must use `templates/codex-execution.md` / `templates/codex-rework.md`
Desktop delivery rules and never use shell-based Claude message delivery.

Before Codex touches Claude Desktop, it must run:

```bash
node "$SKILL_DIR/scripts/phase-guard.mjs" \
  --state "$STATE_PATH" \
  --phase implementation-result \
  --result-path "$CODEX_WORKTREE/.codex-claude-collaboration/implementation-result.json"
```

This prevents the exploration packet path and the implementation completion path
from being confused.

## 5. Claude Review and Rework

Claude enters REVIEW when Desktop receives `codex-claude DONE ...` or user asks
to review.

Required:

```bash
node ~/.claude/skills/codex-claude-collaboration/scripts/validate-implementation-result.mjs "$CODEX_WORKTREE"
openspec validate "$CHANGE" --strict
```

Then inspect PR diff, evidence, tests, and `review-checklist.md`.

If clean: archive, merge, mark state `COMPLETED`.

If issues and round < 3: render `templates/codex-rework.md` and send to the
stored `codex_thread_id` with
`codex-companion task --resume-thread "$CODEX_THREAD_ID" --write --json`.

If round >= 3 and Blocking/High remains: stop and report.

## 6. Desktop Targeting

Before any Codex -> Claude Desktop send:

1. Read state.
2. Re-read `claude_session_jsonl_path`.
3. Confirm JSONL first line `sessionId`.
4. Use latest JSONL `customTitle`.
5. If mode is `SEND_TO_CLAUDE`, click `New session`; otherwise click exact
   title via accessibility tree.
6. If mode is `SEND_TO_CLAUDE`, repair bottom selectors if needed: Local,
   project name, branch `main`, and worktree enabled.
7. If mode is `SEND_TO_CLAUDE`, repair session controls if needed:
   Bypass Permission, newest visible Opus, Extra High reasoning.
8. Verify main pane has a strong marker:
   - `collaboration_id`
   - `execution_id`
   - `change`
   - PR URL/number
   - packet path or unique issue text
9. Send only if exactly one target is identified and the controls have been
   repaired or already matched.

Duplicate title + no unique marker = do not send.

## 7. FIFO Desktop Lock

All Computer Use sends share:

`~/.claude/skills/codex-claude-collaboration/state/desktop-delivery.lock`

Use:

```bash
node "$SKILL_DIR/scripts/desktop-delivery-lock.mjs" acquire \
  --lock-dir "$LOCK_DIR" \
  --owner "<collaboration-id>.round-<n>" \
  --wait-seconds 600 \
  --poll-ms 1000 \
  --stale-seconds 900
```

The script creates a FIFO ticket. Oldest ticket wins; waiters poll until the
active holder releases. If wait expires, do not touch Claude Desktop.

## 8. Quality Rules

- Transfer observations and evidence, not authoritative decisions.
- Label claims `[CONFIRMED]`, `[LIKELY]`, `[UNKNOWN]`, `[USER-OBSERVED]`.
- Make Claude's job explicit: verify, challenge, expand, then propose.
- Keep packets concise enough to review, but link evidence paths for depth.
- Never hide failed commands or ambiguous UI observations.
