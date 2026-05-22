# state/ — Codex-Claude Collaboration V7

Each active collaboration writes one `<collaboration_id>.json`.

Important fields:

- `schema_version` — `7.0`
- `collaboration_id` — stable id for the whole Codex/Claude loop
- `execution_id` — stable id for the Codex implementation run
- `mode` — `CODEX_EXPLORE` / `SEND_TO_CLAUDE` / `CLAUDE_EXPLORE` / `CODEX_IMPLEMENT`
- `change`, `round`
- `status` — `RUNNING` / `CODEX_EXPLORING` / `SENT_TO_CLAUDE` /
  `CLAUDE_EXPLORING` / `PROPOSED` / `SENT_TO_CODEX` /
  `DESKTOP_DELIVERY_SENT` / `READY_FOR_REVIEW` / `REWORK` / `COMPLETED` /
  `FAILED` / `BLOCKED` / `DELIVERY_TARGET_UNKNOWN`
- `claude_session_id`
- `claude_session_jsonl_path`
- `claude_session_title`
- `claude_worktree`
- `codex_worktree`
- `project_name`, `git_project_path`, `base_branch`
- `desktop_session_title`, `desktop_group_name`
- `iteration_version`, `previous_version`, `version_file`, `changelog_path`
- `desktop_permission_mode` — must be `BYPASS_PERMISSION` for new Claude sessions
- `desktop_model_policy` — must be `LATEST_OPUS`
- `desktop_reasoning_level` — must be `EXTRA_HIGH`
- `workflow_type` — `FULL_CODEX_FIRST` / `CLAUDE_FIRST`
- `origin_codex_thread_id` — exact broker thread id for
  `task --resume-thread <id>`
- `origin_codex_session_id` — optional legacy/audit label when a tool exposes
  a separate session id; not used for broker resume
- `codex_resume_required` — true when Claude must preserve Codex continuity
- `codex_thread_id`, `codex_job_id`
- `codex_explore_summary_path` — Codex research packet path
- `claude_packet_path` — rendered prompt sent to Claude
- `delivery_mode` — `desktop_computer_use`
- `desktop_delivery_sent_at`, `desktop_delivery_note`
- `implementation_result_path`
- `last_known_pr_url`
- `merge_commit`

`desktop-delivery.lock/` is a cooperative FIFO lock directory for all Claude
Desktop Computer Use sends. Each waiter writes a ticket under `queue/`; the
oldest ticket acquires `active.lock`; release removes `active.lock` so the next
ticket acquires on its next poll.

Use `../scripts/state.mjs`; do not hand-edit active state files unless doing
manual recovery.
