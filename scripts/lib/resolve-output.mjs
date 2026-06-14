#!/usr/bin/env node
/**
 * Resolve where a scaffolded clinic project should be created.
 *
 * Priority:
 *   1. CLI --out
 *   2. config.outputDir (absolute or relative to template root)
 *   3. DEV_DIR / ~/dev + config.packageName
 *   4. template parent + config.packageName  (sibling folder in dev/)
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

export function resolveOutputDir({ config, templateRoot, cliOut, devDir = process.env.DEV_DIR }) {
  if (cliOut) {
    return path.resolve(cliOut);
  }

  if (config.outputDir) {
    return path.isAbsolute(config.outputDir)
      ? path.resolve(config.outputDir)
      : path.resolve(templateRoot, config.outputDir);
  }

  const folderName = config.packageName || config.slug;
  if (!folderName) {
    throw new Error(
      "No output path. Pass --out, set config.outputDir, or set config.packageName in the JSON config.",
    );
  }

  if (devDir) {
    return path.resolve(devDir, folderName);
  }

  // Default: sibling directory next to the template repo (e.g. ~/dev/bright-smile-dental)
  return path.resolve(templateRoot, "..", folderName);
}

export function assertNotTemplateRoot(outputDir, templateRoot) {
  const out = path.resolve(outputDir);
  const root = path.resolve(templateRoot);
  if (out === root) {
    throw new Error(
      `Output path is the template repo itself (${root}).\n` +
        `Set a unique "packageName" in your config (e.g. "bright-smile-dental") or pass --out ../your-clinic.`,
    );
  }
}
