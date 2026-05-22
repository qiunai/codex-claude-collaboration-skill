#!/usr/bin/env node
// Normalize product iteration version metadata for collaboration sessions.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  version-context.mjs --current-version <V1.12> [--next-version <V1.13>] [--version-file <path>] [--changelog-path <path>]`);
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

function parseVersion(value, label) {
  const match = /^V([0-9]+(?:\.[0-9]+)*)$/.exec(value || "");
  if (!match) usage(`${label} must look like V1.13`);
  return match[1].split(".").map((part) => Number.parseInt(part, 10));
}

function formatVersion(parts) {
  return `V${parts.join(".")}`;
}

function bumpLast(parts) {
  const next = [...parts];
  next[next.length - 1] += 1;
  return next;
}

const args = parseArgs(process.argv.slice(2));
const currentParts = parseVersion(args["current-version"], "--current-version");
const nextVersion = args["next-version"] || formatVersion(bumpLast(currentParts));
parseVersion(nextVersion, "--next-version");

const versionFile = args["version-file"] ? resolve(args["version-file"]) : "";
const changelogPath = args["changelog-path"] ? resolve(args["changelog-path"]) : "";

if (versionFile && !existsSync(versionFile)) usage(`version file not found: ${versionFile}`);
if (changelogPath && !existsSync(changelogPath)) usage(`changelog file not found: ${changelogPath}`);

console.log(JSON.stringify({
  ok: true,
  previous_version: formatVersion(currentParts),
  iteration_version: nextVersion,
  version_file: versionFile,
  changelog_path: changelogPath,
  session_version_prefix: nextVersion,
}, null, 2));
