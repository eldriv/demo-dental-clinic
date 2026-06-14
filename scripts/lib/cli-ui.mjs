/** Terminal UI helpers — colors, sections, boxes. Respects NO_COLOR. */

const useColor = !process.env.NO_COLOR && process.stdout.isTTY;

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

function paint(text, ...styles) {
  if (!useColor) return String(text);
  return `${styles.join("")}${text}${c.reset}`;
}

export const ui = {
  bold: (t) => paint(t, c.bold),
  dim: (t) => paint(t, c.dim),
  green: (t) => paint(t, c.green),
  cyan: (t) => paint(t, c.cyan),
  yellow: (t) => paint(t, c.yellow),
  magenta: (t) => paint(t, c.magenta),
  blue: (t) => paint(t, c.blue),
  red: (t) => paint(t, c.red),
};

export function banner() {
  console.log("");
  console.log(ui.cyan("  ┌─────────────────────────────────────────────────────┐"));
  console.log(ui.cyan("  │") + ui.bold("  Dental Clinic Generator                           ") + ui.cyan("│"));
  console.log(ui.cyan("  │") + ui.dim("  Website + staff dashboard · one command           ") + ui.cyan("│"));
  console.log(ui.cyan("  └─────────────────────────────────────────────────────┘"));
  console.log("");
}

export function section(step, total, title, hint) {
  console.log("");
  console.log(ui.cyan(`  Step ${step}/${total}`) + ui.dim(" ─ ") + ui.bold(title));
  if (hint) console.log(ui.dim(`  ${hint}`));
  console.log("");
}

export function note(text) {
  console.log(ui.dim(`  ${text}`));
}

export function success(text) {
  console.log(ui.green(`  ✓ ${text}`));
}

export function error(text) {
  console.log(ui.red(`  ✗ ${text}`));
}

export function warn(text) {
  console.log(ui.yellow(`  ! ${text}`));
}

export function info(text) {
  console.log(ui.blue(`  → ${text}`));
}

export function divider() {
  console.log(ui.dim("  ─────────────────────────────────────────────────────"));
}

export function colorSwatch(hex) {
  if (!useColor || !/^#[0-9a-fA-F]{6}$/.test(hex)) return ui.dim(hex);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${paint("██", `\x1b[48;2;${r};${g};${b}m`)} ${hex}`;
}

export function summaryBox(rows) {
  const labelWidth = Math.max(...rows.map(([label]) => label.length), 8);
  console.log("");
  console.log(ui.bold("  Review your clinic"));
  divider();
  for (const [label, value] of rows) {
    const padded = `${label}:`.padEnd(labelWidth + 2);
    console.log(`  ${ui.dim(padded)}${value}`);
  }
  divider();
  console.log("");
}

export function doneBlock(outDir, configRel) {
  console.log("");
  console.log(ui.green("  ┌─────────────────────────────────────────────────────┐"));
  console.log(ui.green("  │") + ui.bold("  Clinic project created successfully!              ") + ui.green("│"));
  console.log(ui.green("  └─────────────────────────────────────────────────────┘"));
  console.log("");
  console.log(`  ${ui.dim("Config")}   ${ui.cyan(configRel)}`);
  console.log(`  ${ui.dim("Folder")}   ${ui.cyan(outDir)}`);
  console.log("");
  console.log(ui.bold("  Next steps:"));
  console.log(ui.yellow(`    cd ${outDir}`));
  console.log(ui.yellow("    npm run dev"));
  console.log(ui.dim("    Website → http://localhost:3000"));
  console.log(ui.dim("    Admin     → http://localhost:3000/admin/login"));
  console.log("");
}

export function progressStep(current, total, label) {
  console.log(ui.cyan(`  [${current}/${total}]`) + ` ${label}...`);
}

export function progressDone(label) {
  console.log(ui.green(`        ✓ ${label}`));
}
