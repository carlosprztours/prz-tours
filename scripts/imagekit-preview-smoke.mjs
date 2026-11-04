import assert from "node:assert/strict";
import { readFile, writeFile, rename } from "node:fs/promises";
import ts from "typescript";
import { splitUploadBatches } from "../src/lib/media/upload-batches.mjs";

const manifestPath = "imagekit-preview-manifest.json";
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
if (!privateKey || !endpoint) throw new Error("Missing ImageKit smoke configuration");
const expected = new URL(endpoint);
assert.equal(expected.protocol, "https:");
assert.equal(expected.hostname, "ik.imagekit.io");
assert.match(expected.pathname, /^\/[\w-]+\/?$/);

const verifyFolder = process.env.IMAGEKIT_VERIFY_FOLDER;
const recovery = process.argv[2] === "--cleanup";
const manifest = recovery
  ? JSON.parse(await readFile(manifestPath, "utf8"))
  : { folder: verifyFolder || "/prz/preview-smoke-" + crypto.randomUUID(), files: [] };
assert.match(manifest.folder, /^\/prz\/preview-smoke-[a-f0-9-]{36}$/);
const nativeFetch = globalThis.fetch;
const authorization = "Basic " + Buffer.from(privateKey + ":").toString("base64");

async function save() {
  await writeFile(manifestPath + ".tmp", JSON.stringify(manifest, null, 2), { mode: 0o600 });
  await rename(manifestPath + ".tmp", manifestPath);
}

async function manage(path, method = "GET") {
  const url = new URL(path, "https://api.imagekit.io");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await nativeFetch(url, {
      method, headers: { authorization }, redirect: "error", signal: AbortSignal.timeout(10000),
    }).catch(() => null);
    if (response && response.status !== 429 && response.status < 500) return response;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw new Error("ImageKit management request exhausted retries");
}

async function list() {
  const query = new URLSearchParams({ path: manifest.folder, type: "file", limit: "200" });
  const response = await manage("/v1/files?" + query);
  assert(response.ok, "Could not list temporary folder");
  const files = await response.json();
  assert(Array.isArray(files) && files.length < 200, "Unexpected listing");
  return files.filter(file => typeof file.filePath === "string" &&
    file.filePath.startsWith(manifest.folder + "/"));
}

async function cleanup() {
  const listed = await list();
  for (const item of manifest.files) {
    try {
      const candidates = listed.filter(file =>
        file.filePath === manifest.folder + "/" + item.name &&
        (!item.fileId || item.fileId === file.fileId));
      const ids = new Set(candidates.map(file => file.fileId));
      if (item.fileId) ids.add(item.fileId);
      for (const id of ids) {
        assert.match(id, /^[a-zA-Z0-9_-]+$/);
        const details = "/v1/files/" + id + "/details";
        const before = await manage(details);
        if (before.status !== 404) {
          assert(before.ok);
          const file = await before.json();
          assert(file.filePath === manifest.folder + "/" + item.name, "File ownership mismatch");
          const removed = await manage("/v1/files/" + id, "DELETE");
          assert(removed.ok || removed.status === 404, "Delete failed");
          assert.equal((await manage(details)).status, 404, "Delete not verified");
        }
      }
      item.cleanup = "verified";
    } catch {
      item.cleanup = "pending";
    }
  }
  let remaining = await list();
  for (let attempt = 0; remaining.length && attempt < 4; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));
    remaining = await list();
  }
  manifest.remaining = remaining.length;
  await save();
  assert(remaining.length === 0 && manifest.files.every(file => file.cleanup === "verified"),
    "Cleanup incomplete. Inspect the recovery manifest.");
  console.log("Temporary folder verified empty");
}

async function run() {
  assert.equal((await list()).length, 0, "Temporary folder is not empty");
  const source = await readFile(new URL("../src/lib/media/imagekit.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source
    .replace('import "server-only";', "")
    .replace('import { getEnvVar } from "@/lib/db/client";',
      "const getEnvVar = (name) => process.env[name];"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { uploadImagesToImageKit } = await import("data:text/javascript;base64," +
    Buffer.from(compiled).toString("base64"));
  // Serialize manifest writes before any request can create an asset.
  let journal = Promise.resolve();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://upload.imagekit.io/api/v1/files/upload");
    assert.equal("/" + options.body.get("folder"), manifest.folder);
    const item = { name: options.body.get("fileName"), upload: "attempted" };
    options.body.set("useUniqueFileName", "false");
    options.body.set("overwriteFile", "false");
    await (journal = journal.then(async () => {
      manifest.files.push(item);
      await save();
    }));
    const response = await nativeFetch(url, {
      ...options, redirect: "error", signal: AbortSignal.timeout(12000),
    });
    const body = await response.clone().json().catch(() => ({}));
    item.fileId = body.fileId;
    item.path = manifest.folder + "/" + item.name;
    if (typeof body.url === "string" && body.url === expected.href.replace(/\/$/, "") + item.path) {
      item.url = body.url;
    }
    item.upload = response.ok ? "accepted" : "rejected";
    await (journal = journal.then(save));
    return response;
  };

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==", "base64");
  assert.throws(() => splitUploadBatches(Array(101)));
  for (const [count, sizes] of [[1, [1]], [20, [20]], [21, [20, 1]], [100, [20, 20, 20, 20, 20]]]) {
    const files = Array.from({ length: count }, (_, i) =>
      new File([png], `sample-${i}.png`, { type: "image/png" }));
    const batches = splitUploadBatches(files);
    assert.deepEqual(batches.map(batch => batch.length), sizes);
    for (const batch of batches) {
      const result = await uploadImagesToImageKit(batch, manifest.folder.split("/").at(-1));
      assert.equal(result.fallidas.length, 0, "ImageKit rejected a batch");
      assert.equal(result.subidas.length, batch.length);
      for (const resultFile of result.subidas) {
        assert(resultFile.fileId);
        assert(resultFile.path.startsWith(manifest.folder + "/"));
      }
    }
    console.log(`Verified ${count} uploads in batches ${sizes.join("+")}`);
  }
}

await save();
try {
  if (!recovery && !verifyFolder) await run();
} finally {
  globalThis.fetch = nativeFetch;
  await cleanup();
}
