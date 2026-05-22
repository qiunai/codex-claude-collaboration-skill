---
name: codex-claude-collaboration
description: >-
  Coordinate Codex and Claude as a two-agent collaboration system across
  Codex-led investigation, Claude OpenSpec exploration/proposal, Codex
  implementation, Claude review, rework, and merge. Use when the user asks for
  Codex-to-Claude review packets, Claude-to-Codex implementation execution,
  Desktop delivery through Computer Use, exact Claude conversation targeting,
  FIFO Desktop locking, or evidence-first cross-model review.
---

# Codex-Claude Collaboration (V8)

This skill defines the full Codex-Claude Cooperation workflow. It is no longer a
one-way delivery helper: implementation execution is only one stage inside the
larger collaboration loop.

## Purpose

Use each tool where it is strongest:

```text
Codex investigates with tools/plugins
  -> sends a reviewable packet to Claude Desktop
  -> Claude deepens OpenSpec Explore and writes proposal artifacts
  -> Codex implements in an isolated worktree and opens/updates a PR
  -> Codex reports through Claude Desktop
  -> Claude reviews, requests rework, archives, and merges
```

The core V8 rule: **transfer reviewable material, not false certainty.** Codex
must label evidence, interpretations, and unknowns so Claude can audit and
improve the result instead of inheriting an overconfident conclusion.

## Required Installation Order

Before using this workflow in Claude or Codex:

1. Install the Claude Code Codex plugin and verify it supports exact thread
   routing:
   `codex-companion task --resume-thread <thread-id>`.
2. Install OpenSpec in the target development environment.
3. Install this skill in both Codex and Claude when both agents participate in
   the loop.

If the installed Codex plugin does not advertise `--resume-thread <thread-id>`,
apply the bundled patch:

```bash
node codex-claude-collaboration/scripts/install-codex-plugin-cc-resume-thread.mjs
```

Then verify:

```bash
node codex-claude-collaboration/scripts/verify-codex-companion.mjs \
  --command "$CODEX_COMPANION"
```

## Modes

| Trigger | Mode | Direction |
| --- | --- | --- |
| User asks Codex to investigate first | `CODEX_EXPLORE` | User -> Codex |
| User asks to send Codex findings to Claude | `SEND_TO_CLAUDE` | Codex -> Claude Desktop |
| Claude receives a Codex packet | `CLAUDE_EXPLORE` | Claude OpenSpec Explore |
| Claude proposal is ready for Codex execution | `CODEX_IMPLEMENT` | Claude -> Codex broker |
| Claude Desktop receives `codex-claude DONE ...` | `REVIEW` | Codex -> Claude |
| REVIEW finds fixable issues and round < 3 | `REWORK` | Claude -> exact Codex thread |

## Workflow Types

- `FULL_CODEX_FIRST`: the user started in Codex, Codex explored first, and the
  packet sent to Claude must include `origin_codex_thread_id`. This is the
  Codex app-server thread id and the only value used for re-entry. When Claude
  later sends the proposal back to Codex, it must target that exact Codex thread
  with
  `codex-companion task --resume-thread <origin_codex_thread_id>`.
- `CLAUDE_FIRST`: the user started in Claude and there is no prior Codex
  session. Claude may create the first Codex task thread for implementation.

Workflow type is not inferred:

- Codex sets `FULL_CODEX_FIRST` when it sends an exploration packet to Claude.
  Codex writes it into state and into the Claude prompt together with
  `origin_codex_thread_id`.
- Claude sets `CLAUDE_FIRST` when the user starts in Claude and asks Claude to
  send a proposal to Codex without a prior Codex thread id.
- Claude must preserve `FULL_CODEX_FIRST` from the Codex packet when it later
  starts implementation. If that marker is present but the origin Codex thread
  id is missing, Claude must stop instead of silently changing the workflow
  type.

Broker resume rule:

- Before relying on exact routing, verify the installed broker advertises
  `task --resume-thread <thread-id>` with
  `scripts/verify-codex-companion.mjs --command "$CODEX_COMPANION"`.
- This repository includes the codex-plugin-cc runtime patch under
  `plugins/codex-plugin-cc/` for environments where the published plugin does
  not yet include upstream PR 344.
- A valid `codex-companion` supports exact thread resume:
  `codex-companion task --resume-thread <thread-id>`.
- `--resume-thread` is wired to Codex app-server `thread/resume`, so it targets
  the supplied thread id instead of searching for the latest thread.
- Some Codex/companion UI output labels this same value as "Codex session ID";
  in this skill, call it `origin_codex_thread_id` and pass it only to
  `--resume-thread`.
- `--resume-last` means "resolve the latest resumable Codex task thread" for
  the current broker/session/repository context. It is not a safe identity
  mechanism for concurrent Claude sessions and must not be used for automated
  collaboration routing.
- Do not use native direct resume commands.

## Product Iteration Versioning

Session names and proposal scopes use the product iteration version, not the
skill version. The skill may be V8 while the product iteration is `V1.13`.

- Resolve `CURRENT_VERSION` from the project and compute `ITERATION_VERSION`
  before creating a Claude Desktop session.
- Name sessions as `Vx.y short summary`, for example
  `V1.13 editor optimization`.
- Claude proposals and Codex implementation tasks must include the product
  version file and Changelog updates when the product version changes.
- Merged PRs should leave `main` with the updated version and Changelog so the
  next session can read the correct base version.

## Phase Guard

Before any Computer Use send, run `scripts/phase-guard.mjs` against the state
file and the artifact being sent. The guard is the final verification step, not
the first UI action.

- Explore packet delivery must pass:
  `--phase explore-packet`, mode `CODEX_EXPLORE` or `SEND_TO_CLAUDE`,
  `codex_explore_summary_path`, no `implementation_result_path`,
  `workflow_type=FULL_CODEX_FIRST`, `origin_codex_thread_id`,
  `iteration_version`, permission mode `BYPASS_PERMISSION`, model policy
  `LATEST_OPUS`, and reasoning level `EXTRA_HIGH`.
- Implementation result delivery must pass:
  `--phase implementation-result`, mode `CODEX_IMPLEMENT` or `REWORK`,
  `implementation_result_path`, matching `collaboration_id` and
  `execution_id`, and terminal status `READY_FOR_REVIEW` / `FAILED` /
  `BLOCKED`.

For `SEND_TO_CLAUDE`, use Computer Use to inspect and repair Claude Desktop
first. If project, branch, worktree, permission, model, or reasoning are wrong,
change them to the expected values. Run the guard after those repairs and before
typing the prompt. If the UI cannot be repaired, do not send.

## Runtime State

Runtime collaboration state must live outside the installed skill directory:

`~/.claude/codex-claude-collaboration/state/`

Use `CODEX_CLAUDE_COLLABORATION_STATE_DIR` to override it. Do not store active
state under `~/.claude/skills/codex-claude-collaboration/state/` or
`~/.codex/skills/codex-claude-collaboration/state/`; skill reinstall or sync
commands often delete those directories.

Claude creates the state file before dispatching Codex. Codex receives
`STATE_PATH` in the execution prompt. If Codex finds the file missing before
Desktop delivery, it may recreate only that exact file from explicit prompt
metadata, then run `phase-guard.mjs`. If recovery cannot be performed exactly,
Codex must write a `BLOCKED` implementation result and stop instead of sending
an unguarded Desktop message.

## Evidence Discipline

Every Codex -> Claude packet must label claims:

- `[CONFIRMED]`: backed by code path, command output, screenshot, log, or direct UI observation.
- `[LIKELY]`: reasoned interpretation from confirmed facts; may be wrong.
- `[UNKNOWN]`: needs Claude to inspect, test, or challenge.
- `[USER-OBSERVED]`: user-reported symptom not yet independently verified.

Do not write "the root cause is..." unless it is `[CONFIRMED]` with evidence.
Prefer "possible root cause" for `[LIKELY]` items.

## Codex -> Claude Packet

When the user asks Codex to pass investigation results to Claude:

1. Write `.codex-claude-collaboration/codex-explore-summary.md`.
2. Include user problem, Codex observations, evidence links/paths, likely
   interpretations, unknowns, and suggested Claude review questions.
3. Validate the packet with `scripts/validate-claude-packet.mjs`.
4. Resolve local Git context with `scripts/project-context.mjs`.
5. Resolve product version context with `scripts/version-context.mjs`.
6. Resolve current Codex thread context with `scripts/codex-session-context.mjs`;
   do not send the packet if the current Codex thread id is unavailable.
7. Use Claude Desktop Computer Use to click `New session`, inspect the current
   session controls, and repair any mismatch before sending.
8. Required repaired state: matching local project, branch `main`, worktree
   enabled, Bypass Permission, newest visible Opus model, and Extra High
   reasoning.
9. The prompt must include `Workflow type`, `Origin Codex thread`,
   `Codex continuity required`, and product iteration version metadata.
10. The prompt must start with `/openspec:explore `, including the trailing
   space after the command.
11. Rename the new session to `Vx.y short summary` and move it into the project
   group after sending.

Claude should enter OpenSpec Explore, audit Codex's packet, look for hidden
cases, and only then decide whether to create proposal/design/tasks/specs.

## Claude -> Codex Execution

When Claude has an OpenSpec proposal ready for Codex:

1. Validate OpenSpec.
2. Determine workflow type from the active collaboration state or the Codex
   packet Claude received:
   - `FULL_CODEX_FIRST`: use `origin_codex_thread_id` with
     `codex-companion task --resume-thread`.
   - `CLAUDE_FIRST`: create the first Codex task thread.
3. Push the proposal branch.
4. Create an isolated Codex implementation worktree from the pushed proposal
   branch `origin/feat/<change>`. In `FULL_CODEX_FIRST`, do not assume the
   original Codex exploration worktree contains Claude's proposal files; it may
   have been created from `main`.
5. Resolve the Claude session JSONL path and latest title.
6. If state has `workflow_type=FULL_CODEX_FIRST`, start Codex from the proposal
   branch worktree using `codex-companion task --resume-thread
   <origin_codex_thread_id> --background --write --json`.
7. If state has `workflow_type=CLAUDE_FIRST`, start Codex with
   `codex-companion task --background --write --json`.
8. Codex implements, validates, writes `implementation-result.json`, and
   reports through Claude Desktop Computer Use.
9. Claude reviews, merges, or sends rework to the exact stored Codex thread.

## Claude Review, Rework, And Merge

Claude should be proactive after Codex returns `READY_FOR_REVIEW`:

1. Validate the implementation against OpenSpec and the PR diff.
2. Classify findings:
   - `Blocking/Harmful`: correctness, data loss, security, destructive UX,
     broken core workflow, fake evidence, or failed required gates.
   - `High`: likely user-visible regression or spec mismatch.
   - `Minor`: polish, naming, small copy issue, non-blocking cleanup, flaky
     documentation detail, or merge conflict/branch hygiene.
3. If Blocking/Harmful or High findings exist, send a focused rework packet to
   Codex with `codex-companion task --resume-thread <codex_thread_id>`. Codex
   fixes only the listed findings, pushes, and reports back through Desktop.
4. Count only structural Blocking/Harmful/High review cycles against the
   3-round cap. If round 3 still has Blocking/Harmful or High findings, Claude
   stops and asks the user whether to change direction.
5. Minor issues, merge conflicts, branch synchronization, archive mechanics, PR
   comments, and similarly low-risk cleanup do not consume the 3-round cap.
   Claude should continue delegating those to Codex until clean.
6. If all required gates pass and findings are only acceptable nit-level notes,
   Claude should not stop for user approval. It should archive, comment on the
   PR, merge to `main`, and mark state `COMPLETED`.

Completion order after acceptance:

1. Archive the OpenSpec change and commit/push the archive result.
2. Reply on the PR with validation summary, archive commit, and merge intent.
3. Merge the PR to `main` using the repository's normal merge method.
4. Update collaboration state with merge commit and `COMPLETED`.

## Desktop Delivery

All Codex -> Claude messages use Claude Desktop via Computer Use. Do not use
Claude CLI resume/print modes, Agent SDK, GitHub Actions, or shell-based
message delivery.

For `SEND_TO_CLAUDE`, always create a new Claude Desktop session. Verify bottom
selectors before sending: Local project, project name equals the current Git
repo, branch is `main`, and worktree is enabled. If the visible project name is
wrong, use the folder selector to switch to the current repository's local path
before sending.

Also inspect and repair session controls before sending:

- If permission mode is not `Bypass Permission`, change it.
- If the model is not the newest visible Opus option, change it. If Claude Desktop later offers
  Opus 4.8 or Opus 5, choose the latest Opus shown in the UI.
- If reasoning level is not `Extra High`, change it.

Only after these repairs are complete should Codex paste/send the prompt.

Targeting must verify:

1. `claude_session_jsonl_path` exists and its first line `sessionId` matches.
2. `customTitle` is read from JSONL; if renamed, use the latest file title.
3. Claude Desktop sidebar title is selected by accessibility-tree label.
4. Main pane contains a strong marker: `collaboration_id`, `execution_id`,
   `change`, PR URL/number, packet path, or another unique marker.
5. If title duplicates exist or markers do not uniquely identify the target,
   do not send.

## Concurrency

Desktop delivery is serialized by the FIFO lock:

`~/.claude/codex-claude-collaboration/state/desktop-delivery.lock`

Independent Codex work can run in parallel, but only the queue head may touch
Claude Desktop. Waiters poll until the active sender releases, reclaim stale
locks after timeout, or stop with a clear timeout reason.

## Loop Limits

- Exploration can iterate, but each packet should be concise and evidence-led.
- Implementation/rework rounds are capped at 3 structural rounds.
- If round 3 still has Blocking/High findings, Claude stops and reports.

Read `OPERATIONS.md` for exact commands and templates.
