/goal 执行 OpenSpec 变更 {{CHANGE}} (collaboration {{COLLABORATION_ID}}, execution {{EXECUTION_ID}})。识别为持久目标,自主运行直到完成或硬阻断。完成后必须写 implementation-result.json,通过 Claude Desktop + Computer Use 回传,最后打印哨兵。

═══════════════════════════════════════════════════════════════════
## 0. 工作环境
═══════════════════════════════════════════════════════════════════

- cwd: {{CODEX_WORKTREE}}
- local branch: {{LOCAL_BRANCH}}
- remote branch: feat/{{CHANGE}}
- state: {{STATE_PATH}}
- skill dir: {{SKILL_DIR}}
- Claude session id: {{CLAUDE_SESSION_ID}}
- Claude session JSONL: {{CLAUDE_SESSION_JSONL_PATH}}
- Claude session title: {{CLAUDE_SESSION_TITLE}}
- Desktop delivery lock: {{DESKTOP_DELIVERY_LOCK_DIR}}
- workflow type: {{WORKFLOW_TYPE}}
- origin Codex thread: {{ORIGIN_CODEX_THREAD_ID}}
- product iteration version: {{ITERATION_VERSION}}
- previous product version: {{PREVIOUS_VERSION}}
- version file: {{VERSION_FILE}}
- changelog path: {{CHANGELOG_PATH}}

调度说明:
- Claude 从 implementation worktree `{{CODEX_WORKTREE}}` 启动 Codex,本地分支为 `{{LOCAL_BRANCH}}`
- 该 worktree 必须基于 `origin/feat/{{CHANGE}}`,因为 Claude proposal artifacts 在这个分支中
- 模板渲染后的 prompt 必须以 `/goal` 作为第一行第一字符;任何标题、模板说明或 Markdown fence 都不得出现在 `/goal` 前

工作流来源:
- `FULL_CODEX_FIRST`:用户先在 Codex 探索,Claude 后续生成 proposal。此时原始
  Codex thread/worktree 可能基于 main,所以实现必须以当前 `{{CODEX_WORKTREE}}`
  的 proposal 分支内容为准,不能假设原始探索 worktree 里已有 proposal。
- `CLAUDE_FIRST`:用户先在 Claude 探索并生成 proposal,Codex 任务应直接从 Claude
  推送的 proposal 分支 worktree 创建。

硬约束:
- 当前 worktree 必须来自 `origin/feat/{{CHANGE}}`;如果不是,先停止并让 Claude 修复调度,不要在错误 worktree 上实现
- 本任务必须由 Claude 通过 `codex-companion task ... --full-access` 启动,对应 Codex sandbox `danger-full-access`;如果提交、推送、写 runtime state 或 Desktop lock 被 sandbox 拦截,这是调度错误,不要假装完成
- 不在原始 Codex 探索 worktree 中实现;Full Codex-first 的探索 worktree 可能只是 main 基线,不包含 Claude proposal
- 不 checkout 被 worktree 锁定的 `feat/{{CHANGE}}`;本地实现分支保持 rebased 到 `origin/feat/{{CHANGE}}`
- 不 force-push,不 amend,不 --no-verify
- 所有推送使用 `git push origin HEAD:feat/{{CHANGE}}`
- 禁止使用 Claude CLI resume/print、Agent SDK、GitHub Action、shell 方式给 Claude 发消息
- Codex -> Claude 回传只能用 Computer Use 操作 Claude Desktop

═══════════════════════════════════════════════════════════════════
## 1. 必读文档
═══════════════════════════════════════════════════════════════════

先确认当前 cwd 中存在 `openspec/changes/{{CHANGE}}/proposal.md`。如果不存在,
说明 Claude proposal 没有进入这个实现 worktree;不要猜测或从旧探索上下文补写,
直接写 `implementation-result.json` 为 `BLOCKED` 并说明 proposal branch/worktree 错误。

1. SCOPE.md (如存在)
2. openspec/changes/{{CHANGE}}/proposal.md
3. openspec/changes/{{CHANGE}}/design.md
4. openspec/changes/{{CHANGE}}/tasks.md
5. openspec/changes/{{CHANGE}}/specs/*/spec.md

按 tasks.md phase 顺序执行。第一个基建 phase 必须串行完成并验证后,才允许并行子代理。

═══════════════════════════════════════════════════════════════════
## 2. 验证与证据
═══════════════════════════════════════════════════════════════════

- 每个勾 `[x]` 的 task 必须有真实、非空、对得上的证据登记到 `reports/evidence/`
- 收尾必须生成 `reports/evidence/{{CHANGE}}/SELFCHECK.log`
- 需要跑:
  - openspec validate {{CHANGE}} --strict
  - pnpm --filter @pindo/web typecheck
  - pnpm --filter @pindo/web lint
  - pnpm --filter @pindo/web test
  - pnpm --filter @pindo/web build
  - pnpm audit:mobile (若涉及移动端)

禁止假 `[x]`,禁止空截图,禁止注释断言,禁止吞错伪造通过。

═══════════════════════════════════════════════════════════════════
## 3. 提交、推送、PR
═══════════════════════════════════════════════════════════════════

- 逐单元 `git add <file>`,禁止 `git add -A`
- commit body 写:
  `Developed by sub-agents (GPT-5.5 high), integrated by orchestrator`
- 中途同步:
  `git fetch origin && git rebase origin/feat/{{CHANGE}}`
- 推送:
  `git push origin HEAD:feat/{{CHANGE}}`
- 若已有 PR,记录 URL;否则创建 PR:
  `gh pr create --base main --head feat/{{CHANGE}} --title "feat: {{CHANGE}}" ...`

═══════════════════════════════════════════════════════════════════
## 4. implementation-result.json
═══════════════════════════════════════════════════════════════════

回传前写 `.codex-claude-collaboration/implementation-result.json`,必须是合法 JSON:

```json
{
  "schema_version": "8.0",
  "collaboration_id": "{{COLLABORATION_ID}}",
  "execution_id": "{{EXECUTION_ID}}",
  "change": "{{CHANGE}}",
  "round": 1,
  "status": "READY_FOR_REVIEW",
  "local_branch": "{{LOCAL_BRANCH}}",
  "remote_branch": "feat/{{CHANGE}}",
  "head_commit": "0000000000000000000000000000000000000000",
  "pr_url": "",
  "summary": "",
  "verification": [],
  "evidence_manifest": "",
  "tasks_total": 0,
  "tasks_done": 0,
  "tasks_skipped": [],
  "known_gaps": [],
  "reason": ""
}
```

`status` 只能是 `READY_FOR_REVIEW` / `FAILED` / `BLOCKED`。写完必须运行:
`jq . .codex-claude-collaboration/implementation-result.json`

═══════════════════════════════════════════════════════════════════
## 5. Desktop Delivery (唯一回传方式)
═══════════════════════════════════════════════════════════════════

回传消息:

```text
codex-claude DONE {{COLLABORATION_ID}} round 1: <STATUS> — <PR_URL_OR_NONE>
Summary: <一句话中文总结>
```

步骤:

1. 确认 `{{STATE_PATH}}` 存在且是合法 JSON。这个 state 必须由 Claude 在启动 Codex 前生成,正常情况下不应缺失。
   如果缺失,只允许用本 prompt 中的明确字段恢复同一路径的 state,然后继续 guard;不要发明 collaboration id/session/worktree:
   ```bash
   if [ ! -s "{{STATE_PATH}}" ]; then
     node "{{SKILL_DIR}}/scripts/state.mjs" init \
       --file "{{STATE_PATH}}" \
       --collaboration-id "{{COLLABORATION_ID}}" \
       --execution-id "{{EXECUTION_ID}}" \
       --change "{{CHANGE}}" \
       --round 1 \
       --mode CODEX_IMPLEMENT \
       --claude-session-id "{{CLAUDE_SESSION_ID}}" \
       --claude-session-jsonl-path "{{CLAUDE_SESSION_JSONL_PATH}}" \
       --claude-session-title "{{CLAUDE_SESSION_TITLE}}" \
       --claude-worktree "{{CLAUDE_WORKTREE}}" \
       --codex-worktree "{{CODEX_WORKTREE}}" \
       --local-branch "{{LOCAL_BRANCH}}" \
       --remote-branch "feat/{{CHANGE}}" \
       --workflow-type "{{WORKFLOW_TYPE}}" \
       --origin-codex-thread-id "{{ORIGIN_CODEX_THREAD_ID}}" \
       --iteration-version "{{ITERATION_VERSION}}" \
       --previous-version "{{PREVIOUS_VERSION}}" \
       --version-file "{{VERSION_FILE}}" \
       --changelog-path "{{CHANGELOG_PATH}}"
   fi
   ```
   如果恢复失败,写 `implementation-result.json` 为 `BLOCKED`,原因写明 state 缺失且无法恢复,不要打开 Claude Desktop。
2. 先运行 phase guard,确认当前是 implementation result 回传阶段,不是初步探索包发送阶段:
   ```bash
   node "{{SKILL_DIR}}/scripts/phase-guard.mjs" \
     --state "{{STATE_PATH}}" \
     --phase implementation-result \
     --result-path "{{CODEX_WORKTREE}}/.codex-claude-collaboration/implementation-result.json"
   ```
   guard 不通过时绝对不要打开或输入 Claude Desktop。
3. 重新读取 `{{STATE_PATH}}` 和 `{{CLAUDE_SESSION_JSONL_PATH}}`,确认 JSONL 第一行的 `sessionId` 是 `{{CLAUDE_SESSION_ID}}`。如果 `customTitle` 与模板标题不同,以 JSONL 当前 `customTitle` 为准。
4. 获取 Desktop delivery lock:
   ```bash
   node "{{SKILL_DIR}}/scripts/desktop-delivery-lock.mjs" acquire \
     --lock-dir "{{DESKTOP_DELIVERY_LOCK_DIR}}" \
     --owner "{{COLLABORATION_ID}}.round-1" \
     --wait-seconds 600 \
     --poll-ms 1000 \
     --stale-seconds 900
   ```
   保存返回的 `token`。这是 FIFO 队列锁:如果前面已有发送者正在操作 Claude Desktop,脚本会等待并每 1 秒复查;前一个释放后按队列顺序获得锁。10 分钟仍拿不到锁时,不要碰 Claude Desktop,写 result status `BLOCKED` 并说明 lock timeout。
5. 使用 Computer Use 打开 Claude Desktop。
6. 在左侧会话列表中根据 Claude session title 定位并点击目标会话。优先点击 accessibility tree 中精确匹配标题的按钮;不要优先用裸坐标。
7. 在主内容区域验证至少一个强标识存在: `{{COLLABORATION_ID}}` / `{{EXECUTION_ID}}` / `{{CHANGE}}` / PR URL / PR number。只靠标题不够。
8. 确认底部 Prompt 输入框属于该主内容区域。
9. 输入上方消息并点击 Send。
10. 更新 state:
   ```bash
   node "{{SKILL_DIR}}/scripts/state.mjs" update \
     --file "{{STATE_PATH}}" \
     --status DESKTOP_DELIVERY_SENT \
     --implementation-result-path "{{CODEX_WORKTREE}}/.codex-claude-collaboration/implementation-result.json" \
     --pr-url "<PR_URL_OR_NONE>" \
     --desktop-delivery-note "Claude Desktop title verified; strong marker verified; message sent"
   ```
11. 释放锁:
   ```bash
   node "{{SKILL_DIR}}/scripts/desktop-delivery-lock.mjs" release \
     --lock-dir "{{DESKTOP_DELIVERY_LOCK_DIR}}" \
     --token "<TOKEN>"
   ```

如果会话定位或强标识校验失败,或出现多个同名会话且无法用强标识唯一消歧,绝对不要发送到当前窗口。更新 state 为 `DELIVERY_TARGET_UNKNOWN` 或写 result status `BLOCKED` 后停止。

═══════════════════════════════════════════════════════════════════
## 6. 哨兵
═══════════════════════════════════════════════════════════════════

完成 implementation-result.json + Desktop delivery 后,最终回复最后一行必须且只能是:

[CODEX_GOAL_COMPLETE]
