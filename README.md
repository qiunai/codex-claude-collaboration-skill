# Codex-Claude Collaboration Skill

Manual prompt handoff between Codex and Claude.

V9 removes automated agent-to-agent delivery. The skill only helps an agent
prepare clean prompts that the user copies between Codex and Claude.

## Purpose

Use Codex and Claude as two independent reviewers:

1. Codex investigates with local tools and summarizes evidence.
2. The user asks Codex to prepare a prompt for Claude.
3. Claude challenges the analysis and may create an OpenSpec proposal.
4. Claude commits and pushes the proposal branch.
5. The user asks Claude or Codex to prepare a prompt for Codex execution.
6. Codex fetches that remote branch, implements in its own branch/worktree, then
   commits, pushes, and opens or updates a PR.
7. The user copies the result back to Claude for review.

The goal is better judgment through cross-review, not automatic message passing.

## Install

Install the skill for Codex and/or Claude:

```bash
git clone https://github.com/qiunai/codex-claude-collaboration-skill.git
cd codex-claude-collaboration-skill

mkdir -p ~/.codex/skills ~/.claude/skills
rm -rf ~/.codex/skills/codex-claude-collaboration
rm -rf ~/.claude/skills/codex-claude-collaboration
cp -R codex-claude-collaboration ~/.codex/skills/
cp -R codex-claude-collaboration ~/.claude/skills/
```

Restart the current agent session if its skill list was already loaded.

## OpenSpec

This workflow works best when project changes are managed with OpenSpec.
OpenSpec artifacts give Codex and Claude a shared contract:

- `proposal.md`: intent and scope.
- `design.md`: technical approach.
- `tasks.md`: implementation phases and verification.
- `specs/*/spec.md`: requirements and scenarios.

Links:

- Website: <https://openspec.dev/>
- GitHub: <https://github.com/Fission-AI/OpenSpec>
- Installation docs: <https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md>

Install:

```bash
npm install -g @fission-ai/openspec@latest
```

## Manual Workflows

### 1. Codex First

Use when the user starts in Codex.

1. User asks Codex to investigate a problem.
2. Codex gathers evidence and explains what is confirmed, likely, and unknown.
3. User says: "交给 Claude 进行二次研究".
4. Codex returns a copy-paste Claude prompt, usually starting with
   `/openspec:explore `.
5. User pastes it into Claude.
6. Claude challenges the analysis and prepares proposal/design/tasks/specs if
   needed.
7. Claude commits proposal artifacts and pushes the proposal branch.
8. User says: "交给 Codex 执行".
9. A copy-paste Codex prompt is prepared. It must start with `/goal` and name
   the remote proposal branch.

### 2. Claude First

Use when the user starts in Claude.

1. Claude explores and writes a proposal or implementation plan.
2. Claude commits and pushes the proposal branch.
3. User asks for a Codex execution prompt.
4. The prompt starts with `/goal`, names the remote proposal branch, and tells
   Codex what to read, implement, verify, commit, push, PR, and return.
5. User pastes the Codex result back to Claude for review.

### 3. Review And Rework

1. Codex returns implementation status, validations, PR/diff pointers, and known
   risks.
2. User asks to prepare Claude review.
3. Claude classifies findings as `Blocking`, `High`, or `Minor`.
4. If rework is needed, user asks to prepare a Codex rework prompt.
5. Rework prompt starts with `/goal` and includes only the findings to fix plus
   necessary context.

## Prompt Principles

- Put the current task first.
- Keep common constraints short.
- Use evidence labels:
  `[CONFIRMED]`, `[LIKELY]`, `[UNKNOWN]`, `[USER-OBSERVED]`.
- Do not present guesses as facts.
- Do not paste giant logs unless they are the artifact being reviewed.
- Ask for a specific output format.
- For Codex execution or rework, the prompt must begin with `/goal`.
- For Codex implementation, include the pushed remote proposal branch and require
  Codex to create/update a PR.
- Keep handoff prompts under 4000 characters unless the user explicitly asks for
  a full archival prompt.

## Output Format

When preparing a handoff, the agent should respond with a copyable prompt:

````text
下面是给 <Claude/Codex> 的手动传递提示词，直接复制粘贴即可：

```text
<prompt>
```
````

If important information is missing, add a short "缺失信息" list before the
prompt. If the missing information changes the safety or meaning of the task,
ask the user first.

## Example: Codex To Claude

```text
/openspec:explore 请基于以下材料做二次研究。不要默认接受 Codex 的结论；请找隐藏风险、反例和更好的方案。

项目: Bean Boss
主题: 图片编辑器裁剪预览和导出不一致

本轮重点:
- 检查 crop canvas、preview canvas、export pipeline 的坐标换算是否一致。
- 判断是否需要 OpenSpec 变更。

证据:
- [CONFIRMED] apps/web/.../crop-canvas.tsx 使用显示尺寸计算交互坐标。
- [LIKELY] export pipeline 可能使用 natural size,需要核对 scale 转换。
- [UNKNOWN] DPR 和移动端 viewport 是否影响导出结果。

请输出:
1. 风险和反例。
2. 是否需要 proposal。
3. 如需要,建议 change id 和 proposal/design/tasks 要点。
```

## Example: Claude To Codex

```text
/goal 执行 OpenSpec 变更 image-crop-export-alignment-v1-13。Claude 已 commit 并 push proposal 分支: feat/image-crop-export-alignment-v1-13。Codex 从 origin/feat/image-crop-export-alignment-v1-13 创建自己的实现分支,完成后提交 PR。

目标:
- 按 OpenSpec proposal/design/tasks 实现裁剪预览与导出一致性。

读取:
1. SCOPE.md / AGENTS.md
2. openspec/changes/image-crop-export-alignment-v1-13/proposal.md
3. openspec/changes/image-crop-export-alignment-v1-13/design.md
4. openspec/changes/image-crop-export-alignment-v1-13/tasks.md
5. openspec/changes/image-crop-export-alignment-v1-13/specs/*/spec.md

执行:
- fetch proposal 分支,不要从 main 直接实现。
- 按 tasks.md 顺序实现。
- 先串行完成第一个基础 phase;后续独立 phase 可用最多 6 个子代理,主 Codex 负责 git/验证/PR。
- 从远端 proposal 分支创建自己的实现分支或 worktree。
- 保持改动范围最小。
- 运行相关验证: openspec validate、typecheck、lint、test、build。
- 完成后 commit、push、创建或更新 PR。

完成后返回:
- 状态: READY_FOR_REVIEW / BLOCKED / FAILED
- 变更摘要
- 验证命令与结果
- PR URL 或本地分支
- 已知风险和需要 Claude review 的点
```
