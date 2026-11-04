import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { bumpVersion, changelogEntry, classify, git, preparation, readPlan, validateManifest } from "./lib/versioning.mjs";
import { publishRelease } from "./lib/release-publication.mjs";

const plan = readPlan();
const file = name => [{ file: name, change: "added" }];

test("classifies patch, minor, major, documentation and uncertain changes", () => {
  assert.equal(classify(["fix: typo"], file("src/a.ts")).suggestion, "patch");
  assert.equal(classify(["feat(a): add"], file("src/a.ts")).suggestion, "minor");
  const major = classify(["feat(api)!: replace"], file("src/app/api/a.ts"));
  assert.equal(major.suggestion, "major");
  assert.equal(major.flags.api, true);
  assert.equal(classify(["fix: docs"], file("docs/readme.md")).suggestion, "none");
  assert.equal(classify(["Unstructured title"], file("src/a.ts")).suggestion, "manual");
  assert.deepEqual(classify(["security: guard"], [...file("migrations/0019.sql"), ...file("wrangler.jsonc")]).flags,
    { database: true, api: false, configuration: true, security: true });
  assert.deepEqual(["patch", "minor", "major"].map(type => bumpVersion("0.1.9", type)), ["0.1.10", "0.2.0", "1.0.0"]);
});

test("prepares untagged and tagged histories, including idempotency and collision checks", () => {
  const dir = mkdtempSync(join(tmpdir(), "prz-versioning-test-"));
  const original = process.cwd();
  process.chdir(dir);
  try {
    git("init", "-q");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Release Test");
    writeFileSync("one.txt", "1");
    git("add", ".");
    git("commit", "-qm", "chore: baseline");
    const base = git("rev-parse", "HEAD");
    assert.equal(preparation({ ...plan, baseline: base }).previous, undefined);
    git("tag", "v0.1.0");
    assert.equal(preparation({ ...plan, baseline: base }).tag, "v0.1.0");
    writeFileSync("one.txt", "2");
    git("commit", "-qam", "fix: update");
    assert.throws(() => preparation({ ...plan, baseline: base }), /otro SHA/);
    assert.equal(preparation({ ...plan, baseline: base, type: "patch", version: "0.1.1" }).previous, "v0.1.0");
    assert.throws(() => preparation({ ...plan, baseline: base, type: "patch", version: "0.2.0" }), /incremento/);
  } finally {
    process.chdir(original);
    rmSync(dir, { recursive: true });
  }
});

function candidate() {
  const { baseline, version, ...metadata } = plan;
  return {
    ...metadata, schemaVersion: 1, current: { version: null, sha: baseline, tag: null },
    candidate: { version, sha: "a".repeat(40), tag: `v${version}` }, publishedAt: null,
    publicationSource: `https://api.github.com/repos/${plan.project.repository}/releases/tags/v${version}`,
    migrations: [], dependencies: {}, approval: "pending",
    deployment: { state: "unverified", environment: "production", runId: null },
  };
}

test("validates the manifest and generates a stable changelog", () => {
  const input = candidate();
  assert.deepEqual(validateManifest(input), input);
  assert.throws(() => validateManifest({ ...input, publishedAt: "2026-11-04T12:00:00Z" }), /incoherentes/);
  assert.throws(() => validateManifest({ ...input, environmentVariables: ["TOKEN=secret"] }));
  assert.match(changelogEntry(plan), /^## \[0\.1\.0\]/);
  assert.equal(changelogEntry(plan), changelogEntry(structuredClone(plan)));
});

test("blocks failed deployment and retries after a failed upload without duplicate tags or releases", async () => {
  const input = candidate();
  let tag;
  let release;
  let deployments = false;
  let tagWrites = 0, releaseWrites = 0, uploads = 0;
  const remote = {
    main: () => input.candidate.sha,
    deployed: () => deployments,
    tag: () => tag,
    createTag: (_tag, sha) => { tagWrites++; tag = sha; },
    release: () => release,
    createDraft: (tag_name, body) => (release = { id: ++releaseWrites, tag_name, body, draft: true, assets: [] }),
    publish: () => { release.draft = false; release.published_at = "2026-11-04T12:00:00Z"; },
    upload: (_tag, payload) => {
      if (++uploads === 1) throw new Error("Simulated upload failure");
      release.assets.push({ name: "agencyos-update.json", digest: `sha256:${createHash("sha256").update(payload).digest("hex")}` });
    },
  };
  await assert.rejects(publishRelease(remote, input, "Notes", 42), /Sin evidencia/);
  assert.equal(tagWrites, 0);
  deployments = true;
  await assert.rejects(publishRelease(remote, input, "Notes", 42), /upload failure/);
  assert.equal((await publishRelease(remote, input, "Notes", 42)).deployment.state, "verified");
  await publishRelease(remote, input, "Notes", 42);
  assert.deepEqual([tagWrites, releaseWrites, uploads], [1, 1, 2]);
  tag = "b".repeat(40);
  await assert.rejects(publishRelease(remote, input, "Notes", 42), /otro SHA/);
});
