#!/usr/bin/env node
// Validate .codex-claude-collaboration/implementation-result.json and evidence manifest.

import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";

const REQUIRED_FIELDS = [
  "schema_version",
  "collaboration_id",
  "execution_id",
  "change",
  "round",
  "status",
  "local_branch",
  "remote_branch",
  "head_commit",
  "pr_url",
  "summary",
  "verification",
  "evidence_manifest",
  "tasks_total",
  "tasks_done",
  "tasks_skipped",
  "known_gaps",
  "reason",
];

const VALID_STATUSES = new Set(["READY_FOR_REVIEW", "FAILED", "BLOCKED"]);

function exit(code, verdict) {
  console.log(`VERDICT: ${JSON.stringify(verdict)}`);
  process.exit(code);
}

function fail(verdict, message) {
  console.error(`[FAIL] ${message}`);
  exit(2, { verdict, message });
}

function ok(verdict) {
  console.error(`[OK] ${verdict.message}`);
  exit(0, verdict);
}

function warn(verdict) {
  console.error(`[WARN] ${verdict.message}`);
  exit(1, verdict);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail("MALFORMED_RESULT_JSON", `implementation-result.json is not valid JSON: ${error.message}`);
  }
}

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function parseMarkdownManifestPaths(content) {
  const paths = new Set();
  const pathLike = /^(?:\.codex-claude-collaboration|[A-Za-z0-9_.-]+)\/[A-Za-z0-9_./@+-]+\.[A-Za-z0-9][A-Za-z0-9_.-]*$/;
  const ignoredSchemes = /^(?:https?:|file:|app:|plugin:|mailto:)/i;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || /^[-|:\s]+$/.test(trimmed)) continue;
    if (/evidence|证据|path/i.test(trimmed) && /说明|description|fix|修复/i.test(trimmed)) continue;
    const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
    for (const cell of cells) {
      const backtickMatches = [...cell.matchAll(/`([^`]+)`/g)];
      if (backtickMatches.length) {
        for (const match of backtickMatches) {
          const value = match[1].trim();
          if (value && !ignoredSchemes.test(value) && pathLike.test(value)) paths.add(value);
        }
      } else {
        for (const token of cell.split(/\s+/)) {
          const value = token.trim().replace(/^[([{"']+|[\])}",，。；;:]+$/g, "");
          if (value && !ignoredSchemes.test(value) && pathLike.test(value)) paths.add(value);
        }
      }
    }
  }
  return [...paths];
}

const worktree = process.argv[2] ? resolve(process.argv[2]) : null;
if (!worktree) fail("BAD_ARGS", "usage: validate-implementation-result.mjs <WORKTREE_PATH>");
if (!existsSync(worktree)) fail("BAD_WORKTREE", `worktree not found: ${worktree}`);

const resultPath = join(worktree, ".codex-claude-collaboration", "implementation-result.json");
if (!existsSync(resultPath)) fail("MISSING_RESULT_JSON", `missing ${resultPath}`);
if (statSync(resultPath).size === 0) fail("EMPTY_RESULT_JSON", "implementation-result.json is empty");

const result = readJson(resultPath);
const missing = REQUIRED_FIELDS.filter((field) => !Object.prototype.hasOwnProperty.call(result, field));
if (missing.length) fail("INCOMPLETE_RESULT_JSON", `missing fields: ${missing.join(", ")}`);
if (!VALID_STATUSES.has(result.status)) fail("BAD_STATUS", `bad status: ${result.status}`);
if (!Number.isInteger(result.round) || result.round < 1) fail("BAD_ROUND", "round must be a positive integer");
if (!Number.isInteger(result.tasks_total) || result.tasks_total < 0) {
  fail("BAD_TASKS_TOTAL", "tasks_total must be a non-negative integer");
}
if (!Number.isInteger(result.tasks_done) || result.tasks_done < 0) {
  fail("BAD_TASKS_DONE", "tasks_done must be a non-negative integer");
}
if (result.tasks_done > result.tasks_total) {
  fail("TASKS_DONE_EXCEEDS_TOTAL", "tasks_done cannot exceed tasks_total");
}
if (!Array.isArray(result.verification)) fail("BAD_VERIFICATION", "verification must be an array");
if (!Array.isArray(result.tasks_skipped)) fail("BAD_TASKS_SKIPPED", "tasks_skipped must be an array");
if (!Array.isArray(result.known_gaps)) fail("BAD_KNOWN_GAPS", "known_gaps must be an array");

const base = {
  collaboration_id: result.collaboration_id,
  execution_id: result.execution_id,
  change: result.change,
  round: result.round,
  status: result.status,
  pr_url: result.pr_url || null,
};

if (result.status === "FAILED" || result.status === "BLOCKED") {
  warn({ ...base, verdict: "CODEX_STOPPED", message: `Codex stopped: ${result.reason || result.status}` });
}

try {
  execFileSync("git", ["-C", worktree, "rev-parse", "--verify", `${result.head_commit}^{commit}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  fail("BAD_HEAD_COMMIT", `head_commit does not resolve: ${result.head_commit}`);
}

if (result.verification.length === 0) fail("EMPTY_VERIFICATION", "verification array is empty");

let evidenceCount = 0;
if (typeof result.evidence_manifest === "string" && result.evidence_manifest.trim()) {
  if (isAbsolute(result.evidence_manifest)) fail("ABSOLUTE_EVIDENCE_MANIFEST", "evidence_manifest must be repo-relative");
  const manifestPath = resolve(worktree, result.evidence_manifest);
  if (!inside(worktree, manifestPath)) fail("EVIDENCE_MANIFEST_ESCAPE", "evidence_manifest escapes worktree");
  if (!existsSync(manifestPath)) fail("MISSING_EVIDENCE_MANIFEST", `missing ${result.evidence_manifest}`);
  if (statSync(manifestPath).size === 0) fail("EMPTY_EVIDENCE_MANIFEST", `${result.evidence_manifest} is empty`);
  const manifest = readFileSync(manifestPath, "utf8");
  const paths = parseMarkdownManifestPaths(manifest);
  for (const rel of paths) {
    if (isAbsolute(rel) || rel.includes("..")) fail("BAD_EVIDENCE_PATH", `bad evidence path: ${rel}`);
    const evidencePath = resolve(dirname(manifestPath), rel);
    const repoRelativePath = resolve(worktree, rel);
    const candidate = existsSync(evidencePath) ? evidencePath : repoRelativePath;
    if (!inside(worktree, candidate)) fail("EVIDENCE_PATH_ESCAPE", `evidence path escapes worktree: ${rel}`);
    if (!existsSync(candidate)) fail("MISSING_EVIDENCE_FILE", `missing evidence file: ${rel}`);
    if (statSync(candidate).size === 0) fail("EMPTY_EVIDENCE_FILE", `empty evidence file: ${rel}`);
    evidenceCount += 1;
  }
}

ok({
  ...base,
  verdict: "READY_FOR_REVIEW",
  evidence_files_checked: evidenceCount,
  message: `collaboration ${result.collaboration_id} is READY_FOR_REVIEW`,
});
