#!/usr/bin/env node
/** Sincroniza package.json y el módulo de versión desde version.toml. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toml = readFileSync(resolve(root, "version.toml"), "utf8");
const section = toml.match(/^\[app\]\s*$([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1] ?? toml;
const version = section.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1];
const channel = section.match(/^channel\s*=\s*"([^"]+)"\s*$/m)?.[1];
if (!version || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error("version.toml: app.version debe ser SemVer");
if (!channel || !["preview", "stable"].includes(channel)) throw new Error("version.toml: app.channel debe ser preview o stable");
const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = version;
const pkgContent = JSON.stringify(pkg, null, 2) + "\n";
const moduleContent = `// Generado por scripts/sync-version.mjs; no editar a mano.\nexport const APP_VERSION = "${version}" as const;\nexport const APP_CHANNEL = "${channel}" as const;\n`;
const generatedPath = resolve(root, "src/lib/app-version.ts");
const check = process.argv.includes("--check");
if (check) {
  if (readFileSync(pkgPath, "utf8") !== pkgContent || readFileSync(generatedPath, "utf8") !== moduleContent) {
    console.error("Versión desincronizada: ejecuta npm run version:sync");
    process.exitCode = 1;
  } else console.log(`Versiones sincronizadas: ${version} (${channel})`);
} else {
  writeFileSync(pkgPath, pkgContent);
  writeFileSync(generatedPath, moduleContent);
  console.log(`Versión sincronizada: ${version} (${channel})`);
}
