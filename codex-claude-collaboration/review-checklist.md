# PR Review Checklist (REVIEW mode)

> Apply every applicable item against the PR diff + the change's
> proposal/design/tasks/specs. Grade each finding
> `Blocking | High | Medium | Low`. Be specific: file:line + concrete fix.
> V8 routing treats `Blocking` and `High` as structural findings. `Medium` and
> `Low` are minor unless the reviewer explicitly explains why they create
> harmful user impact.

---

## Gate 0 · OpenSpec validation

- [ ] `openspec validate <CHANGE>` reports valid. FAIL = **Blocking**.
- [ ] Every spec delta still parses (ADDED/MODIFIED/REMOVED headers, at
      least one `#### Scenario:` per requirement).

## Gate 1 · Scope discipline (SCOPE.md)

- [ ] No files touched under any directory SCOPE.md declares off-limits
      (e.g. legacy tool dirs). Any violation = **Blocking**.
- [ ] No new first-class routes / components / capabilities beyond what the
      change's specs declare. Out-of-scope additions = **High**.
- [ ] No reverting/rewriting code owned by other (archived or in-progress)
      changes. = **High**.
- [ ] No new runtime dependencies that the change's design.md did not
      declare. Undeclared dep = **High**.

## Gate 2 · Foundation phase integrity (audit FIRST)

A flawed shared base contaminates every downstream unit. Before per-route
review, audit the foundation/infra phase commits:

- [ ] Shared hooks/utilities behave per design.md contract (e.g.
      SSR-safety, breakpoint thresholds, default values).
- [ ] Shared component changes (dialog/shell/nav) are backward compatible —
      no silent break of existing call sites.
- [ ] Global middleware / guards do not over-match (e.g. redirect rules
      that accidentally catch unintended paths, SEO/UA side-effects).
- [ ] Foundation was committed/validated before dependent phases started
      (commit order sanity).

## Gate 3 · Per-unit implementation fidelity

For each route/component/capability unit in the diff:

- [ ] Implements the technical mode design.md mandates (e.g. if design
      requires `useIsMobile()` + conditional branch, confirm it is NOT a
      CSS `@media` DOM-swap or other forbidden pattern).
- [ ] Mobile/variant branches do not leak desktop-only chrome
      (e.g. sidebars, multi-column layouts, hover-only affordances) when
      the design says they must not.
- [ ] Visual values go through design tokens, not hardcoded hex/px copied
      from an implementation prototype.
- [ ] Structure/order of elements matches the referenced design source
      (the change's design.md will name it, e.g. a specific JSX file).
- [ ] Interactive targets meet any size/accessibility rule the specs state
      (e.g. ≥ 44×44 tap targets); safe-area / inset rules applied where
      required.
- [ ] Spec scenarios for this unit are actually satisfiable by the code
      (walk 1–2 key scenarios against the diff).

## Gate 4 · Task-completion honesty

- [ ] Every `tasks.md` checkbox flipped to `[x]` has supporting diff
      content. A checked task with no backing change = **High** (erodes
      trust in the whole task ledger).
- [ ] Skipped tasks (still `[ ]` with an inline reason) are reflected in
      the PR's "Known gaps" section. Silent skips = **High**.
- [ ] Per-phase commit granularity roughly matches what design.md /
      tasks.md prescribed (not one giant squash, not 300 noise commits).

## Gate 5 · Verification evidence

- [ ] PR body claims the local verification commands passed
      (openspec validate / typecheck / lint / test / build /
      audit:mobile as applicable). Re-run the cheap ones
      (`openspec validate`, `typecheck`) to spot-check the claim.
- [ ] If the change required archived artifacts (screenshots, reports),
      they exist at the paths design.md/tasks.md specified.

## Gate 6 · Git hygiene

- [ ] No `--amend` rewrite of pushed history, no force-push markers.
- [ ] No `--no-verify` / skipped hooks.
- [ ] Final "(final)" commit present, carrying the verification summary.
- [ ] Branch is `feat/<CHANGE>`, base is `main`.

## Gate 7 · Evidence-manifest honesty

The emitted prompts mandate retained evidence (and, on rework, an
`EVIDENCE-MANIFEST`). Audit by it:

- [ ] Every `tasks.md` `[x]` maps to a real, non-empty, on-point artifact
      under `reports/evidence/` (screenshot / JSON matrix / IndexedDB dump /
      opened export file / console log). Missing or off-point = **High**.
- [ ] If a manifest + self-check exist, the self-check actually passed and
      its referenced files exist. A green self-check that references absent
      files = **Blocking** (fabricated verification).
- [ ] If `evidence_manifest` exists, check the fixed selfcheck path:
      round 1 uses `reports/evidence/<CHANGE>/SELFCHECK.log`, rework rounds use
      `reports/evidence/<CHANGE>/SELFCHECK.round-<N>.log`. It must contain a real
      shell command, output, and exit code 0. A suspicious
      or hand-written-looking selfcheck log = **High**.
- [ ] Open tasks are `[ ]` with a *specific* technical reason (not "ran out
      of time"); the reason is mirrored in the reports / PR body.
- [ ] Browser-verifiable claims show tool-driven evidence (internal browser
      / Chrome plugin), not prose assertion of UI behaviour.

## Gate 8 · Decision routing (no ambiguity)

- [ ] Collapse the verdict to exactly one route. ✅ **only** if: spec valid,
      zero Blocking/High, no SCOPE violation, every `[x]` evidence-backed,
      gates green, no open-with-reason task that the change's own
      done-definition requires. → **R6 ACCEPT & MERGE**.
- [ ] Any "could pass or not" feeling, or any 🟡/⛔ finding → **R5
      REWORK** (author the rework prompt; do not merge, do not fix code
      yourself).
- [ ] Never merge on the PR's self-reported green alone — the cheap gates
      (`openspec validate`, typecheck) are re-run by the reviewer first.
- [ ] If the verdict is clean, do not stop for user approval. Run the accepted
      completion route: archive, comment on the PR, merge, delete the remote
      feature branch, mark state complete.
- [ ] If round 3 still has Blocking/High, stop for user direction. If only
      Medium/Low, merge conflicts, archive mechanics, PR comment wording, or
      branch sync remain, continue delegating those to Codex until clean.

---

## Output format

```
## 1. OpenSpec validate
PASS / FAIL  (+ errors)

## 2. Risk findings
| Grade | Area | Location | Issue | Fix |
| Blocking/High/Medium/Low | ... | file:line | ... | ... |

## 3. Task honesty
- [x] tasks with no backing diff: ...
- Silent skips: ...

## 4. Merge verdict (routes the next step)
✅ Unambiguous clean pass → R6 ACCEPT & MERGE
🟡 Fixes needed → R5 REWORK
⛔ Not mergeable → R5 REWORK

## 5. Suggested follow-ups (non-blocking)
- ...

## 6. Next action
- If ✅ → run R6: archive → commit → PR acceptance comment → merge to main →
  delete remote feature branch. Keep local branches/worktrees unless the user
  explicitly asks for local cleanup.
- If 🟡/⛔ with Blocking/High and structural round < 3 → run R5: emit the
  substituted /GOAL rework prompt (findings).
- If 🟡/⛔ with Blocking/High at structural round 3 → stop and ask the user
  whether to change direction.
- If only Medium/Low cleanup or merge conflicts remain → keep sending focused
  Codex rework; these do not consume the structural round cap.
```

Grading guide:
- **Blocking** — spec invalid, SCOPE.md violation, build/test broken,
  data-loss / security risk, fabricated verification (green self-check /
  manifest referencing absent or off-point evidence).
- **High** — out-of-scope work, undeclared dep, dishonest task ledger,
  `[x]` without backing evidence, forbidden technical pattern, foundation
  contract broken.
- **Medium** — design-fidelity gaps, missing token usage, missing
  safe-area/tap-target, weak spec coverage.
- **Low** — naming, minor structure, polish, optional refactors.
