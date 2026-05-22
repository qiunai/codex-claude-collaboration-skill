#!/usr/bin/env node
// Resolve a Claude session id to its JSONL path and visible custom title.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error("Usage: resolve-claude-session.mjs --session-id <uuid> [--projects-dir <dir>]");
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

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "subagents") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile() && name.endsWith(".jsonl")) out.push(p);
  }
  return out;
}

function readFirstJsonLine(file) {
  const first = readFileSync(file, "utf8").split(/\r?\n/, 1)[0];
  return first ? JSON.parse(first) : null;
}

const args = parseArgs(process.argv.slice(2));
const sessionId = args["session-id"];
if (!sessionId) usage("--session-id is required");
const projectsDir = resolve(args["projects-dir"] || "~/.claude/projects".replace(/^~/, process.env.HOME || ""));
if (!existsSync(projectsDir)) usage(`projects dir not found: ${projectsDir}`);

const exact = walk(projectsDir).filter((p) => p.endsWith(`${sessionId}.jsonl`));
const candidates = exact.length ? exact : walk(projectsDir).filter((p) => {
  try {
    const first = readFirstJsonLine(p);
    return first?.sessionId === sessionId;
  } catch {
    return false;
  }
});

if (candidates.length !== 1) {
  console.log(JSON.stringify({ ok: false, session_id: sessionId, matches: candidates }, null, 2));
  process.exit(candidates.length ? 3 : 1);
}

const path = candidates[0];
const first = readFirstJsonLine(path);
const title = first?.customTitle || first?.title || "";
console.log(JSON.stringify({
  ok: true,
  session_id: sessionId,
  jsonl_path: path,
  custom_title: title,
}, null, 2));
