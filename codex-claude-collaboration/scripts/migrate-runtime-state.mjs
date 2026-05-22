#!/usr/bin/env node
// Move legacy runtime state out of installed skill directories.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  migrate-runtime-state.mjs [--state-root <path>] [--legacy-state <path> ...]`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { legacy: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--legacy-state") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage("--legacy-state requires a path");
      args.legacy.push(value);
      i += 1;
    } else if (item === "--state-root") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage("--state-root requires a path");
      args.stateRoot = value;
      i += 1;
    } else {
      usage(`unexpected argument: ${item}`);
    }
  }
  return args;
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => path.join(dir, entry))
    .filter((file) => {
      try {
        return statSync(file).isFile() && statSync(file).size > 0;
      } catch {
        return false;
      }
    });
}

const args = parseArgs(process.argv.slice(2));
const home = process.env.HOME || "";
const stateRoot = path.resolve(args.stateRoot || process.env.CODEX_CLAUDE_COLLABORATION_STATE_DIR || path.join(home, ".claude", "codex-claude-collaboration", "state"));
const legacyRoots = args.legacy.length
  ? args.legacy
  : [
      path.join(home, ".claude", "skills", "codex-claude-collaboration", "state"),
      path.join(home, ".codex", "skills", "codex-claude-collaboration", "state"),
    ];

mkdirSync(stateRoot, { recursive: true });

const results = [];
for (const legacyRoot of legacyRoots.map((item) => path.resolve(item))) {
  for (const source of listJsonFiles(legacyRoot)) {
    const target = path.join(stateRoot, path.basename(source));
    if (existsSync(target)) {
      results.push({ source, target, status: "kept_existing" });
      continue;
    }
    copyFileSync(source, target);
    results.push({ source, target, status: "copied" });
  }
}

console.log(JSON.stringify({
  ok: true,
  state_root: stateRoot,
  results,
}, null, 2));
