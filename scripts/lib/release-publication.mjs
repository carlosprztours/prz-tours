import { createHash } from "node:crypto";
import { validateManifest } from "./versioning.mjs";

export async function publishRelease(remote, candidate, notes, runId) {
  const { tag, sha } = candidate.candidate;
  if (await remote.main() !== sha) throw new Error("El SHA aprobado ya no es el HEAD de main.");
  if (!await remote.deployed(sha, runId)) throw new Error("Sin evidencia de despliegue exitoso para el SHA.");
  const existing = await remote.tag(tag);
  if (existing && existing !== sha) throw new Error("La etiqueta existe para otro SHA.");
  if (!existing) await remote.createTag(tag, sha);
  if (await remote.tag(tag) !== sha) throw new Error("No se pudo verificar la etiqueta.");
  const marker = `<!-- prz-release-sha:${sha} -->`;
  let release = await remote.release(tag);
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
  const digest = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
  const hasManifest = item => item.name === "agencyos-update.json" && item.digest === digest;
  const asset = release.assets.find(item => item.name === "agencyos-update.json");
  if (asset && !hasManifest(asset)) throw new Error("Ya existe un manifiesto diferente. No se sobrescribirá.");
  if (!asset) {
    if (!release.draft) throw new Error("La release ya es pública y le falta el manifiesto.");
    await remote.upload(release.id, payload);
    release = await remote.release(tag);
  }
  if (!release?.assets.some(hasManifest)) throw new Error("GitHub aún no confirma la integridad del manifiesto.");
  if (release.draft) {
    if (await remote.main() !== sha || await remote.tag(tag) !== sha) throw new Error("Cambió el SHA aprobado.");
    await remote.publish(release.id);
    release = await remote.release(tag);
  }
  if (!release || release.draft || !release.published_at) throw new Error("GitHub aún no confirma la publicación.");
  return validateManifest({ ...manifest, publishedAt: release.published_at });
}
