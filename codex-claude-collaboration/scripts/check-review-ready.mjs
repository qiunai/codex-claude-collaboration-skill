#!/usr/bin/env node
// Find collaboration states that are ready for Claude REVIEW.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  check-review-ready.mjs --state-dir <dir> [--collaboration-id <id>] [--min-age-seconds <n>]`);
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
  return JSON.parse(readFileSync(file, "utf8"));
}

function fileExistsNonEmpty(file) {
  return existsSync(file) && statSync(file).isFile() && statSync(file).size > 0;
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function resolveImplementationResult(state) {
  const declared = state.implementation_result_path;
  if (declared) return resolve(declared);
  if (state.codex_worktree) return resolve(state.codex_worktree, ".codex-claude-collaboration", "implementation-result.json");
  return null;
}

const args = parseArgs(process.argv.slice(2));
const stateDir = args["state-dir"] ? resolve(args["state-dir"]) : null;
if (!stateDir) usage("--state-dir is required");
if (!existsSync(stateDir)) usage(`state dir not found: ${stateDir}`);

const target = args["collaboration-id"] || null;
const minAgeSeconds = Number.parseInt(args["min-age-seconds"] || "0", 10);
if (!Number.isInteger(minAgeSeconds) || minAgeSeconds < 0) usage("--min-age-seconds must be >= 0");

const now = Date.now();
const ready = [];
const skipped = [];

for (const name of readdirSync(stateDir).sort()) {
  if (!name.endsWith(".json")) continue;
  const file = join(stateDir, name);
  let state;
  try {
    state = readJson(file);
  } catch (error) {
    skipped.push({ file, reason: `invalid state JSON: ${error.message}` });
    continue;
  }
  const id = state.collaboration_id || basename(name, ".json");
  if (target && id !== target && basename(name, ".json") !== target) continue;
  if (state.status !== "DESKTOP_DELIVERY_SENT") {
    skipped.push({ file, collaboration_id: id, status: state.status, reason: "not review-ready status" });
    continue;
  }
  const readyAt = state.desktop_delivery_sent_at;
  const delivered = readyAt ? Date.parse(readyAt) : NaN;
  const ageSeconds = Number.isFinite(delivered) ? Math.floor((now - delivered) / 1000) : null;
  if (ageSeconds !== null && ageSeconds < minAgeSeconds) {
    skipped.push({ file, collaboration_id: id, status: state.status, age_seconds: ageSeconds, reason: "below min age" });
    continue;
  }
  const resultPath = resolveImplementationResult(state);
  if (!resultPath || !fileExistsNonEmpty(resultPath)) {
    skipped.push({ file, collaboration_id: id, status: state.status, reason: "implementation-result.json missing or empty", implementation_result_path: resultPath });
    continue;
  }
  if (state.codex_worktree) {
    const root = resolve(state.codex_worktree);
    if (!inside(root, resultPath)) {
      skipped.push({ file, collaboration_id: id, status: state.status, reason: "implementation-result.json outside codex_worktree", implementation_result_path: resultPath });
      continue;
    }
  }
  let result;
  try {
    result = readJson(resultPath);
  } catch (error) {
    skipped.push({ file, collaboration_id: id, status: state.status, reason: `invalid result JSON: ${error.message}`, implementation_result_path: resultPath });
    continue;
  }
  if (!["READY_FOR_REVIEW", "FAILED", "BLOCKED"].includes(result.status)) {
    skipped.push({ file, collaboration_id: id, status: state.status, reason: `result status not terminal: ${result.status}`, implementation_result_path: resultPath });
    continue;
  }
  ready.push({
    state_path: file,
    collaboration_id: id,
    execution_id: state.execution_id || result.execution_id || null,
    change: state.change,
    round: state.round,
    state_status: state.status,
    result_status: result.status,
    desktop_delivery_sent_at: state.desktop_delivery_sent_at || null,
    age_seconds: ageSeconds,
    implementation_result_path: resultPath,
    codex_worktree: state.codex_worktree || null,
    pr_url: result.pr_url || state.last_known_pr_url || null,
    summary: result.summary || "",
  });
}

console.log(JSON.stringify({ ready, skipped }, null, 2));
process.exit(ready.length ? 0 : 1);
