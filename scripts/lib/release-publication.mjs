import { createHash } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { changeSet, git, shaPattern, validateManifest } from "./versioning.mjs";

const name = "agencyos-update.json";
const digestOf = bytes => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const toolingFiles = new Set([
  ".github/workflows/deploy.yml", "docs/RELEASES.md", "scripts/release.mjs",
  "scripts/publish-release.mjs", "scripts/lib/release-publication.mjs", "scripts/test-versioning.mjs",
]);

export function assertReleaseTooling(approved, head) {
  if (!shaPattern.test(approved) || !shaPattern.test(head)) throw new Error("SHA inválido.");
  if (approved === head) return;
  git("merge-base", "--is-ancestor", approved, head);
  if (changeSet(approved, head).some(({ file }) => !toolingFiles.has(file))) {
    throw new Error("main incluye cambios ajenos a las herramientas de publicación.");
  }
}

async function verifyAsset(remote, releaseId, expected) {
  for (const delay of [0, 500, 1000, 2000, 4000]) {
    if (delay) await wait(delay);
    const matches = (await remote.assets(releaseId)).filter(item => item.name === name);
    if (matches.length > 1) throw new Error("Hay manifiestos duplicados.");
    const asset = matches[0];
    if (asset?.state !== "uploaded") continue;
    if (asset.digest && asset.digest !== expected) throw new Error("El SHA-256 del manifiesto no coincide.");
    const observed = asset.digest || digestOf(await remote.download(asset.id));
    if (observed !== expected) throw new Error("El SHA-256 del manifiesto no coincide.");
    return;
  }
  throw new Error("GitHub no mostró el manifiesto como cargado dentro del plazo. Reintenta sin reemplazar el archivo.");
}

export async function publishRelease(remote, candidate, notes, runId, toolingSha = candidate.candidate.sha) {
  const { tag, sha } = candidate.candidate;
  if (await remote.main() !== toolingSha) throw new Error("main cambió durante la publicación.");
  const resuming = toolingSha !== sha;
  if (!await remote.deployed(sha, runId)) throw new Error("Sin evidencia de despliegue exitoso para el SHA.");
  const existing = await remote.tag(tag);
  if (existing && existing !== sha) throw new Error("La etiqueta existe para otro SHA.");
  if (resuming && !existing) throw new Error("La recuperación requiere una etiqueta existente.");
  if (!existing) await remote.createTag(tag, sha);
  if (await remote.tag(tag) !== sha) throw new Error("No se pudo verificar la etiqueta.");
  const marker = `<!-- prz-release-sha:${sha} -->`;
  let release = await remote.release(tag);
  if (resuming && !release) throw new Error("La recuperación requiere una release existente.");
  if (!release) release = await remote.createDraft(tag, marker + "\n\n" + notes);
  if (release.tag_name !== tag || !release.body?.startsWith(marker)) {
    throw new Error("Existe una release ajena a esta publicación. No se modificará.");
  }
  const manifest = validateManifest({
    ...candidate,
    approval: "approved",
    deployment: { state: "verified", environment: "production", runId },
  });
  const payload = JSON.stringify(manifest, null, 2) + "\n";
  const assets = await remote.assets(release.id);
  if (!assets.some(item => item.name === name)) {
    if (!release.draft) throw new Error("La release ya es pública y le falta el manifiesto.");
    await remote.upload(release.id, payload);
  }
  await verifyAsset(remote, release.id, digestOf(payload));
  if (release.draft) {
    if (await remote.main() !== toolingSha || await remote.tag(tag) !== sha) throw new Error("Cambió el SHA aprobado.");
    await remote.publish(release.id);
    release = await remote.release(tag);
  }
  if (!release || release.draft || !release.published_at) throw new Error("GitHub aún no confirma la publicación.");
  return validateManifest({ ...manifest, publishedAt: release.published_at });
}
