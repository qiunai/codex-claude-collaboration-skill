请 review 下面的 Codex 实施结果。请不要默认接受 Codex 的结论,按证据和 diff 独立判断。

## 目标

{{GOAL}}

## 实施结果

- 状态: {{STATUS}}
- PR / 分支 / commit: {{PR_OR_BRANCH}}
- OpenSpec change: {{CHANGE}}
- 摘要: {{SUMMARY}}

## 修改范围

{{CHANGED_FILES}}

## 验证

{{VALIDATION}}

## 证据

{{EVIDENCE}}

## 已知风险 / 未完成项

{{KNOWN_GAPS}}

## 请 Claude 输出

1. 最终判定: ACCEPT / REWORK_REQUIRED / NEEDS_USER_DECISION。
2. Findings,按严重度分为:
   - `Blocking`: 会阻止合并的问题。
   - `High`: 高概率用户可见回归或明确 spec 不符。
   - `Minor`: 不阻止合并的小问题。
3. 如果需要 rework,给出可直接复制给 Codex 的 focused rework prompt。
4. 如果可以合并,列出合并前最后需要确认的事项。
