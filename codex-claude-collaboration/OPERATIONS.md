# Manual Operations (V9)

V9 is copy-paste only. Do not automate delivery between agents.

## Manual Boundary

The only deliverable is a prompt that the user manually copies. If generated
content mentions programmatic sending, cross-agent routing, hidden state,
waiting for another agent, or automatic reply delivery, remove that content
before returning the prompt.

## Codex Research To Claude

When the user says "交给 Claude 进行二次研究":

1. Summarize the current conversation and investigation.
2. Separate evidence from interpretation.
3. Ask Claude to challenge the analysis.
4. If OpenSpec is appropriate, start with `/openspec:explore `.
5. Return a single copyable prompt.

Use `templates/codex-to-claude-research.md`.

## Claude Proposal To Codex

When the user says "交给 Codex 执行":

1. Identify the OpenSpec change id or implementation plan.
2. Identify the current repo/workspace if known.
3. Make the first characters `/goal`.
4. Tell Codex what to read, implement, verify, and return.
5. Keep generic process text short.

Use `templates/claude-to-codex-implementation.md`.

## Codex Result To Claude Review

When Codex has implemented something and the user asks for Claude review:

1. Include implementation status.
2. Include PR URL, branch, or diff pointers.
3. Include validation commands and results.
4. Include evidence paths and known gaps.
5. Ask Claude to classify findings as `Blocking`, `High`, or `Minor`.

Use `templates/codex-to-claude-review.md`.

## Claude Review To Codex Rework

When Claude finds issues and the user wants Codex to fix them:

1. Start with `/goal`.
2. Include only findings that need action.
3. Include enough context to locate the PR/change/files.
4. Ask Codex to fix, verify, and return a fresh review summary.

Use `templates/claude-to-codex-rework.md`.

## Quality Checklist

Before returning a handoff prompt:

- Does the first line use the right command?
  - Claude OpenSpec research: `/openspec:explore `
  - Codex implementation/rework: `/goal`
- Is the current task detailed enough?
- Are routine constraints short?
- Are facts labeled separately from hypotheses?
- Are missing assumptions visible?
- Is the requested output explicit?
- Is there any automated dispatch instruction left? If yes, remove it.
