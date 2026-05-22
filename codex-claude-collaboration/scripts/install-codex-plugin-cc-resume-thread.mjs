#!/usr/bin/env node
// Apply the codex-plugin-cc exact thread resume runtime patch to local Claude installs.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  install-codex-plugin-cc-resume-thread.mjs [--plugin-root <path>] [--plugin-script <path>]

Environment:
  CLAUDE_HOME              Defaults to ~/.claude
  CODEX_COMPANION          Optional installed codex-companion script path
  CODEX_PLUGIN_CC_ROOT     Optional installed codex-plugin-cc plugin root`);
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

function unique(items) {
  return [...new Set(items.filter(Boolean).map((item) => path.resolve(item)))];
}

function rootFromScript(scriptPath) {
  const resolved = path.resolve(scriptPath);
  if (path.basename(resolved) !== "codex-companion.mjs") return null;
  if (path.basename(path.dirname(resolved)) !== "scripts") return null;
  return path.dirname(path.dirname(resolved));
}

function listCacheRoots(claudeHome) {
  const cacheRoot = path.join(claudeHome, "plugins", "cache", "openai-codex", "codex");
  if (!existsSync(cacheRoot)) return [];
  return readdirSync(cacheRoot)
    .map((entry) => path.join(cacheRoot, entry))
    .filter((entryPath) => {
      try {
        return statSync(entryPath).isDirectory();
      } catch {
        return false;
      }
    });
}

function candidateRoots(args) {
  const home = process.env.HOME || "";
  const claudeHome = process.env.CLAUDE_HOME || path.join(home, ".claude");
  const roots = [];

  if (args["plugin-root"]) roots.push(args["plugin-root"]);
  if (args["plugin-script"]) roots.push(rootFromScript(args["plugin-script"]));
  if (process.env.CODEX_PLUGIN_CC_ROOT) roots.push(process.env.CODEX_PLUGIN_CC_ROOT);
  if (process.env.CODEX_COMPANION) roots.push(rootFromScript(process.env.CODEX_COMPANION));

  roots.push(path.join(claudeHome, "plugins", "marketplaces", "openai-codex", "plugins", "codex"));
  roots.push(...listCacheRoots(claudeHome));

  return unique(roots).filter((root) => existsSync(path.join(root, "scripts", "codex-companion.mjs")));
}

function supportsResumeThread(root) {
  const script = path.join(root, "scripts", "codex-companion.mjs");
  const text = readFileSync(script, "utf8");
  return text.includes("--resume-thread <thread-id>")
    && text.includes("resumeThreadId")
    && text.includes('"resume-thread"');
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

const args = parseArgs(process.argv.slice(2));
const skillDir = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const patchPath = path.join(skillDir, "plugins", "codex-plugin-cc", "resume-thread-runtime.patch");

if (!existsSync(patchPath)) {
  console.error(`ERROR: patch not found: ${patchPath}`);
  process.exit(2);
}

const roots = candidateRoots(args);
if (!roots.length) {
  console.error(`ERROR: no installed codex-plugin-cc roots found.

Install the Claude Code Codex plugin first:
  /plugin marketplace add openai/codex-plugin-cc
  /plugin install codex@openai-codex
  /reload-plugins

Then rerun this script, or pass --plugin-root /path/to/installed/plugin/root.`);
  process.exit(2);
}

const results = [];
for (const root of roots) {
  const script = path.join(root, "scripts", "codex-companion.mjs");
  if (supportsResumeThread(root)) {
    results.push({ root, status: "already_installed" });
    continue;
  }

  const check = run("git", ["apply", "--check", patchPath], { cwd: root });
  if (check.status !== 0) {
    results.push({
      root,
      status: "patch_check_failed",
      stderr: check.stderr.trim(),
    });
    continue;
  }

  const apply = run("git", ["apply", patchPath], { cwd: root });
  if (apply.status !== 0) {
    results.push({
      root,
      status: "patch_failed",
      stderr: apply.stderr.trim(),
    });
    continue;
  }

  const syntax = run("node", ["--check", script]);
  if (syntax.status !== 0) {
    results.push({
      root,
      status: "syntax_check_failed",
      stderr: syntax.stderr.trim(),
    });
    continue;
  }

  results.push({
    root,
    status: supportsResumeThread(root) ? "installed" : "verify_failed",
  });
}

console.log(JSON.stringify({
  ok: results.every((item) => item.status === "installed" || item.status === "already_installed"),
  results,
}, null, 2));

if (results.some((item) => !["installed", "already_installed"].includes(item.status))) {
  process.exit(1);
}
