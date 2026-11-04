#!/usr/bin/env node
/** Sincroniza las dependencias directas desde tools-versions.json. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));
const catalog = readJson("tools-versions.json");
const pkg = readJson("package.json");
const lock = readJson("package-lock.json");
for (const key of ["dependencies", "devDependencies"]) {
  const entries = catalog[key];
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error(`Catálogo inválido: ${key}`);
  for (const [name, version] of Object.entries(entries)) {
    if (typeof version !== "string" || !/^(?:[~^]?\d|\*|>=?\d)/.test(version)) throw new Error(`Versión inválida: ${name}`);
  }
}
const check = process.argv.includes("--check");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pkgMatches = ["dependencies", "devDependencies", "overrides"].every((key) => same(pkg[key] ?? {}, catalog[key] ?? {}));
const lockMatches = ["dependencies", "devDependencies"].every((key) => same(lock.packages?.[""]?.[key], catalog[key]));
if (check) {
  if (!pkgMatches || !lockMatches) {
    console.error("Dependencias desincronizadas: npm run tools:sync && npm install --package-lock-only");
    process.exitCode = 1;
  } else console.log("Catálogo, package.json y package-lock.json sincronizados");
} else {
  pkg.dependencies = catalog.dependencies;
  pkg.devDependencies = catalog.devDependencies;
  pkg.overrides = catalog.overrides ?? {};
  writeFileSync(resolve(root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  console.log("package.json sincronizado. Ejecuta npm install --package-lock-only para actualizar el lockfile.");
}
