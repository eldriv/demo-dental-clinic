#!/usr/bin/env node
/**
 * One-command clinic scaffold: config → copy template → generate → npm install → .env
 *
 *   make clinic                    (interactive prompts)
 *   make clinic NAME=bright-smile  (use existing config)
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, resolveOutputDir, assertNotTemplateRoot } from "./lib/resolve-output.mjs";
import { resolveConfigPath, ensureUserConfig } from "./lib/resolve-config.mjs";
import { isInteractive } from "./lib/prompt.mjs";
import { promptForClinicConfig, writeClinicConfig } from "./prompt-clinic-config.mjs";
import {
  divider,
  doneBlock,
  error as uiError,
  progressDone,
  progressStep,
  success,
  ui,
} from "./lib/cli-ui.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_STEPS = 5;

function parseArgs(argv) {
  const args = { name: null, config: null, install: true, dev: false, interactive: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--name" || arg === "-n") args.name = argv[++i];
    else if (arg === "--config" || arg === "-c") args.config = path.resolve(argv[++i]);
    else if (arg === "--interactive" || arg === "-i") args.interactive = true;
    else if (arg === "--no-install") args.install = false;
    else if (arg === "--dev") args.dev = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  make clinic                         Interactive prompts
  make clinic NAME=bright-smile       Use configs/bright-smile.json
  make clinic DEV=1                   Start dev server after scaffold`);
      process.exit(0);
    }
  }
  return args;
}

async function resolveConfig(args) {
  if (args.config) return args.config;

  if (args.interactive || (!args.name && isInteractive())) {
    const { config, configPath } = await promptForClinicConfig();
    writeClinicConfig(configPath, config);
    success(`Saved config → ${path.relative(ROOT, configPath)}`);
    divider();
    return configPath;
  }

  if (!args.name) {
    uiError("No config specified.");
    console.log(ui.dim("  Run interactively:  make clinic"));
    console.log(ui.dim("  Or pass a name:     make clinic NAME=bright-smile\n"));
    process.exit(1);
  }

  try {
    const found = resolveConfigPath(ROOT, { name: args.name, explicitConfig: null });
    return ensureUserConfig(ROOT, found, args.name);
  } catch (err) {
    uiError(err.message);
    process.exit(1);
  }
}

function runQuiet(cmd, cmdArgs, options = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: options.cwd ?? ROOT,
    stdio: options.inherit ? "inherit" : "pipe",
    encoding: "utf8",
    shell: options.shell ?? false,
  });
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.stdout) process.stderr.write(result.stdout);
    process.exit(result.status ?? 1);
  }
  return result;
}

function ensureEnv(outDir) {
  const envPath = path.join(outDir, ".env");
  const examplePath = path.join(outDir, ".env.example");
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    progressDone("Environment file (.env)");
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const configPath = await resolveConfig(args);
  const config = loadConfig(configPath);
  const outDir = resolveOutputDir({ config, templateRoot: ROOT, cliOut: null });
  assertNotTemplateRoot(outDir, ROOT);

  if (fs.existsSync(outDir)) {
    uiError(`Project already exists: ${outDir}`);
    console.log(ui.dim("  Remove it first or pick a different output folder name.\n"));
    process.exit(1);
  }

  console.log("");
  console.log(ui.bold("  Building your clinic project"));
  divider();
  console.log("");

  progressStep(1, BUILD_STEPS, "Copying template (src, dashboard, APIs)");
  runQuiet(process.execPath, [
    path.join(ROOT, "scripts/scaffold-clinic.mjs"),
    "--config", configPath,
    "--out", outDir,
    "--copy-only", "--quiet",
  ]);
  progressDone("Template copied");

  progressStep(2, BUILD_STEPS, "Generating clinic content & brand assets");
  runQuiet(process.execPath, [
    path.join(ROOT, "scripts/generate-from-config.mjs"),
    "--config", configPath,
    "--root", outDir,
    "--quiet",
  ]);
  progressDone("Content & assets generated");

  if (args.install) {
    progressStep(3, BUILD_STEPS, "Installing dependencies (npm install)");
    runQuiet("npm", ["install"], { cwd: outDir, inherit: true });
    progressDone("Dependencies installed");
  } else {
    progressStep(3, BUILD_STEPS, "Skipping npm install");
    progressDone("Skipped");
  }

  progressStep(4, BUILD_STEPS, "Setting up environment");
  ensureEnv(outDir);

  progressStep(5, BUILD_STEPS, "Finalizing");
  progressDone("All done");

  doneBlock(outDir, path.relative(ROOT, configPath));

  if (args.dev) {
    console.log(ui.bold("  Starting dev server...\n"));
    spawnSync("npm", ["run", "dev"], { cwd: outDir, stdio: "inherit", shell: true });
  }
}

main().catch((err) => {
  uiError(err.message);
  process.exit(1);
});
