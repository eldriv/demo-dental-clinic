import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ui, colorSwatch, note, warn } from "./cli-ui.mjs";

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export function createPrompter() {
  const rl = readline.createInterface({ input, output });

  function formatDefault(defaultValue) {
    if (defaultValue === undefined || defaultValue === "") return "";
    return ui.dim(`  default: ${defaultValue}`);
  }

  async function ask(label, defaultValue, { hint, optional = false } = {}) {
    const tag = optional ? ui.dim(" · optional") : "";
    console.log(`${ui.cyan("  ›")} ${ui.bold(label)}${tag}`);
    if (hint) note(hint);
    if (defaultValue !== undefined && defaultValue !== "") {
      console.log(`  ${formatDefault(defaultValue)}`);
    }

    const answer = (await rl.question(ui.dim("    ") + ui.yellow("→ "))).trim();
    const value = answer || (defaultValue ?? "");

    if (value && label.toLowerCase().includes("color") && /^#[0-9a-fA-F]{6}$/.test(value)) {
      console.log(`    ${colorSwatch(value)}`);
    }

    console.log("");
    return value;
  }

  async function askRequired(label, defaultValue, options = {}) {
    while (true) {
      const value = await ask(label, defaultValue, options);
      if (value) return value;
      warn("This field is required — please enter a value.");
      console.log("");
    }
  }

  async function choose(label, options, defaultIndex = 0) {
    console.log(`${ui.cyan("  ›")} ${ui.bold(label)}`);
    console.log("");
    options.forEach((opt, i) => {
      const marker = i === defaultIndex ? ui.green("●") : ui.dim("○");
      console.log(`    ${marker} ${ui.dim(String(i + 1) + ".")} ${opt}`);
    });
    console.log("");

    while (true) {
      const answer = (await rl.question(
        ui.dim("    ") + ui.yellow(`→ Pick 1–${options.length} `),
      )).trim();
      if (!answer) return options[defaultIndex];
      const num = Number(answer);
      if (num >= 1 && num <= options.length) {
        console.log("");
        return options[num - 1];
      }
      warn(`Enter a number between 1 and ${options.length}.`);
    }
  }

  async function confirm(question, defaultYes = true) {
    const hint = defaultYes ? ui.green("Y") + ui.dim("/n") : ui.dim("y/") + ui.red("N");
    const answer = (await rl.question(`  ${ui.bold(question)} ${ui.dim("[")}${hint}${ui.dim("] ")}`)).trim().toLowerCase();
    if (!answer) return defaultYes;
    return answer === "y" || answer === "yes";
  }

  async function close() {
    await rl.close();
  }

  return { ask, askRequired, choose, confirm, close };
}
