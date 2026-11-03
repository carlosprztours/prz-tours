export function splitUploadBatches(files) {
  if (files.length > 100) throw new Error("Máximo 100 archivos por selección.");
  const batches = [];
  for (let offset = 0; offset < files.length; offset += 20) {
    batches.push(files.slice(offset, offset + 20));
  }
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
