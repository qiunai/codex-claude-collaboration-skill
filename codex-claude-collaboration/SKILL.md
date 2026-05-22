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

# Codex-Claude Collaboration (V7)

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

The core V7 rule: **transfer reviewable material, not false certainty.** Codex
must label evidence, interpretations, and unknowns so Claude can audit and
improve the result instead of inheriting an overconfident conclusion.

## Modes

| Trigger | Mode | Direction |
| --- | --- | --- |
| User asks Codex to investigate first | `CODEX_EXPLORE` | User -> Codex |
| User asks to send Codex findings to Claude | `SEND_TO_CLAUDE` | Codex -> Claude Desktop |
| Claude receives a Codex packet | `CLAUDE_EXPLORE` | Claude OpenSpec Explore |
| Claude proposal is ready for Codex execution | `CODEX_IMPLEMENT` | Claude -> Codex broker |
| Claude Desktop receives `codex-claude DONE ...` | `REVIEW` | Codex -> Claude |
| REVIEW finds fixable issues and round < 3 | `REWORK` | Claude -> same Codex thread |

## Workflow Types

- `FULL_CODEX_FIRST`: the user started in Codex, Codex explored first, and the
  packet sent to Claude must include `origin_codex_session_id`. When Claude
  later sends the proposal back to Codex, it must resume that existing Codex
  session instead of creating a new one.
- `CLAUDE_FIRST`: the user started in Claude and there is no prior Codex
  session. Claude may create the first Codex task thread for implementation.

Workflow type is not inferred:

- Codex sets `FULL_CODEX_FIRST` when it sends an exploration packet to Claude.
  Codex writes it into state and into the Claude prompt together with
  `origin_codex_session_id`.
- Claude sets `CLAUDE_FIRST` when the user starts in Claude and asks Claude to
  send a proposal to Codex without a prior Codex session id.
- Claude must preserve `FULL_CODEX_FIRST` from the Codex packet when it later
  starts implementation. If that marker is present but the origin Codex session
  id is missing, Claude must stop instead of creating a new Codex thread.

## Product Iteration Versioning

Session names and proposal scopes use the product iteration version, not the
skill version. The skill may be V7 while the product iteration is `V1.13`.

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
  `workflow_type=FULL_CODEX_FIRST`, `origin_codex_session_id`,
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
6. Resolve current Codex session context with `scripts/codex-session-context.mjs`;
   do not send the packet if the current Codex session id is unavailable.
7. Use Claude Desktop Computer Use to click `New session`, inspect the current
   session controls, and repair any mismatch before sending.
8. Required repaired state: matching local project, branch `main`, worktree
   enabled, Bypass Permission, newest visible Opus model, and Extra High
   reasoning.
9. The prompt must include `Workflow type`, `Origin Codex session`,
   `Codex resume required`, and product iteration version metadata.
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
   - `FULL_CODEX_FIRST`: resume `origin_codex_session_id`.
   - `CLAUDE_FIRST`: create the first Codex task thread.
3. Push the proposal branch.
4. Create an isolated Codex worktree.
5. Resolve the Claude session JSONL path and latest title.
6. If state has `workflow_type=FULL_CODEX_FIRST`, start Codex by resuming
   `origin_codex_session_id`; do not create a new Codex task thread.
7. If state has `workflow_type=CLAUDE_FIRST`, start Codex with
   `codex-companion task --background --write --json`.
8. Codex implements, validates, writes `implementation-result.json`, and
   reports through Claude Desktop Computer Use.
9. Claude reviews, merges, or sends rework to the same Codex thread.

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

`~/.claude/skills/codex-claude-collaboration/state/desktop-delivery.lock`

Independent Codex work can run in parallel, but only the queue head may touch
Claude Desktop. Waiters poll until the active sender releases, reclaim stale
locks after timeout, or stop with a clear timeout reason.

## Loop Limits

- Exploration can iterate, but each packet should be concise and evidence-led.
- Implementation/rework rounds are capped at 3 structural rounds.
- If round 3 still has Blocking/High findings, Claude stops and reports.

Read `OPERATIONS.md` for exact commands and templates.
