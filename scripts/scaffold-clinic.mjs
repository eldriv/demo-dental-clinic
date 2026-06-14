#!/usr/bin/env node
/**
 * Scaffold a new dental clinic project directory from this template.
 *
 * Creates a sibling folder under your dev directory by default:
 *   ~/dev/demo-dental-clinic   ← template (this repo)
 *   ~/dev/bright-smile-dental  ← new clinic (generated)
 *
 * Usage:
 *   node scripts/scaffold-clinic.mjs --config configs/my-clinic.json
 *   node scripts/scaffold-clinic.mjs --config configs/my-clinic.json --out ../bright-smile-dental
 *   DEV_DIR=~/dev make new-clinic CONFIG=configs/my-clinic.json
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, resolveOutputDir, assertNotTemplateRoot } from "./lib/resolve-output.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.resolve(__dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".data",
  "out",
  "coverage",
  ".vercel",
  ".scaffold-preview",
]);

const SKIP_FILES = new Set([".env", ".DS_Store"]);

function parseArgs(argv) {
  const args = { config: null, out: null, install: true, copyOnly: false, quiet: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config" || arg === "-c") {
      args.config = path.resolve(argv[++i]);
    } else if (arg === "--out" || arg === "-o") {
      args.out = path.resolve(argv[++i]);
    } else if (arg === "--no-install") {
      args.install = false;
    } else if (arg === "--copy-only") {
      args.copyOnly = true;
    } else if (arg === "--quiet" || arg === "-q") {
      args.quiet = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (!args.config) {
    console.error("Missing --config path");
    printHelp();
    process.exit(1);
  }

  return args;
}

function printHelp() {
  console.log(`Scaffold a new clinic project from the dental clinic template.

Copies this entire Next.js app (including src/) into a new directory, then
applies your clinic config — website + staff dashboard.

Options:
  -c, --config <path>   Clinic config JSON (required)
  -o, --out <path>      Output directory (optional — see below)
      --no-install      Skip npm install after scaffolding

Output path (first match wins):
  1. --out flag
  2. "outputDir" in config JSON
  3. $DEV_DIR/<packageName>
  4. ../<packageName> next to this template repo (default)

Example — new sibling under ~/dev/:
  cp templates/clinic.config.example.json configs/bright-smile.json
  # set "packageName": "bright-smile-dental" in the config
  make new-clinic CONFIG=configs/bright-smile.json
  # → ~/dev/bright-smile-dental/
`);
}

function shouldSkipEntry(name, relativePath) {
  if (SKIP_DIRS.has(name)) return true;
  if (SKIP_FILES.has(name)) return true;
  if (name.endsWith(".tsbuildinfo")) return true;
  if (relativePath.startsWith(".cursor")) return true;
  return false;
}

function copyTemplate(src, dest, { quiet = false } = {}) {
  if (fs.existsSync(dest)) {
    console.error(`Output directory already exists: ${dest}`);
    console.error("Choose a new path or remove the existing directory.");
    process.exit(1);
  }

  fs.mkdirSync(dest, { recursive: true });

  const destResolved = path.resolve(dest);

  function walk(currentSrc, currentDest, relative = "") {
    for (const entry of fs.readdirSync(currentSrc, { withFileTypes: true })) {
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (shouldSkipEntry(entry.name, rel)) continue;

      const from = path.join(currentSrc, entry.name);
      const fromResolved = path.resolve(from);

      if (fromResolved === destResolved || fromResolved.startsWith(`${destResolved}${path.sep}`)) {
        continue;
      }

      const to = path.join(currentDest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        walk(from, to, rel);
      } else if (entry.isFile()) {
        fs.copyFileSync(from, to);
      }
    }
  }

  walk(src, dest);
  if (!quiet) {
    console.log(`Copied template (full app + src/) → ${dest}`);
  }
}

function runGenerate(configPath, outDir, { quiet = false } = {}) {
  const script = path.join(TEMPLATE_ROOT, "scripts/generate-from-config.mjs");
  const generateArgs = [script, "--config", configPath, "--root", outDir];
  if (quiet) generateArgs.push("--quiet");

  const result = spawnSync(process.execPath, generateArgs, {
    stdio: quiet ? "pipe" : "inherit",
    cwd: TEMPLATE_ROOT,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    if (quiet && result.stderr) console.error(result.stderr);
    process.exit(result.status ?? 1);
  }
}

function runInstall(outDir, { quiet = false } = {}) {
  if (!quiet) console.log("\nRunning npm install...");
  const result = spawnSync("npm", ["install"], {
    stdio: quiet ? "pipe" : "inherit",
    cwd: outDir,
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    if (quiet && result.stderr) console.error(result.stderr);
    console.warn("npm install failed — run it manually inside the new project.");
  }
}

function main() {
  const args = parseArgs(process.argv);
  const config = loadConfig(args.config);
  const outDir = resolveOutputDir({
    config,
    templateRoot: TEMPLATE_ROOT,
    cliOut: args.out,
  });
  assertNotTemplateRoot(outDir, TEMPLATE_ROOT);

  if (!args.quiet) {
    console.log("Scaffolding clinic project...");
    console.log(`  config: ${args.config}`);
    console.log(`  output: ${outDir}`);
  }

  copyTemplate(TEMPLATE_ROOT, outDir, { quiet: args.quiet });

  if (!args.copyOnly) {
    runGenerate(args.config, outDir, { quiet: args.quiet });
    if (args.install) {
      runInstall(outDir, { quiet: args.quiet });
    }
  }

  if (!args.quiet) {
    console.log("\n✓ New clinic project ready:");
    console.log(`  cd ${outDir}`);
    console.log("  npm run dev");
  }
}

main();
