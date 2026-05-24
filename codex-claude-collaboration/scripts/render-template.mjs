#!/usr/bin/env node
// Render Codex-Claude Collaboration templates.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import process from "node:process";

function usage(message) {
  if (message) console.error(`ERROR: ${message}`);
  console.error(`Usage:
  render-template.mjs --template <file> --out <file> --var KEY=VALUE [--var KEY=VALUE ...]
  render-template.mjs --template <file> --out <file> --vars-json <file>`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { vars: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--var") {
      const pair = argv[i + 1];
      if (!pair || !pair.includes("=")) usage("--var expects KEY=VALUE");
      const index = pair.indexOf("=");
      args.vars[pair.slice(0, index)] = pair.slice(index + 1);
      i += 1;
    } else if (item === "--template" || item === "--out" || item === "--vars-json") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) usage(`${item} requires a value`);
      args[item.slice(2)] = value;
      i += 1;
    } else {
      usage(`unexpected argument: ${item}`);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.template || !args.out) usage("--template and --out are required");

if (args["vars-json"]) {
  const parsed = JSON.parse(readFileSync(args["vars-json"], "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    args.vars[key] = value == null ? "" : String(value);
  }
}

let rendered = readFileSync(resolve(args.template), "utf8");
rendered = rendered.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
  if (!Object.prototype.hasOwnProperty.call(args.vars, key)) {
    throw new Error(`missing template variable ${key}`);
  }
  return args.vars[key];
});

const goalTemplateNames = new Set(["codex-execution.md", "codex-rework.md"]);
if (goalTemplateNames.has(basename(args.template)) && !rendered.startsWith("/goal")) {
  throw new Error(`${args.template} must render with /goal as the first characters`);
}

const out = resolve(args.out);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, rendered, "utf8");
console.log(JSON.stringify({ ok: true, out, bytes: Buffer.byteLength(rendered) }));
