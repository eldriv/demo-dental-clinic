#!/usr/bin/env node
/**
 * Generate clinic content, theme colors, env, and assets from a JSON config.
 *
 * Usage:
 *   node scripts/generate-from-config.mjs --config templates/clinic.config.example.json
 *   node scripts/generate-from-config.mjs --config configs/my-clinic.json --assets-only
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultServices } from "./lib/default-services.mjs";
import { fileHeader, tsString, tsValue } from "./lib/ts-writer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
let QUIET = false;

function log(...parts) {
  if (!QUIET) console.log(...parts);
}

function parseArgs(argv) {
  const args = { config: null, root: ROOT, assetsOnly: false, contentOnly: false, quiet: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config" || arg === "-c") {
      args.config = argv[++i];
    } else if (arg === "--root" || arg === "-r") {
      args.root = path.resolve(argv[++i]);
    } else if (arg === "--assets-only") {
      args.assetsOnly = true;
    } else if (arg === "--content-only") {
      args.contentOnly = true;
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

  args.config = path.resolve(args.config);
  return args;
}

function printHelp() {
  console.log(`Generate clinic project files from JSON config.

Options:
  -c, --config <path>   Clinic config JSON (required)
  -r, --root <path>     Project root to write into (default: repo root)
      --assets-only     Only regenerate logo + OG image
      --content-only    Skip asset generation
`);
}

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  log(`  wrote ${relativePath}`);
}

function generateSiteTs(config) {
  const { site, brand } = config;
  const loc = site.location;
  const fullAddress = loc.address;

  return `${fileHeader()}import { lorem } from "./lorem";

export const site = ${tsValue({
  name: site.name,
  shortName: site.shortName ?? site.name.split(" ")[0],
  tagline: site.tagline,
  type: site.type ?? "dental clinic",
  description: site.description,
  location: {
    city: loc.city,
    province: loc.province,
    country: loc.country,
    full: fullAddress,
    landmark: loc.landmark ?? "",
    mapEmbedUrl: loc.mapEmbedUrl,
    coordinates: loc.coordinates,
  },
  contact: {
    phones: site.contact.phones,
    email: site.contact.email,
    facebook: site.contact.facebook ?? "",
  },
  hours: site.hours,
  brand: {
    primary: brand.primary,
    accent: brand.accent,
    dark: brand.dark,
    cream: brand.cream,
    surface: brand.surface,
  },
  social: site.social,
})} as const;

export type Site = typeof site;
`;
}

function generateLoremTs(config) {
  const copy = config.copy;
  const loc = config.site.location;
  const contact = config.site.contact;

  return `${fileHeader()}export const lorem = ${tsValue({
    short: copy.short,
    medium: copy.medium,
    long: copy.long,
    quote: copy.quote,
    paragraphs: copy.paragraphs,
    contact: {
      address: loc.address,
      landmark: loc.landmark ?? "",
      phones: contact.phones,
      email: contact.email,
    },
  })} as const;
`;
}

function generateAdminTs(config) {
  const { admin } = config;
  return `${fileHeader()}export type AdminRole = "owner" | "staff";

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

/** Staff accounts — passwords come from environment variables only. */
export const adminAccounts: AdminAccount[] = [
  {
    id: "owner",
    email: "owner",
    name: ${tsString(admin.owner.name)},
    role: "owner",
  },
  {
    id: "staff",
    email: "staff",
    name: ${tsString(admin.staff.name)},
    role: "staff",
  },
];

export function getAdminAccountByEmail(email: string): AdminAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return adminAccounts.find((account) => account.email.toLowerCase() === normalized);
}

export function getAdminAccountById(id: string): AdminAccount | undefined {
  return adminAccounts.find((account) => account.id === id);
}

export function canManageClinicSettings(_role: AdminRole): boolean {
  return true;
}

export function getRoleLabel(role: AdminRole): string {
  return role === "owner" ? "Owner" : "Front Desk";
}
`;
}

function generateSectionsTs(config) {
  const copy = config.copy;
  const hero = copy.hero;
  const about = copy.about;

  return `${fileHeader()}import { site } from "./site";
import { lorem } from "./lorem";

export const hero = {
  label: ${tsString(`Welcome to ${config.site.shortName ?? config.site.name.split(" ")[0]}`)},
  titleLine1: ${tsString(hero.titleLine1)},
  titleAccent: ${tsString(hero.titleAccent)},
  titleLine2: ${tsString(hero.titleLine2)},
  description: lorem.long,
  ctaPrimary: { label: "Book Appointment", href: "#booking" },
  ctaSecondary: { label: "Our Services", href: "#services" },
  rating: site.social.rating,
  reviewCount: site.social.reviewCount,
  patientAvatars: 4,
};

export const about = {
  label: "About Us",
  title: ${tsString(about.title)},
  titleAccent: ${tsString(about.titleAccent)},
  titleEnd: ${tsString(about.titleEnd)},
  story: [...lorem.paragraphs],
  stats: ${tsValue(about.stats)},
};

export const servicesIntro = {
  label: "Our Services",
  title: "Comprehensive",
  titleAccent: "Dental",
  titleEnd: "Care for Every Need",
  description: lorem.medium,
};

export const beforeAfter = {
  label: "Results",
  title: "Real",
  titleAccent: "Transformations",
  titleEnd: "You Can Trust",
  description: lorem.medium,
  cases: [
    {
      id: "whitening",
      title: "Professional Whitening",
      description: lorem.short,
    },
    {
      id: "veneers-case",
      title: "Porcelain Veneers",
      description: lorem.short,
    },
    {
      id: "implants-case",
      title: "Dental Implants",
      description: lorem.short,
    },
  ],
};

export const team = {
  label: "Our Team",
  title: "Meet the",
  titleAccent: "Experts",
  titleEnd: "Behind Your Smile",
  description: lorem.medium,
  members: ${tsValue(
    copy.team.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      bio: member.bio,
    })),
  )},
};

export const testimonials = {
  label: "Testimonials",
  title: "What Our",
  titleAccent: "Patients",
  titleEnd: "Are Saying",
  quotes: ${tsValue(copy.testimonials)},
};

export const booking = {
  label: "Book Now",
  title: "Schedule Your",
  titleAccent: "Appointment",
  titleEnd: "Today",
  description: lorem.medium,
  timeSlots: [
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "1:00 PM",
    "1:30 PM",
    "2:00 PM",
    "2:30 PM",
    "3:00 PM",
    "3:30 PM",
    "4:00 PM",
    "4:30 PM",
  ],
};

export const faq = {
  label: "FAQ",
  title: "Frequently Asked",
  titleAccent: "Questions",
  categories: [
    {
      id: "general",
      name: "General",
      items: [
        {
          question: "What should I bring to my first appointment?",
          answer: lorem.long,
        },
        {
          question: "Do you accept dental insurance?",
          answer: lorem.long,
        },
        {
          question: "Is your clinic wheelchair accessible?",
          answer: lorem.long,
        },
      ],
    },
    {
      id: "appointments",
      name: "Appointments",
      items: [
        {
          question: "How do I book an appointment?",
          answer: lorem.long,
        },
        {
          question: "What is your cancellation policy?",
          answer: lorem.long,
        },
        {
          question: "Do you offer emergency appointments?",
          answer: lorem.long,
        },
      ],
    },
    {
      id: "services",
      name: "Services",
      items: [
        {
          question: "How often should I get a dental cleaning?",
          answer: lorem.long,
        },
        {
          question: "Is teeth whitening safe?",
          answer: lorem.long,
        },
        {
          question: "How long do dental implants last?",
          answer: lorem.long,
        },
      ],
    },
  ],
};

export const contact = {
  label: "Contact",
  title: "Visit Our",
  titleAccent: "Clinic",
  titleEnd: "Today",
  description: lorem.medium,
};
`;
}

function generateServicesTs(config) {
  const services = (config.services ?? defaultServices).map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description ?? "lorem.short",
    icon: service.icon,
  }));

  const lines = services.map((service) => {
    const desc =
      service.description === "lorem.short"
        ? "lorem.short"
        : tsString(service.description);
    return `  {
    id: ${tsString(service.id)},
    name: ${tsString(service.name)},
    description: ${desc},
    icon: ${tsString(service.icon)},
  }`;
  });

  return `${fileHeader()}import { lorem } from "./lorem";

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const services: Service[] = [
${lines.join(",\n")},
];
`;
}

function patchGlobalsCss(root, brand) {
  const cssPath = path.join(root, "src/app/globals.css");
  if (!fs.existsSync(cssPath)) {
    console.warn("  skipped globals.css (not found)");
    return;
  }

  let css = fs.readFileSync(cssPath, "utf8");
  const replacements = [
    ["--color-primary:", brand.primary],
    ["--color-primary-light:", brand.primaryLight ?? brand.primary],
    ["--color-accent:", brand.accent],
    ["--color-accent-light:", brand.accentLight ?? brand.accent],
    ["--color-dark:", brand.dark],
    ["--color-dark-light:", brand.darkLight ?? brand.dark],
    ["--color-cream:", brand.cream],
    ["--color-surface:", brand.surface],
  ];

  for (const [prop, color] of replacements) {
    const regex = new RegExp(`(${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*)#[0-9a-fA-F]{3,8}`, "g");
    css = css.replace(regex, `$1${color}`);
  }

  fs.writeFileSync(cssPath, css, "utf8");
  log("  patched src/app/globals.css theme colors");
}

function patchPackageJson(root, packageName) {
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = packageName;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  log(`  patched package.json name → ${packageName}`);
}

function generateEnv(root, config) {
  const examplePath = path.join(root, ".env.example");
  const envPath = path.join(root, ".env");
  const { env, site } = config;
  const siteUrl = env.siteUrl ?? "http://localhost:3000";

  let template = fs.existsSync(examplePath)
    ? fs.readFileSync(examplePath, "utf8")
    : "";

  const values = {
    SITE_URL: siteUrl,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    CLINIC_EMAIL: env.clinicEmail ?? site.contact.email,
  };

  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(template)) {
      template = template.replace(regex, `${key}=${value}`);
    } else {
      template += `\n${key}=${value}`;
    }
  }

  writeFile(root, ".env.example", template.trimEnd() + "\n");

  if (!fs.existsSync(envPath)) {
    writeFile(root, ".env", template.trimEnd() + "\n");
  } else {
    log("  kept existing .env (not overwritten)");
  }
}

function generateAssets(root, config) {
  const script = path.join(ROOT, "scripts/generate-assets.py");
  const { brand } = config;
  const publicDir = path.join(root, "public");
  fs.mkdirSync(publicDir, { recursive: true });

  const args = [
    script,
    "--primary",
    brand.primary,
    "--accent",
    brand.accent,
    "--dark",
    brand.dark,
    "--output",
    publicDir,
  ];

  const result = spawnSync("python3", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("Asset generation failed.");
    process.exit(result.status ?? 1);
  }
}

function generateContent(root, config) {
  log("Generating content files...");
  writeFile(root, "src/content/site.ts", generateSiteTs(config));
  writeFile(root, "src/content/lorem.ts", generateLoremTs(config));
  writeFile(root, "src/content/admin.ts", generateAdminTs(config));
  writeFile(root, "src/content/sections.ts", generateSectionsTs(config));
  writeFile(root, "src/content/services.ts", generateServicesTs(config));
  patchGlobalsCss(root, config.brand);
  patchPackageJson(root, config.packageName ?? config.slug);
  generateEnv(root, config);
}

function main() {
  const args = parseArgs(process.argv);
  QUIET = args.quiet;
  const config = loadConfig(args.config);

  log(`Using config: ${args.config}`);
  log(`Target root: ${args.root}`);

  if (args.assetsOnly) {
    generateAssets(args.root, config);
    return;
  }

  generateContent(args.root, config);

  if (!args.contentOnly) {
    generateAssets(args.root, config);
  }

  log("\nDone.");
  if (!QUIET) {
    log("  npm install   # if new project");
    log("  npm run dev   # start locally");
    log(`  Admin login password (dev): set ADMIN_PASSWORD in .env or use ${config.env?.devPasswordHint ?? "your configured password"}`);
  }
}

main();
