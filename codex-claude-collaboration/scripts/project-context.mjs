#!/usr/bin/env node
// Resolve local Git project context for a Claude Desktop exploration session.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  project-context.mjs --cwd <path> --version <V8|V1.0> --summary <short text> [--group <name>] [--expected-project <name>]`);
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

function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function hasRef(cwd, ref) {
  try {
    git(cwd, ["rev-parse", "--verify", "--quiet", ref]);
    return true;
  } catch {
    return false;
  }
}

const args = parseArgs(process.argv.slice(2));
const cwd = args.cwd ? resolve(args.cwd) : null;
if (!cwd || !existsSync(cwd)) usage("--cwd must point to an existing path");
const version = args.version;
if (!version || !/^V[0-9]+(?:\.[0-9]+)*$/.test(version)) usage("--version must look like V8 or V1.0");
const summary = args.summary;
if (!summary || !summary.trim()) usage("--summary is required");

let gitRoot;
let currentBranch;
try {
  gitRoot = git(cwd, ["rev-parse", "--show-toplevel"]);
  currentBranch = git(cwd, ["branch", "--show-current"]) || "DETACHED";
} catch (error) {
  usage(`not a Git repository: ${cwd}`);
}

const projectName = args["expected-project"] || basename(gitRoot);
const groupName = args.group || projectName;
const sessionTitle = `${version} ${summary.trim()}`;
const mainAvailable = hasRef(gitRoot, "main") || hasRef(gitRoot, "origin/main");

if (!mainAvailable) {
  usage("main branch is required for Claude Desktop exploration session creation");
}

console.log(JSON.stringify({
  ok: true,
  git_project_path: gitRoot,
  current_codex_branch: currentBranch,
  required_claude_project_name: projectName,
  required_claude_branch: "main",
  required_worktree: true,
  desktop_session_title: sessionTitle,
  desktop_group_name: groupName,
}, null, 2));
