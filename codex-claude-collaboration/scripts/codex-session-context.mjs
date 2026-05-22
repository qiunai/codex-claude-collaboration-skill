#!/usr/bin/env node
// Normalize the current Codex thread id for FULL_CODEX_FIRST workflows.

import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  codex-session-context.mjs --thread-id <id> [--session-id <id>]`);
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

const args = parseArgs(process.argv.slice(2));
const threadId = args["thread-id"] || "";
if (!threadId.trim()) usage("--thread-id is required for FULL_CODEX_FIRST");
const sessionId = args["session-id"] || null;

console.log(JSON.stringify({
  ok: true,
  origin_codex_session_id: sessionId,
  origin_codex_thread_id: threadId,
  workflow_type: "FULL_CODEX_FIRST",
  codex_resume_required: true,
}, null, 2));
