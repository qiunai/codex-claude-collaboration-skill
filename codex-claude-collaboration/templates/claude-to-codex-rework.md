/goal 修复 Claude review findings for {{CHANGE_OR_PR}}。只处理本 prompt 列出的 findings。

## 上下文

- PR / 分支 / commit: {{PR_OR_BRANCH}}
- OpenSpec change: {{CHANGE}}
- 当前状态: {{CURRENT_STATUS}}
- 先 fetch PR 分支,在当前实现分支上修复;完成后 commit、push,保持同一个 PR 更新

## 必修 Findings

{{FINDINGS}}

## 修复要求

- 逐条修复 Blocking/High findings。
- Minor findings 只在低风险时顺手修,不要扩大范围。
- 可用最多 6 个子代理并行分析/修复独立问题;主 Codex 负责 git、验证、PR。
- 保持改动范围最小。
- 更新或补充必要测试/证据。
- 禁止 force-push、amend、--no-verify。

## 验证

{{VALIDATION_COMMANDS}}

## 完成后返回

- 状态: READY_FOR_REVIEW / BLOCKED / FAILED
- 每条 finding 的处理结果
- 修改文件
- 验证命令与结果
- PR URL / 分支 / commit
- 剩余风险
