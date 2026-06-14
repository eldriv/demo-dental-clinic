#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, resolveOutputDir } from "./lib/resolve-output.mjs";
import { resolveConfigPath } from "./lib/resolve-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readArg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const name = readArg("--name") ?? readArg("-n");
const configArg = readArg("--config") ?? readArg("-c");

try {
  const configPath = resolveConfigPath(root, { name, explicitConfig: configArg });
  const config = loadConfig(configPath);
  const outDir = resolveOutputDir({ config, templateRoot: root, cliOut: null });
  console.log(outDir);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
