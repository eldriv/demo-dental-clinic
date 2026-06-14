import fs from "node:fs";
import path from "node:path";

export function resolveConfigPath(root, { name, explicitConfig }) {
  if (explicitConfig) {
    return path.resolve(explicitConfig);
  }

  if (!name) {
    throw new Error("Pass NAME=... or --config path");
  }

  const userConfig = path.join(root, "configs", `${name}.json`);
  const exampleConfig = path.join(root, "configs", `${name}.example.json`);

  if (fs.existsSync(userConfig)) return userConfig;
  if (fs.existsSync(exampleConfig)) return exampleConfig;

  throw new Error(
    `No config for "${name}". Create configs/${name}.json or configs/${name}.example.json`,
  );
}

export function ensureUserConfig(root, configPath, name) {
  if (!name) return configPath;

  const userConfig = path.join(root, "configs", `${name}.json`);
  if (path.resolve(configPath) === path.resolve(userConfig)) return configPath;
  if (fs.existsSync(userConfig)) return userConfig;

  fs.mkdirSync(path.dirname(userConfig), { recursive: true });
  fs.copyFileSync(configPath, userConfig);
  console.log(`Created configs/${name}.json from example — customize it anytime.\n`);
  return userConfig;
}
