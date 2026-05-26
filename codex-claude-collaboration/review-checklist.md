# Manual PR Review Checklist (V10)

Use this when reviewing Codex's PR. Grade findings `Blocking | High | Medium | Low`.

## Gates

1. **OpenSpec**
   - `openspec validate <CHANGE>` passes.
   - Proposal/design/tasks/specs still match the PR behavior.

2. **Scope**
   - No SCOPE.md violation.
   - No undeclared dependency, route, component, or capability.
   - No unrelated refactor or revert of other work.

3. **Foundation First**
   - Shared/foundation phase is correct before dependent work.
   - Shared APIs/components preserve existing call sites.

4. **Implementation Fidelity**
   - Code follows design.md technical mode.
   - UI/visual work uses tokens and required responsive/accessibility rules.
   - Key spec scenarios are satisfiable from the diff.

5. **Task Honesty**
   - Every `tasks.md` `[x]` has backing diff and evidence.
   - Skipped tasks remain `[ ]` with a specific reason and appear in Known gaps.

6. **Evidence**
   - Claimed gates have command output or artifacts.
   - Screenshots/logs/JSON/export files are real, non-empty, and on-point.

7. **Git Hygiene**
   - No force-push/amend/no-verify signs.
   - PR branch is based on the proposal branch and targets main.
   - Commit granularity is reviewable.

## Verdict

- `ACCEPT`: spec valid, zero Blocking/High, SCOPE clean, task ledger honest, gates credible.
- `REWORK_REQUIRED`: any Blocking/High, dishonest task state, missing required evidence, or failed gate.
- `NEEDS_USER_DECISION`: product/scope ambiguity cannot be resolved by code review.

If unsure, do not accept. Produce a focused rework prompt instead.
