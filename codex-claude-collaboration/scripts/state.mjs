#!/usr/bin/env node
// codex-claude-collaboration v7 state helper.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

const VALID_STATUSES = new Set([
  "RUNNING",
  "CODEX_EXPLORING",
  "SENT_TO_CLAUDE",
  "CLAUDE_EXPLORING",
  "PROPOSED",
  "SENT_TO_CODEX",
  "DESKTOP_DELIVERY_SENT",
  "READY_FOR_REVIEW",
  "REWORK",
  "COMPLETED",
  "FAILED",
  "BLOCKED",
  "DELIVERY_TARGET_UNKNOWN",
]);

const VALID_MODES = new Set([
  "CODEX_EXPLORE",
  "SEND_TO_CLAUDE",
  "CLAUDE_EXPLORE",
  "CODEX_IMPLEMENT",
  "REWORK",
  "REVIEW",
]);

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  state.mjs init --file <path> --collaboration-id <id> --execution-id <id> --change <change> --round <n> [--mode <mode>] [--force true] \\
    --claude-session-id <id> --claude-session-jsonl-path <path> --claude-session-title <title> \\
    --claude-worktree <path> --codex-worktree <path> --local-branch <branch> --remote-branch <branch> \\
    [--project-name <name>] [--git-project-path <path>] [--base-branch main] \\
    [--desktop-session-title <title>] [--desktop-group-name <name>] [--iteration-version <version>] \\
    [--previous-version <version>] [--version-file <path>] [--changelog-path <path>] \\
    [--desktop-permission-mode BYPASS_PERMISSION] [--desktop-model-policy LATEST_OPUS] \\
    [--desktop-reasoning-level EXTRA_HIGH] \\
    [--workflow-type FULL_CODEX_FIRST|CLAUDE_FIRST] [--origin-codex-session-id <id>]
  state.mjs update --file <path> [--status <status>] [--round <n>] [--codex-thread-id <id>] \\
    [--codex-job-id <id>] [--pr-url <url>] [--merge-commit <sha>] [--implementation-result-path <path>] \\
    [--desktop-delivery-note <text>] [--codex-explore-summary-path <path>] [--claude-packet-path <path>] \\
    [--iteration-version <version>] [--previous-version <version>] [--version-file <path>] [--changelog-path <path>] \\
    [--desktop-permission-mode BYPASS_PERMISSION] [--desktop-model-policy LATEST_OPUS] \\
    [--desktop-reasoning-level EXTRA_HIGH] \\
    [--workflow-type FULL_CODEX_FIRST|CLAUDE_FIRST] [--origin-codex-session-id <id>]
  state.mjs get --file <path>`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) usage(`unexpected argument: ${item}`);
    const key = item.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) usage(`missing value for --${key}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

function truthy(value) {
  return value === "1" || value === "true" || value === "yes";
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    usage(`cannot read valid JSON from ${file}: ${error.message}`);
  }
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  const tmp = join(dirname(file), `.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.${file.split("/").pop()}.tmp`);
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, file);
}

function requireArg(args, key) {
  const value = args[key];
  if (value === undefined || value === "") usage(`--${key} is required`);
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

function setStatus(state, status) {
  if (!VALID_STATUSES.has(status)) usage(`bad status ${status}; expected one of ${[...VALID_STATUSES].join(", ")}`);
  state.status = status;
  state.updated_at = nowIso();
  if (status === "DESKTOP_DELIVERY_SENT") {
    state.desktop_delivery_sent_at = state.updated_at;
    state.delivery_mode = "desktop_computer_use";
  }
  if (status === "SENT_TO_CLAUDE") state.sent_to_claude_at = state.updated_at;
  if (status === "SENT_TO_CODEX") state.sent_to_codex_at = state.updated_at;
  if (status === "COMPLETED") state.completed_at = state.updated_at;
  if (status === "FAILED") state.failed_at = state.updated_at;
  if (status === "BLOCKED") state.blocked_at = state.updated_at;
  if (status === "DELIVERY_TARGET_UNKNOWN") state.delivery_target_unknown_at = state.updated_at;
}

function validatePhaseState(state) {
  if (!VALID_MODES.has(state.mode)) {
    usage(`bad mode ${state.mode}; expected one of ${[...VALID_MODES].join(", ")}`);
  }
  if (!["FULL_CODEX_FIRST", "CLAUDE_FIRST"].includes(state.workflow_type)) {
    usage("workflow_type must be FULL_CODEX_FIRST or CLAUDE_FIRST");
  }
  if (state.status === "SENT_TO_CLAUDE") {
    if (!["CODEX_EXPLORE", "SEND_TO_CLAUDE"].includes(state.mode)) {
      usage("SENT_TO_CLAUDE requires mode CODEX_EXPLORE or SEND_TO_CLAUDE");
    }
    if (!state.codex_explore_summary_path || !state.claude_packet_path) {
      usage("SENT_TO_CLAUDE requires codex_explore_summary_path and claude_packet_path");
    }
    if (state.implementation_result_path) {
      usage("SENT_TO_CLAUDE must not carry implementation_result_path");
    }
    if (!state.project_name || !state.git_project_path) {
      usage("SENT_TO_CLAUDE requires project_name and git_project_path");
    }
    if (state.base_branch !== "main") {
      usage("SENT_TO_CLAUDE requires base_branch=main");
    }
    if (!state.desktop_session_title || !/^V[0-9]+(?:\.[0-9]+)*\s+\S/.test(state.desktop_session_title)) {
      usage("SENT_TO_CLAUDE requires desktop_session_title like 'V7 short summary' or 'V1.0 short summary'");
    }
    if (!state.desktop_group_name) {
      usage("SENT_TO_CLAUDE requires desktop_group_name");
    }
    if (!state.iteration_version || !/^V[0-9]+(?:\.[0-9]+)*$/.test(state.iteration_version)) {
      usage("SENT_TO_CLAUDE requires iteration_version like V1.13");
    }
    if (state.desktop_permission_mode !== "BYPASS_PERMISSION") {
      usage("SENT_TO_CLAUDE requires desktop_permission_mode=BYPASS_PERMISSION");
    }
    if (state.desktop_model_policy !== "LATEST_OPUS") {
      usage("SENT_TO_CLAUDE requires desktop_model_policy=LATEST_OPUS");
    }
    if (state.desktop_reasoning_level !== "EXTRA_HIGH") {
      usage("SENT_TO_CLAUDE requires desktop_reasoning_level=EXTRA_HIGH");
    }
    if (state.workflow_type !== "FULL_CODEX_FIRST") {
      usage("SENT_TO_CLAUDE requires workflow_type=FULL_CODEX_FIRST");
    }
    if (!state.origin_codex_session_id) {
      usage("SENT_TO_CLAUDE requires origin_codex_session_id as the FULL_CODEX_FIRST provenance marker");
    }
  }
  if (state.status === "DESKTOP_DELIVERY_SENT") {
    if (!["CODEX_IMPLEMENT", "REWORK"].includes(state.mode)) {
      usage("DESKTOP_DELIVERY_SENT requires mode CODEX_IMPLEMENT or REWORK");
    }
    if (!state.implementation_result_path) {
      usage("DESKTOP_DELIVERY_SENT requires implementation_result_path");
    }
  }
}

const [command, ...rest] = process.argv.slice(2);
if (!command) usage();
const args = parseArgs(rest);
const file = args.file ? resolve(args.file) : null;
if (!file) usage("--file is required");

if (command === "init") {
  if (existsSync(file) && !truthy(args.force)) {
    usage(`state file already exists: ${file}; pass --force true to overwrite intentionally`);
  }
  const round = Number.parseInt(requireArg(args, "round"), 10);
  if (!Number.isInteger(round) || round < 1) usage("--round must be a positive integer");
  const now = nowIso();
  const state = {
    schema_version: "7.0",
    collaboration_id: requireArg(args, "collaboration-id"),
    execution_id: requireArg(args, "execution-id"),
    mode: args.mode || "CODEX_IMPLEMENT",
    change: requireArg(args, "change"),
    round,
    status: "RUNNING",
    claude_session_id: requireArg(args, "claude-session-id"),
    claude_session_jsonl_path: requireArg(args, "claude-session-jsonl-path"),
    claude_session_title: requireArg(args, "claude-session-title"),
    claude_worktree: requireArg(args, "claude-worktree"),
    codex_worktree: requireArg(args, "codex-worktree"),
    local_branch: requireArg(args, "local-branch"),
    remote_branch: requireArg(args, "remote-branch"),
    project_name: args["project-name"] || null,
    git_project_path: args["git-project-path"] || null,
    base_branch: args["base-branch"] || "main",
    desktop_session_title: args["desktop-session-title"] || null,
    desktop_group_name: args["desktop-group-name"] || null,
    iteration_version: args["iteration-version"] || null,
    previous_version: args["previous-version"] || null,
    version_file: args["version-file"] || null,
    changelog_path: args["changelog-path"] || null,
    desktop_permission_mode: args["desktop-permission-mode"] || null,
    desktop_model_policy: args["desktop-model-policy"] || null,
    desktop_reasoning_level: args["desktop-reasoning-level"] || null,
    workflow_type: args["workflow-type"] || (["CODEX_EXPLORE", "SEND_TO_CLAUDE"].includes(args.mode) ? "FULL_CODEX_FIRST" : "CLAUDE_FIRST"),
    origin_codex_session_id: args["origin-codex-session-id"] || null,
    codex_resume_required: Boolean(args["origin-codex-session-id"]),
    desktop_new_session_required: ["CODEX_EXPLORE", "SEND_TO_CLAUDE"].includes(args.mode),
    codex_thread_id: args["codex-thread-id"] || null,
    codex_job_id: args["codex-job-id"] || null,
    codex_explore_summary_path: args["codex-explore-summary-path"] || null,
    claude_packet_path: args["claude-packet-path"] || null,
    created_at: now,
    updated_at: now,
    delivery_mode: "desktop_computer_use",
    desktop_delivery_sent_at: null,
    desktop_delivery_note: null,
    sent_to_claude_at: null,
    sent_to_codex_at: null,
    implementation_result_path: null,
    last_known_pr_url: null,
    merge_commit: null,
  };
  validatePhaseState(state);
  writeJson(file, state);
  console.log(JSON.stringify({ ok: true, file, status: state.status }));
} else if (command === "update") {
  if (!existsSync(file)) usage(`state file not found: ${file}`);
  const state = readJson(file);
  if (args.status === "REWORK" && !args.round) usage("REWORK status requires --round (must increment from previous round)");
  if (args.status) setStatus(state, args.status);
  if (args["codex-thread-id"]) state.codex_thread_id = args["codex-thread-id"];
  if (args["codex-job-id"]) state.codex_job_id = args["codex-job-id"];
  if (args.round) {
    const round = Number.parseInt(args.round, 10);
    if (!Number.isInteger(round) || round < 1) usage("--round must be a positive integer");
    state.round = round;
  }
  if (args["pr-url"]) state.last_known_pr_url = args["pr-url"];
  if (args["implementation-result-path"]) state.implementation_result_path = args["implementation-result-path"];
  if (args["codex-explore-summary-path"]) state.codex_explore_summary_path = args["codex-explore-summary-path"];
  if (args["claude-packet-path"]) state.claude_packet_path = args["claude-packet-path"];
  if (args["desktop-delivery-note"]) state.desktop_delivery_note = args["desktop-delivery-note"];
  if (args["merge-commit"]) state.merge_commit = args["merge-commit"];
  if (args["project-name"]) state.project_name = args["project-name"];
  if (args["git-project-path"]) state.git_project_path = args["git-project-path"];
  if (args["base-branch"]) state.base_branch = args["base-branch"];
  if (args["desktop-session-title"]) state.desktop_session_title = args["desktop-session-title"];
  if (args["desktop-group-name"]) state.desktop_group_name = args["desktop-group-name"];
  if (args["iteration-version"]) state.iteration_version = args["iteration-version"];
  if (args["previous-version"]) state.previous_version = args["previous-version"];
  if (args["version-file"]) state.version_file = args["version-file"];
  if (args["changelog-path"]) state.changelog_path = args["changelog-path"];
  if (args["desktop-permission-mode"]) state.desktop_permission_mode = args["desktop-permission-mode"];
  if (args["desktop-model-policy"]) state.desktop_model_policy = args["desktop-model-policy"];
  if (args["desktop-reasoning-level"]) state.desktop_reasoning_level = args["desktop-reasoning-level"];
  if (args["workflow-type"]) state.workflow_type = args["workflow-type"];
  if (args["origin-codex-session-id"]) {
    state.origin_codex_session_id = args["origin-codex-session-id"];
    state.codex_resume_required = true;
  }
  if (!args.status) state.updated_at = nowIso();
  validatePhaseState(state);
  writeJson(file, state);
  console.log(JSON.stringify({ ok: true, file, status: state.status }));
} else if (command === "get") {
  console.log(JSON.stringify(readJson(file), null, 2));
} else {
  usage(`unknown command: ${command}`);
}
