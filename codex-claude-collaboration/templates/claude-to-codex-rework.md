/goal 按 Claude review 修复 OpenSpec 变更 {{CHANGE}}。更新现有 PR `{{PR_URL}}`,不开新 PR。

## 0. 分支 / PR

- PR: {{PR_URL}}
- fetch 并 checkout 该 PR 分支;push 即更新同一个 PR
- 禁止新 PR、force-push、amend、--no-verify、`git add -A`

## 1. 必读

SCOPE.md / AGENTS.md;`openspec/changes/{{CHANGE}}/{proposal,design,tasks}.md`;specs/*。
只修 review findings,保留已通过产出,不要重做或回退。

## 2. 必修 Findings

{{FINDINGS}}

## 3. 修复纪律

- 逐条闭环 Blocking/High/Medium;Low 只在低风险时处理。
- 可用最多 6 个子代理修独立问题;主 Codex 独占 tasks.md、验证、git、PR。
- 每个新勾 `[x]` 必须有真实证据;证据路径写入 `reports/evidence/` 或 PR 摘要。
- 3 次仍修不好则保持 `[ ]`,写具体原因并列入 Known gaps;禁止假完成。

## 4. 验证 / 提交 / 推送

- 跑相关 gate: `openspec validate {{CHANGE}}`;项目 typecheck/lint/test/build;finding 专属验证。
- selective stage,按 finding/task commit,push 到现有 PR 分支。
- 返回: READY_FOR_REVIEW / BLOCKED / FAILED,PR URL,commit,逐条 finding 处理结果,验证和剩余风险。
