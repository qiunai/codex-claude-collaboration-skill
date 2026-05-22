#!/usr/bin/env node
// Validate a Codex -> Claude exploration packet has reviewable structure.

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(2);
}

const file = process.argv[2] ? resolve(process.argv[2]) : null;
if (!file) fail("usage: validate-claude-packet.mjs <packet.md>");
if (!existsSync(file)) fail(`packet not found: ${file}`);
if (statSync(file).size === 0) fail("packet is empty");

const text = readFileSync(file, "utf8");
const requiredHeadings = [
  "## User Problem",
  "## Confirmed Evidence",
  "## Likely Interpretations",
  "## Unknowns For Claude",
  "## Suggested Claude Explore Questions",
  "## Candidate Scope",
];

const missing = requiredHeadings.filter((heading) => !text.includes(heading));
const labels = ["[CONFIRMED]", "[LIKELY]", "[UNKNOWN]", "[USER-OBSERVED]"];
const foundLabels = labels.filter((label) => text.includes(label));
const hasEvidencePointer = /Evidence:\s*`[^`]+`/.test(text) || /Evidence:\s*\S+/i.test(text);

const warnings = [];
if (!text.includes("[CONFIRMED]")) warnings.push("no [CONFIRMED] entries");
if (!text.includes("[UNKNOWN]")) warnings.push("no [UNKNOWN] entries");
if (!hasEvidencePointer) warnings.push("no explicit Evidence pointer");

if (missing.length) {
  console.log(JSON.stringify({ ok: false, missing, found_labels: foundLabels, warnings }, null, 2));
  process.exit(2);
}

console.log(JSON.stringify({
  ok: true,
  file,
  bytes: statSync(file).size,
  found_labels: foundLabels,
  warnings,
}, null, 2));
process.exit(warnings.length ? 1 : 0);
