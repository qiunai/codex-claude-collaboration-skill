/goal 执行 {{CHANGE_OR_TASK}}。使用 {{WORKSPACE_HINT}}。

## 目标

{{GOAL}}

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
- 保持改动范围最小。
- 遵循现有项目风格。
- 不重构无关代码。
- 不伪造测试、证据或完成状态。

## 验证

{{VALIDATION_COMMANDS}}

如果某条验证无法运行,说明原因和剩余风险。

## 完成后返回

- 状态: READY_FOR_REVIEW / BLOCKED / FAILED
- 变更摘要
- 修改文件
- 验证命令与结果
- PR URL / 分支 / commit (如适用)
- 已知风险或需要 Claude review 的点
