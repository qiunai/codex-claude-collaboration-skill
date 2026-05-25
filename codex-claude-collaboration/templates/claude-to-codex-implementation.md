/goal 执行 {{CHANGE_OR_TASK}}。Claude 已提交并 push proposal 分支: {{REMOTE_PROPOSAL_BRANCH}}。Codex 必须从该远端分支创建自己的实现分支/worktree,完成后提交 PR。

## 目标

{{GOAL}}

## 分支合同

- fetch: `git fetch origin {{REMOTE_PROPOSAL_BRANCH}}`
- base: `origin/{{REMOTE_PROPOSAL_BRANCH}}`
- local: `codex/{{CHANGE_ID}}`
- push/PR: push 到远端实现分支并创建或更新 PR
- 如果 proposal 文件不在该分支,停止并报告 BLOCKED

## 必读

{{READING_LIST}}

如果项目使用 OpenSpec,优先读取:
1. SCOPE.md / AGENTS.md (如存在)
2. openspec/changes/<change>/proposal.md
3. openspec/changes/<change>/design.md
4. openspec/changes/<change>/tasks.md
5. openspec/changes/<change>/specs/*/spec.md

## 实施要求

{{IMPLEMENTATION_REQUIREMENTS}}

默认约束:
- 先串行完成第一个基础 phase;后续独立 phase 可用最多 6 个子代理。
- 子代理只写代码/分析;主 Codex 负责 git、任务状态、验证、PR。
- 保持改动范围最小。
- 遵循现有项目风格。
- 不重构无关代码。
- 不伪造测试、证据或完成状态。
- 禁止 force-push、amend、--no-verify。

## 验证

{{VALIDATION_COMMANDS}}

如果某条验证无法运行,说明原因和剩余风险。

## 完成后返回

- 状态: READY_FOR_REVIEW / BLOCKED / FAILED
- 变更摘要
- 修改文件
- 验证命令与结果
- PR URL / 分支 / commit
- 已知风险或需要 Claude review 的点
