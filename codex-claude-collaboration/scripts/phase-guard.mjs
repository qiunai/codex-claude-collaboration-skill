#!/usr/bin/env node
// Validate that a Desktop send belongs to the intended collaboration phase.

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  phase-guard.mjs --state <file> --phase explore-packet [--packet-path <file>] [--message-file <file>]
  phase-guard.mjs --state <file> --phase implementation-result [--result-path <file>] [--message-file <file>]`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) usage(`unexpected argument: ${item}`);
    const key = item.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) usage(`missing value for --${key}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    usage(`cannot read valid JSON from ${file}: ${error.message}`);
  }
}

function fileExistsNonEmpty(file, label) {
  if (!file) usage(`${label} is required`);
  const resolved = resolve(file);
  if (!existsSync(resolved)) usage(`${label} not found: ${resolved}`);
  if (statSync(resolved).size === 0) usage(`${label} is empty: ${resolved}`);
  return resolved;
}

function fail(verdict, message, extra = {}) {
  console.log(JSON.stringify({ ok: false, verdict, message, ...extra }, null, 2));
  process.exit(2);
}

function ok(verdict) {
  console.log(JSON.stringify({ ok: true, ...verdict }, null, 2));
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
const statePath = fileExistsNonEmpty(args.state, "--state");
const phase = args.phase;
if (!phase) usage("--phase is required");
const state = readJson(statePath);

if (!state.collaboration_id) fail("BAD_STATE", "state.collaboration_id is required");

if (phase === "explore-packet") {
  if (!["CODEX_EXPLORE", "SEND_TO_CLAUDE"].includes(state.mode)) {
    fail("WRONG_PHASE", "explore packet delivery requires mode CODEX_EXPLORE or SEND_TO_CLAUDE", { mode: state.mode });
  }
  if (state.implementation_result_path) {
    fail("MIXED_ARTIFACTS", "explore packet delivery must not include implementation_result_path");
  }
  if (!state.desktop_new_session_required) {
    fail("NEW_SESSION_REQUIRED", "explore packet delivery must create a new Claude Desktop session");
  }
  if (!state.project_name || !state.git_project_path) {
    fail("MISSING_PROJECT_CONTEXT", "explore packet delivery requires project_name and git_project_path");
  }
  if (state.base_branch !== "main") {
    fail("WRONG_BASE_BRANCH", "explore packet delivery must start Claude Desktop from main branch", { base_branch: state.base_branch });
  }
  if (!state.desktop_session_title || !/^V[0-9]+(?:\.[0-9]+)*\s+\S/.test(state.desktop_session_title)) {
    fail("BAD_SESSION_TITLE", "desktop_session_title must look like 'V7 short summary' or 'V1.0 short summary'");
  }
  if (!state.desktop_group_name) {
    fail("MISSING_GROUP", "desktop_group_name is required for post-send Move to group");
  }
  if (!state.iteration_version || !/^V[0-9]+(?:\.[0-9]+)*$/.test(state.iteration_version)) {
    fail("MISSING_ITERATION_VERSION", "explore packet delivery requires iteration_version like V1.13");
  }
  if (state.desktop_permission_mode !== "BYPASS_PERMISSION") {
    fail("WRONG_PERMISSION_MODE", "Claude Desktop session must use Bypass Permission", { desktop_permission_mode: state.desktop_permission_mode });
  }
  if (state.desktop_model_policy !== "LATEST_OPUS") {
    fail("WRONG_MODEL_POLICY", "Claude Desktop session must use the latest visible Opus model", { desktop_model_policy: state.desktop_model_policy });
  }
  if (state.desktop_reasoning_level !== "EXTRA_HIGH") {
    fail("WRONG_REASONING_LEVEL", "Claude Desktop session reasoning level must be Extra High", { desktop_reasoning_level: state.desktop_reasoning_level });
  }
  if (state.workflow_type !== "FULL_CODEX_FIRST") {
    fail("WRONG_WORKFLOW", "explore packet delivery requires workflow_type=FULL_CODEX_FIRST", { workflow_type: state.workflow_type });
  }
  if (!state.origin_codex_session_id) {
    fail("MISSING_CODEX_SESSION", "explore packet delivery must include origin_codex_session_id as the FULL_CODEX_FIRST provenance marker");
  }
  if (!state.origin_codex_thread_id) {
    fail("MISSING_CODEX_THREAD", "explore packet delivery must include origin_codex_thread_id for exact --resume-thread routing");
  }
  const packetPath = fileExistsNonEmpty(args["packet-path"] || state.codex_explore_summary_path, "--packet-path");
  const packet = readFileSync(packetPath, "utf8");
  for (const heading of [
    "## User Problem",
    "## Confirmed Evidence",
    "## Likely Interpretations",
    "## Unknowns For Claude",
    "## Suggested Claude Explore Questions",
    "## Candidate Scope",
  ]) {
    if (!packet.includes(heading)) fail("BAD_PACKET", `packet missing heading: ${heading}`, { packet_path: packetPath });
  }
  if (args["message-file"]) {
    const message = readFileSync(fileExistsNonEmpty(args["message-file"], "--message-file"), "utf8");
    if (!message.startsWith("/openspec:explore ")) {
      fail("WRONG_MESSAGE_SHAPE", "explore packet message must start with '/openspec:explore ' including the trailing space");
    }
    if (message.includes("codex-claude DONE")) {
      fail("WRONG_MESSAGE_SHAPE", "explore packet message must not use implementation completion prefix");
    }
  }
  ok({
    verdict: "EXPLORE_PACKET_READY",
    collaboration_id: state.collaboration_id,
    mode: state.mode,
    packet_path: packetPath,
    project_name: state.project_name,
    git_project_path: state.git_project_path,
    desktop_session_title: state.desktop_session_title,
    desktop_group_name: state.desktop_group_name,
    iteration_version: state.iteration_version,
    desktop_permission_mode: state.desktop_permission_mode,
    desktop_model_policy: state.desktop_model_policy,
    desktop_reasoning_level: state.desktop_reasoning_level,
    workflow_type: state.workflow_type,
    origin_codex_session_id: state.origin_codex_session_id,
    origin_codex_thread_id: state.origin_codex_thread_id ?? null,
  });
}

if (phase === "implementation-result") {
  if (!["CODEX_IMPLEMENT", "REWORK"].includes(state.mode)) {
    fail("WRONG_PHASE", "implementation result delivery requires mode CODEX_IMPLEMENT or REWORK", { mode: state.mode });
  }
  const resultPath = fileExistsNonEmpty(args["result-path"] || state.implementation_result_path, "--result-path");
  const result = readJson(resultPath);
  if (result.collaboration_id !== state.collaboration_id) {
    fail("ID_MISMATCH", "result.collaboration_id does not match state", {
      state_collaboration_id: state.collaboration_id,
      result_collaboration_id: result.collaboration_id,
    });
  }
  if (state.execution_id && result.execution_id !== state.execution_id) {
    fail("ID_MISMATCH", "result.execution_id does not match state", {
      state_execution_id: state.execution_id,
      result_execution_id: result.execution_id,
    });
  }
  if (!["READY_FOR_REVIEW", "FAILED", "BLOCKED"].includes(result.status)) {
    fail("BAD_RESULT_STATUS", "implementation result must be terminal before Desktop delivery", { status: result.status });
  }
  if (args["message-file"]) {
    const message = readFileSync(fileExistsNonEmpty(args["message-file"], "--message-file"), "utf8");
    const prefix = `codex-claude DONE ${state.collaboration_id} round ${result.round}:`;
    if (!message.includes(prefix)) {
      fail("WRONG_MESSAGE_SHAPE", "implementation message must contain exact completion prefix", { expected_prefix: prefix });
    }
    if (message.includes("/openspec:explore")) {
      fail("WRONG_MESSAGE_SHAPE", "implementation result message must not contain /openspec:explore");
    }
  }
  ok({
    verdict: "IMPLEMENTATION_RESULT_READY",
    collaboration_id: state.collaboration_id,
    execution_id: state.execution_id || null,
    mode: state.mode,
    result_path: resultPath,
    status: result.status,
  });
}

usage(`unknown --phase ${phase}`);
