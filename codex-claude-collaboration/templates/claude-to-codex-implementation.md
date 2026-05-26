/goal 执行 OpenSpec 变更 {{CHANGE}}。Claude 已 commit+push proposal 分支 `{{REMOTE_PROPOSAL_BRANCH}}`;Codex 从 `origin/{{REMOTE_PROPOSAL_BRANCH}}` 创建自己的实现分支/worktree,完成后开/更 PR。

## 0. 分支合同

- `git fetch origin {{REMOTE_PROPOSAL_BRANCH}}`
- base: `origin/{{REMOTE_PROPOSAL_BRANCH}}`
- local: `codex/{{CHANGE}}`
- 如果 `openspec/changes/{{CHANGE}}/proposal.md` 不存在,停止并报 `BLOCKED: proposal branch missing artifacts`
- 完成后 push 实现分支并创建/更新 PR;不要直接改 main

## 1. 必读

1. SCOPE.md / AGENTS.md (如存在)
2. `openspec/changes/{{CHANGE}}/{proposal,design,tasks}.md`
3. `openspec/changes/{{CHANGE}}/specs/*/spec.md`

tasks.md 是 phase 与 task 真源;design/spec 是验收标准。本 prompt 只规定执行纪律。

## 2. 执行纪律

- 严守 SCOPE.md;不碰禁区,不扩 scope,不新增 spec 未声明能力/依赖。
- 第一个 foundation phase 串行完成并过 gate;后续独立 phase 可用最多 6 个子代理。
- 子代理只写代码/分析;主 Codex 独占 tasks.md、验证、git、PR。
- 每个 `[x]` 必须有真实证据:命令输出/截图/JSON/日志/导出文件等,路径写入 `reports/evidence/` 或 PR 摘要。
- 禁止假 `[x]`、吞错、空证据、force-push、amend、--no-verify、`git add -A`。

## 3. 验证与提交

- 按 phase 收口:验证 → selective `git add <files>` → commit → push。
- 默认 gate: `openspec validate {{CHANGE}}`;项目 typecheck/lint/test/build;其他以 design/tasks 为准。
- 失败先修;仍无法闭环则保持 `[ ]` 并写具体原因,列入 Known gaps。

## 4. 收尾

- 最终全量验证全绿后,提交收尾 commit。
- 创建/更新 PR 到 main,PR body 写 Summary / Validation / Tasks / Known gaps / Reviewer pointers。
- 最终只返回:
  - 状态: READY_FOR_REVIEW / BLOCKED / FAILED
  - PR URL、分支、commit
  - 变更摘要、验证结果、证据路径、Known gaps
