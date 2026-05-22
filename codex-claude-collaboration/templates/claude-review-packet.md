/openspec:explore 进入 OpenSpec Explore 模式。先不要实现代码，也不要急着生成 proposal。请先审查并深化下面这份 Codex 前期调研包。

Collaboration ID: {{COLLABORATION_ID}}
Codex packet path: {{PACKET_PATH}}
Claude session: {{CLAUDE_SESSION_ID}}
Workflow type: {{WORKFLOW_TYPE}}
Origin Codex session: {{ORIGIN_CODEX_SESSION_ID}}
Codex resume required: {{CODEX_RESUME_REQUIRED}}
Skill workflow version: V7
Product iteration version: {{ITERATION_VERSION}}
Previous product version: {{PREVIOUS_VERSION}}
Version file: {{VERSION_FILE}}
Changelog path: {{CHANGELOG_PATH}}
Desktop permission mode: BYPASS_PERMISSION
Desktop model policy: LATEST_OPUS
Desktop reasoning level: EXTRA_HIGH

## 你的任务

1. 把 Codex 的 `[CONFIRMED]` 当作待复核证据，而不是免审事实。
2. 挑战 `[LIKELY]` 推断，寻找反例、隐藏边界和更好的解释。
3. 把 `[UNKNOWN]` 转成需要实测/读码/产品决策的问题。
4. 对用户原始问题举一反三，检查相邻流程是否有类似风险。
5. 如果探索足够成熟，再创建或更新 OpenSpec proposal/design/tasks/specs。
6. 不要在 Explore 阶段实现代码。
7. 如果 `Workflow type` 是 `FULL_CODEX_FIRST`,后续把 proposal 交给 Codex 执行时必须复用 `Origin Codex session`,不要新建 Codex 任务线程。
8. 只有 `Workflow type` 是 `CLAUDE_FIRST` 且没有 Origin Codex session 时,才允许首次创建新的 Codex 任务线程。
9. proposal 和后续实现必须围绕 `Product iteration version` 组织;如果创建变更,需同步更新版本文件和 Changelog。
10. Claude Desktop 当前会话应保持 Bypass Permission、最新可见 Opus 模型、Extra High reasoning。

## Codex 调研包

{{PACKET_CONTENT}}

## 输出要求

- 先给审查结论：哪些 Codex 发现可信，哪些需要修正。
- 明确列出新增发现和隐藏风险。
- 区分 must-fix / should-fix / optional / out-of-scope。
- 如果要进入 proposal，说明 scope 边界和为什么现在足够清楚。
