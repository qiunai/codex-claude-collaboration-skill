#!/usr/bin/env node
// FIFO cooperative lock for Claude Desktop Computer Use delivery.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  desktop-delivery-lock.mjs acquire --lock-dir <dir> --owner <id> [--wait-seconds 600] [--poll-ms 1000] [--stale-seconds 900]
  desktop-delivery-lock.mjs release --lock-dir <dir> --token <token>`);
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

function intArg(args, key, fallback, min) {
  const value = Number.parseInt(args[key] || String(fallback), 10);
  if (!Number.isInteger(value) || value < min) usage(`--${key} must be >= ${min}`);
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function ensureRoot(lockDir) {
  mkdirSync(lockDir, { recursive: true });
  mkdirSync(join(lockDir, "queue"), { recursive: true });
}

function queueFiles(lockDir) {
  const queueDir = join(lockDir, "queue");
  return readdirSync(queueDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => join(queueDir, name));
}

function activeMeta(lockDir) {
  return readJson(join(lockDir, "active.lock", "owner.json"));
}

function cleanupStaleActive(lockDir, staleSeconds) {
  const activeDir = join(lockDir, "active.lock");
  if (!existsSync(activeDir)) return;
  const meta = activeMeta(lockDir);
  const acquired = meta?.acquired_at ? Date.parse(meta.acquired_at) : NaN;
  const stale = !Number.isFinite(acquired) || Date.now() - acquired > staleSeconds * 1000;
  if (stale) rmSync(activeDir, { recursive: true, force: true });
}

const [command, ...rest] = process.argv.slice(2);
if (!command) usage();
const args = parseArgs(rest);
const lockDir = args["lock-dir"] ? resolve(args["lock-dir"]) : null;
if (!lockDir) usage("--lock-dir is required");

if (command === "acquire") {
  const owner = args.owner;
  if (!owner) usage("--owner is required");
  const waitSeconds = intArg(args, "wait-seconds", 600, 0);
  const pollMs = intArg(args, "poll-ms", 1000, 100);
  const staleSeconds = intArg(args, "stale-seconds", 900, 30);
  ensureRoot(lockDir);

  const token = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ticketName = `${Date.now().toString().padStart(13, "0")}-${process.pid}-${Math.random().toString(16).slice(2)}.json`;
  const ticketPath = join(lockDir, "queue", ticketName);
  writeFileSync(ticketPath, JSON.stringify({ owner, token, pid: process.pid, queued_at: nowIso() }, null, 2), "utf8");

  const deadline = Date.now() + waitSeconds * 1000;
  while (true) {
    cleanupStaleActive(lockDir, staleSeconds);
    const queue = queueFiles(lockDir).filter((file) => existsSync(file) && statSync(file).isFile());
    const first = queue[0];
    if (first === ticketPath) {
      try {
        const activeDir = join(lockDir, "active.lock");
        mkdirSync(activeDir, { recursive: false });
        writeFileSync(join(activeDir, "owner.json"), JSON.stringify({
          owner,
          token,
          pid: process.pid,
          ticket: ticketName,
          acquired_at: nowIso(),
        }, null, 2), "utf8");
        rmSync(ticketPath, { force: true });
        console.log(JSON.stringify({ ok: true, token, lock_dir: lockDir, owner, ticket: ticketName }));
        process.exit(0);
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
    }

    if (Date.now() >= deadline) {
      rmSync(ticketPath, { force: true });
      console.log(JSON.stringify({
        ok: false,
        reason: "timeout",
        lock_dir: lockDir,
        owner,
        active: activeMeta(lockDir),
        queue_ahead: queue.findIndex((file) => file === ticketPath),
      }));
      process.exit(1);
    }
    await sleep(pollMs);
  }
} else if (command === "release") {
  const token = args.token;
  if (!token) usage("--token is required");
  const activeDir = join(lockDir, "active.lock");
  const meta = activeMeta(lockDir);
  if (!meta) {
    console.log(JSON.stringify({ ok: true, released: false, reason: "lock_missing" }));
    process.exit(0);
  }
  if (meta.token !== token) {
    console.log(JSON.stringify({ ok: false, released: false, reason: "token_mismatch", owner: meta.owner || null }));
    process.exit(1);
  }
  rmSync(activeDir, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true, released: true, owner: meta.owner || null }));
} else {
  usage(`unknown command: ${command}`);
}
