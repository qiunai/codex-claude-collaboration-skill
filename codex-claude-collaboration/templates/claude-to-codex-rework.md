/goal 修复 Claude review findings for {{CHANGE_OR_PR}}。只处理本 prompt 列出的 findings。

## 上下文

- PR / 分支 / commit: {{PR_OR_BRANCH}}
- OpenSpec change: {{CHANGE}}
- 当前状态: {{CURRENT_STATUS}}

## 必修 Findings

{{FINDINGS}}

## 修复要求

- 逐条修复 Blocking/High findings。
- Minor findings 只在低风险时顺手修,不要扩大范围。
- 保持改动范围最小。
- 更新或补充必要测试/证据。

## 验证

{{VALIDATION_COMMANDS}}

## 完成后返回

- 状态: READY_FOR_REVIEW / BLOCKED / FAILED
- 每条 finding 的处理结果
- 修改文件
- 验证命令与结果
- PR URL / 分支 / commit (如适用)
- 剩余风险
