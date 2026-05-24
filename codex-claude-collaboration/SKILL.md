---
name: codex-claude-collaboration
description: >-
  Build concise manual handoff prompts between Codex and Claude. Use when the
  user asks to pass Codex research to Claude, pass a Claude/OpenSpec proposal to
  Codex, summarize Codex results for Claude review, or continue a manual
  Codex-Claude review loop through user copy-paste.
---

# Codex-Claude Collaboration (V9)

V9 is manual-only. The skill does not start another agent, operate UI, route
tasks, preserve hidden handoff state, or send messages automatically.

Your job is to prepare a clear copy-paste prompt for the user. The user decides
where to paste it.

## Core Modes

Use the smallest matching mode:

| User Intent | Output |
| --- | --- |
| "交给 Claude 进行二次研究" | A Claude research prompt, usually starting with `/openspec:explore ` when the project uses OpenSpec. |
| "交给 Codex 执行" | A Codex implementation prompt starting with `/goal`. |
| "整理给 Claude review" | A Claude review prompt with implementation summary, evidence, validations, PR/diff pointers, and known gaps. |
| "让 Codex 继续修复" | A Codex rework prompt starting with `/goal`, focused only on the review findings. |

Do not claim a handoff was sent. Say that the prompt is ready for the user to
copy.

## Manual Workflow

1. Codex investigates.
2. User asks to hand off to Claude.
3. Codex outputs a Claude prompt for manual paste.
4. Claude explores, challenges assumptions, and may create an OpenSpec proposal.
5. User asks to hand off to Codex.
6. Codex outputs a `/goal` implementation prompt for manual paste into Codex.
7. Codex implementation result is manually pasted back to Claude for review.
8. Claude either accepts, asks for targeted rework, or tells the user what
   decision is needed.

No step should require hidden state from another app. Each prompt must carry the
minimum context needed by the receiving agent.

## Prompt Layering

Prioritize content in this order:

1. **Current task focus**: what problem is being solved now and what decision is
   needed from the receiving agent.
2. **Project context**: repo name, current branch/worktree if known, OpenSpec
   change id, product version, PR URL, relevant files.
3. **Evidence**: command outputs, screenshots, logs, code paths, failing cases,
   and user-observed symptoms. Use concise bullets and file paths; do not paste
   huge logs unless they are the artifact being reviewed.
4. **Analysis labels**:
   - `[CONFIRMED]`: directly verified by command, code, UI, screenshot, or log.
   - `[LIKELY]`: reasoned interpretation that still needs review.
   - `[UNKNOWN]`: open question for the receiving agent.
   - `[USER-OBSERVED]`: reported by the user but not independently verified.
5. **Requested output**: exactly what the receiving agent should produce.
6. **Common constraints**: short and reusable; do not bury the current task under
   generic process text.

Never disguise a hypothesis as a fact. If the earlier agent is uncertain, make
that uncertainty visible.

## Claude Research Prompt

Use this when Codex has investigated and the user wants Claude to perform a
second-pass analysis or OpenSpec exploration.

The prompt should:

- Start with `/openspec:explore ` if the user wants Claude to use OpenSpec
  Explore. Keep one space after the command.
- Ask Claude to challenge Codex's conclusions instead of accepting them.
- Include the user problem, confirmed evidence, likely interpretations,
  unknowns, and desired proposal scope.
- Ask Claude to output either: `NO_CHANGE_NEEDED`, `NEEDS_MORE_INFO`, or an
  OpenSpec proposal plan with change id suggestion.

Use `templates/codex-to-claude-research.md` as the shape.

## Codex Implementation Prompt

Use this when Claude has produced an OpenSpec proposal or a concrete
implementation plan and the user wants Codex to execute.

Rules:

- The prompt must begin with `/goal` as the first characters.
- Tell Codex which repo/worktree/branch it should use, if known. If unknown,
  say "use the current Codex workspace" instead of inventing paths.
- Tell Codex to read `SCOPE.md`, `AGENTS.md`, OpenSpec proposal/design/tasks,
  and delta specs when they exist.
- Tell Codex to implement by task order, verify, commit/push/open PR only if the
  user expects that behavior.
- Tell Codex to finish with a copyable result summary for manual Claude review.
- Do not include automatic delivery or hidden-state instructions.

Use `templates/claude-to-codex-implementation.md` as the shape.

## Claude Review Prompt

Use this after Codex returns implementation results.

The prompt should ask Claude to:

- Review the diff/PR against OpenSpec and the stated task.
- Re-run or inspect validation evidence when available.
- Classify findings as `Blocking`, `High`, or `Minor`.
- Accept and recommend merge when no Blocking/High findings remain.
- For Blocking/High findings, produce a focused rework packet that can be pasted
  back to Codex.

Use `templates/codex-to-claude-review.md` as the shape.

## Codex Rework Prompt

Use this when Claude review finds issues and the user wants Codex to fix them.

Rules:

- The prompt must begin with `/goal`.
- Include only the review findings and necessary context.
- Ask Codex to fix the listed findings, run targeted verification, update
  evidence, and return a fresh result summary.

Use `templates/claude-to-codex-rework.md` as the shape.

## Response Format To User

When handing off, respond with:

````text
下面是给 <Claude/Codex> 的手动传递提示词，直接复制粘贴即可：

```text
<prompt>
```
````

If important context is missing, include a short "缺失信息" list before the
prompt. Do not stop unless the missing information would make the prompt unsafe
or misleading.

## Examples

Example 1: Codex to Claude research

```text
/openspec:explore 请基于以下材料做二次研究。不要默认接受 Codex 的结论；请找隐藏风险、反例和更好的方案。

目标: 修复图片编辑器裁剪预览错位。
重点: 本轮只评估裁剪画布、预览画布、导出结果三者的一致性。

[CONFIRMED] apps/web/.../crop-canvas.tsx 中预览缩放使用 display size。
[LIKELY] 导出路径可能使用 natural size,导致坐标换算不一致。
[UNKNOWN] 移动端 DPR 是否影响导出。

请输出:
1. 是否需要 OpenSpec 变更。
2. 建议 change id。
3. proposal/design/tasks 的要点。
```

Example 2: Claude to Codex implementation

```text
/goal 执行 OpenSpec 变更 image-crop-preview-alignment-v1-13。使用当前 Codex workspace。

读取:
1. SCOPE.md / AGENTS.md
2. openspec/changes/image-crop-preview-alignment-v1-13/proposal.md
3. design.md / tasks.md / specs/*/spec.md

按 tasks.md 顺序实现。完成后运行 typecheck/lint/test/build，并返回:
- 状态: READY_FOR_REVIEW / BLOCKED / FAILED
- 变更摘要
- 验证命令和结果
- PR URL 或本地分支
- 已知风险
```
