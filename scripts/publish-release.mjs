import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { publishRelease } from "./lib/release-publication.mjs";
import { git, validateManifest } from "./lib/versioning.mjs";

const candidate = validateManifest(JSON.parse(readFileSync(".release/agencyos-update.json", "utf8")));
const notes = readFileSync(".release/notes.md", "utf8");
const { GH_TOKEN, GITHUB_REPOSITORY: repo, GITHUB_EVENT_NAME: event, GITHUB_REF: ref, APPROVED_SHA: approved, DEPLOY_RUN_ID: run } = process.env;
const runId = Number(run);
if (!GH_TOKEN || event !== "workflow_dispatch" || ref !== "refs/heads/main" || repo !== candidate.project.repository ||
    approved !== candidate.candidate.sha || git("rev-parse", "HEAD") !== approved ||
    !/^[1-9]\d*$/.test(run ?? "") || !Number.isSafeInteger(runId)) {
  throw new Error("Publicación permitida solo mediante dispatch en main con SHA y ejecución de despliegue explícitos.");
}
function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function api(path, ...args) {
  return JSON.parse(gh("api", `repos/${repo}/${path}`, ...args));
}

const remote = {
  main: () => api("git/ref/heads/main").object.sha,
  deployed: (sha, id) => {
    const result = api(`actions/runs/${id}`);
    const expected = result.head_sha === sha && result.head_branch === "main" &&
      result.conclusion === "success" && result.path.split("@")[0] === ".github/workflows/deploy.yml";
    return expected && api(`actions/runs/${id}/jobs?filter=latest&per_page=100`).jobs.some(job =>
      job.name === "Deploy a Cloudflare Workers" && job.conclusion === "success" &&
      job.steps.some(step => step.name === "Build y publicar" && step.conclusion === "success"));
  },
  tag: tag => {
    const refs = git("ls-remote", "--tags", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`).split("\n").filter(Boolean);
    return refs.at(-1)?.split(/\s+/)[0];
  },
  createTag: (tag, sha) => api("git/refs", "-X", "POST", "-f", `ref=refs/tags/${tag}`, "-f", `sha=${sha}`),
  release: tag => {
    const matches = api("releases?per_page=100", "--paginate", "--slurp").flat().filter(item => item.tag_name === tag);
    if (matches.length > 1) throw new Error("Hay releases duplicadas para la etiqueta.");
    return matches[0];
  },
  createDraft: (tag, body) => api("releases", "-X", "POST",
    "-f", `tag_name=${tag}`, "-f", `name=${tag}`, "-f", `body=${body}`, "-F", "draft=true"),
  publish: id => api(`releases/${id}`, "-X", "PATCH", "-F", "draft=false"),
  upload: async (id, payload) => {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("ID de release inválido.");
    const response = await fetch(`https://uploads.github.com/repos/${repo}/releases/${id}/assets?name=agencyos-update.json`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${GH_TOKEN}`, "Content-Type": "application/json" },
      body: payload,
    });
    if (!response.ok) throw new Error(`GitHub rechazó el manifiesto (HTTP ${response.status}).`);
  },
};

try {
  const result = await publishRelease(remote, candidate, notes, runId);
  writeFileSync(".release/agencyos-update.published.json", JSON.stringify(result, null, 2) + "\n");
  console.log(`Publicación confirmada: ${result.candidate.tag} (${result.candidate.sha}).`);
} catch (error) {
  // gh stderr may contain response details. Only emit the fixed diagnostic for API failures.
  if (error.status !== undefined) throw new Error("GitHub rechazó la operación. Consulta permisos y reintenta el mismo SHA.");
  throw error;
}
