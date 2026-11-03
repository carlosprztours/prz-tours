export function splitUploadBatches(files) {
  if (files.length > 100) throw new Error("Máximo 100 archivos por selección.");
  const batches = [];
  for (let offset = 0; offset < files.length; offset += 20) {
    batches.push(files.slice(offset, offset + 20));
  }
  return batches;
}
