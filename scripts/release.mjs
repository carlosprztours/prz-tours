import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { z } from "zod";
import { analyze, bumpVersion, changelogEntry, git, manifestSchema, officialTags, preparation, readPlan, validateManifest } from "./lib/versioning.mjs";

import { assertReleaseTooling } from "./lib/release-publication.mjs";

const plan = readPlan();
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const action = process.argv[2] ?? "check";
const entry = changelogEntry(plan);
const schema = JSON.stringify(z.toJSONSchema(manifestSchema), null, 2) + "\n";
const prefix = "# Changelog\n\nLas entradas documentan cambios verificables. La publicación oficial se registra en GitHub Releases.\n\n";
const existing = readFileSync("CHANGELOG.md", "utf8");
const heading = `## [${plan.version}]\n`;
const sections = existing.split(/(?=^## \[)/m).slice(1);
if (action === "generate") {
  writeFileSync("CHANGELOG.md", prefix + [entry, ...sections.filter(section => !section.startsWith(heading))].map(s => s.trimEnd()).join("\n\n") + "\n");
  writeFileSync("agencyos-update.schema.json", schema);
} else {
  if (pkg.version !== plan.version || lock.version !== plan.version || lock.packages[""].version !== plan.version) {
    throw new Error("La versión debe coincidir en package.json, package-lock.json y release-plan.json.");
  }
  if (sections.filter(section => section.startsWith(heading)).length !== 1 || sections[0].trimEnd() !== entry.trimEnd()) {
    throw new Error("Changelog desactualizado. Ejecuta npm run release:generate.");
  }
  if (readFileSync("agencyos-update.schema.json", "utf8") !== schema) throw new Error("Esquema AgencyOS desactualizado.");
  if (action !== "check") {
    if (!["suggest", "prepare"].includes(action)) throw new Error("Comando desconocido.");
    const toolingSha = git("rev-parse", "HEAD");
    const head = action === "prepare" ? process.env.APPROVED_SHA || toolingSha : toolingSha;
    assertReleaseTooling(head, toolingSha);
    const previous = officialTags()[0];
    const info = action === "prepare" ? preparation(plan, head) : {
      previous: previous ?? null,
      ...analyze(previous ? git("rev-parse", `refs/tags/${previous}^{commit}`) : plan.baseline, head),
    };
    const type = info.classification.suggestion;
    const suggestedVersion = info.previous && ["patch", "minor", "major"].includes(type)
      ? bumpVersion(info.previous.slice(1), type) : null;
    console.log(JSON.stringify({ previous: info.previous ?? null, baseline: info.baseline, suggestedVersion, ...info.classification }, null, 2));
    if (action === "prepare") {
      const metadata = { ...plan };
      delete metadata.baseline;
      delete metadata.version;
      const output = validateManifest({
        ...metadata,
        schemaVersion: 1,
        current: { version: info.previous?.slice(1) ?? null, sha: info.baseline, tag: info.previous ?? null },
        candidate: { version: plan.version, sha: head, tag: info.tag },
        publishedAt: null,
        publicationSource: `https://api.github.com/repos/${plan.project.repository}/releases/tags/${info.tag}`,
        migrations: info.changes.filter(({ file }) => /^migrations\/[^/]+\.sql$/.test(file)),
        dependencies: Object.fromEntries(["next", "@opennextjs/cloudflare", "zod"].map(name => [name, lock.packages[`node_modules/${name}`].version])),
        approval: "pending",
        deployment: { state: "unverified", environment: "production", runId: null },
      });
      const directory = process.argv[3] ?? ".release";
      mkdirSync(directory, { recursive: true });
      writeFileSync(`${directory}/agencyos-update.json`, JSON.stringify(output, null, 2) + "\n");
      writeFileSync(`${directory}/notes.md`, `${entry}\nSHA: \`${head}\`\n\nMigraciones: ${output.migrations.map(x => `\`${x.file}\` (${x.change})`).join(", ") || "ninguna"}\n`);
    }
  }
}
