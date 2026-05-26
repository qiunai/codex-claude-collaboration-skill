请 review Codex 实施结果。不要默认接受结论;按 PR diff、OpenSpec、证据独立判断。

## 目标

{{GOAL}}

## 实施结果

- 状态: {{STATUS}}
- PR / 分支 / commit: {{PR_OR_BRANCH}}
- OpenSpec change: {{CHANGE}}
- 摘要: {{SUMMARY}}

## 验证与证据

{{VALIDATION_AND_EVIDENCE}}

## 已知风险 / 未完成项

{{KNOWN_GAPS}}

## Review 方法

按 `review-checklist.md` 审查: OpenSpec、SCOPE、foundation、实现 fidelity、tasks honesty、证据、git hygiene、无歧义路由。

## 请输出

1. OpenSpec validate: PASS / FAIL。
2. Findings 表: Blocking / High / Medium / Low,含位置和修法。
3. Task honesty: `[x]` 是否有真实 diff + 证据。
4. Verdict:
   - ACCEPT: spec valid、无 Blocking/High、证据可信、gate 绿。
   - REWORK_REQUIRED: 有必须修复问题,给出可复制给 Codex 的 focused rework prompt。
   - NEEDS_USER_DECISION: 范围/产品方向需用户判断。
