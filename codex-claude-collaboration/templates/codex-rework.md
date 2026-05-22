# Codex Rework Prompt Template (V7 — broker continuity)

Claude renders this for round 2 or 3 and sends it through the broker from the
same implementation worktree. Supported broker continuity is
`codex-companion task --resume-last --write --json` when the broker's most
recent thread is known to be the implementation thread. Exact-thread broker
resume is not supported. If `--resume-last` cannot be trusted, start a fresh
task from `{{CODEX_WORKTREE}}` and keep the previous `codex_thread_id` in state
as provenance.

```
/goal Round {{ROUND}} rework: address Claude REVIEW findings for collaboration {{COLLABORATION_ID}}.

═══════════════════════════════════════════════════════════════════
## 状态
═══════════════════════════════════════════════════════════════════

- cwd: {{CODEX_WORKTREE}}
- branch: {{LOCAL_BRANCH}}
- change: {{CHANGE}}
- collaboration id: {{COLLABORATION_ID}}
- execution id: {{EXECUTION_ID}}
- state: {{STATE_PATH}}
- Claude session id: {{CLAUDE_SESSION_ID}}
- Claude session JSONL: {{CLAUDE_SESSION_JSONL_PATH}}
- Claude session title: {{CLAUDE_SESSION_TITLE}}
- Desktop delivery lock: {{DESKTOP_DELIVERY_LOCK_DIR}}

先确认当前 cwd 中存在 `openspec/changes/{{CHANGE}}/proposal.md`。如果不存在,
说明 rework 没有在 proposal implementation worktree 中运行;不要修错目录,
直接报告 `BLOCKED` 并说明 worktree 错误。

只修下方 findings。不开新 PR,只 push 到 `feat/{{CHANGE}}`。

═══════════════════════════════════════════════════════════════════
## Findings
═══════════════════════════════════════════════════════════════════

{{FINDINGS}}

═══════════════════════════════════════════════════════════════════
## 工作流
═══════════════════════════════════════════════════════════════════

1. 逐条修复 findings。
2. 为每个闭环 finding 留真实证据,必要时写 `reports/evidence/{{CHANGE}}/SELFCHECK.round-{{ROUND}}.log`。
3. 重跑相关验证和全量 gate:
   - openspec validate {{CHANGE}} --strict
   - pnpm --filter @pindo/web typecheck
   - pnpm --filter @pindo/web lint
   - pnpm --filter @pindo/web test
   - pnpm --filter @pindo/web build
   - pnpm audit:mobile (若适用)
4. commit message 引用 finding id。
5. `git fetch origin && git rebase origin/feat/{{CHANGE}}`
6. `git push origin HEAD:feat/{{CHANGE}}`

═══════════════════════════════════════════════════════════════════
## 重写 implementation-result.json
═══════════════════════════════════════════════════════════════════

覆盖 `.codex-claude-collaboration/implementation-result.json`,字段同 round 1 schema,但:

- `"schema_version": "7.0"`
- `"round": {{ROUND}}`
- `"summary"` 写本轮修复总结
- `"verification"` 写本轮实际跑过的命令

运行 `jq . .codex-claude-collaboration/implementation-result.json`。

═══════════════════════════════════════════════════════════════════
## Desktop Delivery
═══════════════════════════════════════════════════════════════════

禁止 Claude CLI resume/print、Agent SDK 或 shell 方式给 Claude 发消息。唯一回传方式是 Computer Use 操作 Claude Desktop。

消息格式:

```text
codex-claude DONE {{COLLABORATION_ID}} round {{ROUND}}: <STATUS> — <PR_URL_OR_NONE>
Summary: <一句话中文总结本轮修复>
```

发送前必须:

1. 先运行 phase guard,确认当前是 implementation result 回传阶段,不是初步探索包发送阶段:
   ```bash
   node "{{SKILL_DIR}}/scripts/phase-guard.mjs" \
     --state "{{STATE_PATH}}" \
     --phase implementation-result \
     --result-path "{{CODEX_WORKTREE}}/.codex-claude-collaboration/implementation-result.json"
   ```
   guard 不通过时绝对不要打开或输入 Claude Desktop。
2. 读取并校验 `{{CLAUDE_SESSION_JSONL_PATH}}` 的 `sessionId={{CLAUDE_SESSION_ID}}`。
3. 获取 `{{DESKTOP_DELIVERY_LOCK_DIR}}` FIFO 锁:
   ```bash
   node "{{SKILL_DIR}}/scripts/desktop-delivery-lock.mjs" acquire \
     --lock-dir "{{DESKTOP_DELIVERY_LOCK_DIR}}" \
     --owner "{{COLLABORATION_ID}}.round-{{ROUND}}" \
     --wait-seconds 600 \
     --poll-ms 1000 \
     --stale-seconds 900
   ```
   前方有其他发送者时会等待;10 分钟仍失败则不要操作 Claude Desktop,写明 lock timeout。
4. 用 Computer Use 打开 Claude Desktop。
5. 按 Claude session title 定位会话。优先点击 accessibility tree 中精确匹配标题的按钮;不要优先用裸坐标。
6. 在主内容区验证 `{{COLLABORATION_ID}}` / `{{EXECUTION_ID}}` / `{{CHANGE}}` / PR URL 等强标识。
7. 确认输入框属于该会话后再发送。
8. state 更新为 `DESKTOP_DELIVERY_SENT`。
9. 释放锁。

定位或校验失败,或出现多个同名会话且无法唯一消歧时不要发送,写明原因并停止。

═══════════════════════════════════════════════════════════════════
## 哨兵
═══════════════════════════════════════════════════════════════════

最终回复最后一行必须且只能是:

[CODEX_GOAL_COMPLETE]
```
