#!/usr/bin/env node
// Verify the actual codex-companion executable supports exact thread resume.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  verify-codex-companion.mjs --command <codex-companion-command>`);
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
const command = args.command;
if (!command) usage("--command is required");

const trimmed = command.trim();
const commandForShell = trimmed.endsWith(".mjs") && existsSync(trimmed)
  ? `node ${JSON.stringify(trimmed)}`
  : trimmed;

const result = spawnSync(commandForShell, [], {
  encoding: "utf8",
  shell: true,
});

const output = `${result.stdout || ""}\n${result.stderr || ""}`;
if (!output.includes("--resume-thread <thread-id>")) {
  console.error(`ERROR: ${commandForShell} does not advertise task --resume-thread <thread-id>.`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  command: commandForShell,
  supports_resume_thread: true,
}, null, 2));
