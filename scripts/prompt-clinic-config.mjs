#!/usr/bin/env node
/**
 * Interactive prompts — essentials only.
 * All website copy defaults to lorem / template placeholder text.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrompter, isInteractive, slugify } from "./lib/prompt.mjs";
import { banner, section, summaryBox, ui, success, note } from "./lib/cli-ui.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_CONFIG = path.join(ROOT, "configs", "bright-smile.example.json");
const TOTAL_STEPS = 2;

const DEFAULT_BRAND = {
  primary: "#3B7A5C",
  primaryLight: "#4A9A72",
  accent: "#D4729B",
  accentLight: "#E8A0BF",
  dark: "#1A3C34",
  darkLight: "#2A5248",
  cream: "#FAF7F2",
  surface: "#F4F1EC",
};

function loadTemplate() {
  if (!fs.existsSync(TEMPLATE_CONFIG)) {
    throw new Error(`Template config not found: ${TEMPLATE_CONFIG}`);
  }
  return JSON.parse(fs.readFileSync(TEMPLATE_CONFIG, "utf8"));
}

function deriveShortName(fullName) {
  const withoutSuffix = fullName.replace(/\s+dental(\s+clinic)?$/i, "").trim();
  return withoutSuffix || fullName.split(" ")[0] || fullName;
}

/** Placeholder copy — not collected in the wizard. */
function placeholderCopy(template, city) {
  const base = template.copy;
  return {
    ...base,
    about: {
      ...base.about,
      titleAccent: city,
    },
  };
}

function buildConfig(answers) {
  const template = loadTemplate();
  const slug = slugify(answers.clinicName);
  const packageName = answers.packageName || `${slug}-dental`;
  const shortName = deriveShortName(answers.clinicName);
  const city = answers.city;
  const phone = answers.phone;
  const email = answers.email;
  const copy = placeholderCopy(template, city);

  return {
    slug,
    packageName,
    site: {
      name: answers.clinicName,
      shortName,
      tagline: template.site.tagline,
      type: "dental clinic",
      description: template.site.description,
      location: {
        city,
        province: template.site.location.province,
        country: template.site.location.country,
        address: answers.address,
        landmark: "",
        mapEmbedUrl: template.site.location.mapEmbedUrl,
        coordinates: template.site.location.coordinates,
      },
      contact: {
        phones: phone.includes(",") ? phone.split(",").map((p) => p.trim()) : [phone],
        email,
        facebook: "",
      },
      hours: template.site.hours,
      social: template.site.social,
    },
    brand: { ...DEFAULT_BRAND },
    copy,
    admin: template.admin,
    env: {
      siteUrl: "http://localhost:3000",
      clinicEmail: email,
      devPasswordHint: "smilecare2026",
    },
  };
}

export async function promptForClinicConfig() {
  if (!isInteractive()) {
    throw new Error(
      "Interactive mode requires a terminal. Use: make clinic NAME=your-clinic\nOr: make clinic CONFIG=configs/your-clinic.json",
    );
  }

  banner();
  note("Only essentials are asked — name, location, and contact.");
  note("Website text uses placeholder copy (edit src/content/ later).\n");

  const { askRequired, confirm, close } = createPrompter();

  section(1, TOTAL_STEPS, "Clinic details", "Real info shown on the site and in emails");

  const clinicName = await askRequired("Clinic full name", "", {
    hint: "e.g. Bright Smile Dental Clinic",
  });
  const city = await askRequired("City / town", "", {
    hint: "e.g. Tiaong, Quezon City",
  });
  const address = await askRequired("Street address", "", {
    hint: "Full address patients can visit",
  });
  const phone = await askRequired("Phone number", "", {
    hint: "One number, or separate multiple with commas",
  });
  const email = await askRequired("Clinic email", "", {
    hint: "Used for booking confirmations",
  });

  section(2, TOTAL_STEPS, "Project folder", "Where to create the new clinic on your machine");

  const defaultFolder = `${slugify(clinicName)}-dental`;
  const packageName = await askRequired("Folder name", defaultFolder, {
    hint: `Created at ~/dev/${defaultFolder}/`,
  });

  const answers = { clinicName, city, address, phone, email, packageName };
  const config = buildConfig(answers);
  const configPath = path.join(ROOT, "configs", `${config.slug}.json`);
  const outDir = path.resolve(ROOT, "..", config.packageName);

  summaryBox([
    ["Clinic", ui.bold(config.site.name)],
    ["City", city],
    ["Address", config.site.location.address],
    ["Phone", config.site.contact.phones.join(", ")],
    ["Email", config.site.contact.email],
    ["Copy", ui.dim("placeholder (lorem) — edit after setup")],
    ["Config", `configs/${config.slug}.json`],
    ["Output", outDir],
  ]);

  note("Creates website + booking + staff dashboard");
  const proceed = await confirm("Create this clinic project?", true);
  await close();

  if (!proceed) {
    console.log(ui.dim("\n  Cancelled — no files were created.\n"));
    process.exit(0);
  }

  return { config, configPath };
}

export function writeClinicConfig(configPath, config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  promptForClinicConfig()
    .then(({ config, configPath }) => {
      writeClinicConfig(configPath, config);
      success(`Saved ${path.relative(ROOT, configPath)}`);
    })
    .catch((error) => {
      console.error(ui.red(`\n  ✗ ${error.message}\n`));
      process.exit(1);
    });
}
