import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { z } from "zod";

export const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const shaPattern = /^[a-f0-9]{40}$/;
const version = z.string().regex(semver);
const sha = z.string().regex(shaPattern);
const strings = z.array(z.string().min(1));
const categories = {
  features: "Funcionalidades", fixes: "Correcciones", security: "Seguridad",
  performance: "Rendimiento", breaking: "Cambios incompatibles",
  migrations: "Migraciones", operations: "Operaciones y despliegue",
};

export const planSchema = z.strictObject({
  project: z.strictObject({ id: z.string(), name: z.string(), repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/) }),
  baseline: sha, version, type: z.enum(["initial", "patch", "minor", "major"]), decision: z.string().min(10),
  changes: z.strictObject(Object.fromEntries(Object.keys(categories).map(key => [key, strings]))),
  compatibility: z.strictObject({ node: z.string(), runtime: z.string(), schema: z.string() }),
  environmentVariables: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)),
  checks: strings, deploymentRequirements: strings, risks: strings, recovery: strings,
});

export const manifestSchema = planSchema.omit({ baseline: true, version: true }).extend({
  schemaVersion: z.literal(1),
  current: z.strictObject({ version: version.nullable(), sha, tag: z.string().nullable() }),
  candidate: z.strictObject({ version, sha, tag: z.string().regex(/^v\d+\.\d+\.\d+$/) }),
  publishedAt: z.iso.datetime().nullable(),
  publicationSource: z.url(),
  migrations: z.array(z.strictObject({ file: z.string().regex(/^migrations\/[^/]+\.sql$/), change: z.enum(["added", "modified", "removed"]) })),
  dependencies: z.record(z.string(), z.string()),
  approval: z.enum(["pending", "approved"]),
  deployment: z.strictObject({
    state: z.enum(["unverified", "verified"]),
    environment: z.literal("production"),
    runId: z.number().int().positive().nullable(),
  }),
});

export function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

export function readPlan() {
  return planSchema.parse(JSON.parse(readFileSync("release-plan.json", "utf8")));
}

export function compareVersions(a, b) {
  const right = b.split(".");
  return a.split(".").reduce((result, part, index) => {
    const delta = BigInt(part) - BigInt(right[index]);
    return result || (delta > 0n ? 1 : delta < 0n ? -1 : 0);
  }, 0);
}

export function bumpVersion(base, type) {
  const parts = version.parse(base).split(".").map(BigInt);
  const index = ["major", "minor", "patch"].indexOf(type);
  if (index < 0) throw new Error("Se requiere major, minor o patch.");
  parts[index]++;
  return parts.map((part, i) => i > index ? 0n : part).join(".");
}

export function classify(messages, changes) {
  const files = changes.map(({ file }) => file);
  const breaking = messages.some(message => /^[a-z]+(?:\([^\n)]+\))?!:|^BREAKING CHANGE:/im.test(message));
  const features = messages.some(message => /^feat(?:\([^\n)]+\))?:/i.test(message));
  const fixes = messages.some(message => /^(?:fix|perf|revert|security)(?:\([^\n)]+\))?:/i.test(message));
  const flags = {
    database: files.some(file => /^(migrations\/|src\/lib\/db\/)/.test(file)),
    api: files.some(file => /(?:^|\/)api\//.test(file)),
    configuration: files.some(file => /^(?:\.github\/|wrangler|next\.config|package)/.test(file)),
    security: messages.some(message => /^security(?:\(|:|!)/i.test(message)) ||
      files.some(file => /(?:^|\/)(?:auth|security)(?:\/|\.)/.test(file)),
  };
  const material = files.some(file => !/^(?:docs\/|[^/]+\.md$)/i.test(file));
  const suggestion = breaking ? "major" : features && material ? "minor" : fixes && material ? "patch" : material ? "manual" : "none";
  return { suggestion, flags, reviewRequired: suggestion === "manual" || Object.values(flags).some(Boolean) };
}

export function changeSet(base, head) {
  const raw = git("diff", "--no-renames", "--name-status", "-z", base, head).split("\0");
  const changes = [];
  for (let index = 0; index + 1 < raw.length; index += 2) {
    const status = raw[index];
    changes.push({ file: raw[index + 1], change: status === "A" ? "added" : status === "D" ? "removed" : "modified" });
  }
  return changes;
}

export function officialTags() {
  return git("tag", "--list").split("\n").filter(tag => tag.startsWith("v") && semver.test(tag.slice(1)))
    .sort((a, b) => compareVersions(b.slice(1), a.slice(1)));
}

export function preparation(plan, head = git("rev-parse", "HEAD")) {
  sha.parse(head);
  const tag = `v${plan.version}`;
  const tags = officialTags();
  if (tags.includes(tag) && git("rev-parse", `refs/tags/${tag}^{commit}`) !== head) {
    throw new Error("La etiqueta candidata ya existe para otro SHA.");
  }
  const previous = tags.find(name => name !== tag);
  const baseline = previous ? git("rev-parse", `refs/tags/${previous}^{commit}`) : plan.baseline;
  git("merge-base", "--is-ancestor", baseline, head);
  if (previous) {
    if (plan.type === "initial" || bumpVersion(previous.slice(1), plan.type) !== plan.version) {
      throw new Error("La versión no corresponde al incremento declarado desde la última etiqueta.");
    }
  } else if (plan.type !== "initial") {
    throw new Error("Sin etiquetas oficiales se requiere una decisión inicial explícita.");
  }
  const analysis = analyze(baseline, head);
  if (plan.type !== "initial" && analysis.classification.suggestion === "none") {
    throw new Error("El historial no contiene cambios que justifiquen una release.");
  }
  return { tag, previous, ...analysis };
}

export function analyze(baseline, head) {
  git("merge-base", "--is-ancestor", baseline, head);
  const changes = changeSet(baseline, head);
  const hashes = git("log", "--no-merges", "--format=%H", `${baseline}..${head}`).split("\n").filter(Boolean);
  const classification = classify(hashes.map(hash => git("show", "-s", "--format=%B", hash)), changes);
  return { baseline, changes, classification };
}

export function changelogEntry(plan) {
  const lines = [`## [${plan.version}]`, "", plan.decision];
  for (const [key, title] of Object.entries(categories)) {
    if (plan.changes[key].length) lines.push("", `### ${title}`, "", ...plan.changes[key].map(line => `- ${line}`));
  }
  return lines.join("\n") + "\n";
}

export function validateManifest(value) {
  const data = manifestSchema.parse(value);
  if (data.candidate.tag !== `v${data.candidate.version}` ||
      data.current.tag !== (data.current.version === null ? null : `v${data.current.version}`) ||
      data.publicationSource !== `https://api.github.com/repos/${data.project.repository}/releases/tags/${data.candidate.tag}` ||
      (data.deployment.state === "verified") !== (data.deployment.runId !== null) ||
      (data.publishedAt !== null && (data.approval !== "approved" || data.deployment.state !== "verified"))) {
    throw new Error("Metadatos de versión o estado incoherentes.");
  }
  return data;
}
