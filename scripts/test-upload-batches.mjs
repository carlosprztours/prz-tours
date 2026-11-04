import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_UPLOAD_BATCH_BYTES, splitUploadBatches, uniqueUploadFiles } from "../src/lib/media/upload-batches.mjs";

test("splits 1, 20, 21 and 100 uploads without reordering files", () => {
  for (const [count, sizes] of [[1, [1]], [20, [20]], [21, [20, 1]], [100, [20, 20, 20, 20, 20]]]) {
    const files = Array.from({ length: count }, (_, index) => ({ index, size: 100 }));
    const batches = splitUploadBatches(files);
    assert.deepEqual(batches.map(batch => batch.length), sizes);
    assert.deepEqual(batches.flat(), files);
  }
  assert.throws(() => splitUploadBatches(Array(101).fill({ size: 100 })), /100/);
});

test("keeps the maximum-size video separate from photos", () => {
  const files = [{ size: 100 }, { size: MAX_UPLOAD_BATCH_BYTES }, { size: 100 }];
  assert.deepEqual(splitUploadBatches(files).map(batch => batch.length), [1, 1, 1]);
});

test("deduplicates by content, preserves first filename and keeps different content", async () => {
  const first = new File(["photo"], "original.png");
  const duplicate = new File(["photo"], "copy.png");
  const different = new File(["video"], "original.png");
  assert.deepEqual(await uniqueUploadFiles([first, duplicate, different]), [first, different]);
});

test("ImageKit returns partial successes with source indices and rejects lookalike paths", async context => {
  const { readFile } = await import("node:fs/promises");
  const { default: ts } = await import("typescript");
  // Same transpilation approach as scripts/imagekit-preview-smoke.mjs on PR #1.
  const source = await readFile(new URL("../src/lib/media/imagekit.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source.replace('import "server-only";', "")
    .replace('import { getEnvVar } from "@/lib/db/client";', `const getEnvVar = name =>
      name === "IMAGEKIT_URL_ENDPOINT" ? "https://ik.imagekit.io/test" : "mock";`),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { uploadImagesToImageKit } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
  let requests = 0;
  context.mock.method(globalThis, "fetch", async url => {
    assert.equal(url, "https://upload.imagekit.io/api/v1/files/upload");
    const index = requests++;
    const urls = ["https://ik.imagekit.io/test/prz/photo.png",
      "https://ik.imagekit.io/test-other/prz/rejected.png", "https://ik.imagekit.io/test/prz/video.mp4"];
    return Response.json({ url: urls[index], fileId: `mock-${index}` });
  });
  const files = [
    new File(["photo"], "first.png", { type: "image/png" }),
    new File(["wrong"], "second.png", { type: "image/png" }),
    new File(["video"], "third.mp4", { type: "video/mp4" }),
  ];
  const result = await uploadImagesToImageKit(files, "gallery");
  assert.deepEqual(result.subidas.map(item => [item.originalIndex, item.originalName]), [[0, "first.png"], [2, "third.mp4"]]);
  assert.deepEqual(result.fallidas, [{ nombre: "second.png", motivo: "upload-failed", index: 1 }]);
});
