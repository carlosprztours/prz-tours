export const MAX_UPLOAD_SELECTION = 100;
export const MAX_UPLOAD_BATCH_FILES = 20;
export const MAX_UPLOAD_BATCH_BYTES = 60 * 1024 * 1024;

export function splitUploadBatches(files) {
  if (files.length > MAX_UPLOAD_SELECTION) throw new Error("Máximo 100 archivos por selección.");
  const batches = [];
  let batch = [];
  let bytes = 0;
  for (const file of files) {
    if (batch.length && (batch.length >= MAX_UPLOAD_BATCH_FILES || bytes + file.size > MAX_UPLOAD_BATCH_BYTES)) {
      batches.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(file);
    bytes += file.size;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

export async function uniqueUploadFiles(files) {
  const hashes = new Set();
  const unique = [];
  for (const file of files) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest)).join(",");
    if (hashes.has(hash)) continue;
    hashes.add(hash);
    unique.push(file);
  }
  return unique;
}
