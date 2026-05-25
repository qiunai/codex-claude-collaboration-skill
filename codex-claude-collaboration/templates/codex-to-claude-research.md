/openspec:explore 请基于以下材料做二次研究。不要默认接受 Codex 的结论；请找隐藏风险、反例和更好的方案。

## 目标

{{GOAL}}

## 本轮重点

{{FOCUS}}

## 项目上下文

- 项目: {{PROJECT}}
- 当前版本/迭代: {{VERSION}}
- 相关分支/PR: {{BRANCH_OR_PR}}
- 相关文件: {{FILES}}

## 证据与观察

{{EVIDENCE}}

请使用标签区分:
- `[CONFIRMED]`: 已由代码、命令、截图、日志或 UI 直接验证。
- `[LIKELY]`: 合理推断,但仍需复核。
- `[UNKNOWN]`: 需要你继续确认。
- `[USER-OBSERVED]`: 用户观察到,但尚未独立验证。

## Codex 初步判断

{{CODEX_ANALYSIS}}

## 请 Claude 输出

1. 你不同意或需要修正 Codex 判断的地方。
2. 隐藏风险、反例、边界条件。
3. 是否需要 OpenSpec 变更。
4. 如果需要,创建 OpenSpec proposal/design/tasks/spec。
5. 完成 proposal 后先 commit 并 push 到远端 proposal 分支(建议 `feat/<change-id>`)。
6. 返回: change id、远端分支名、commit、下一步给 Codex 的执行要点。
7. 如果信息不足,列出最少需要补充的信息。
