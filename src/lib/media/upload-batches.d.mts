export const MAX_UPLOAD_SELECTION: number;
export const MAX_UPLOAD_BATCH_FILES: number;
export const MAX_UPLOAD_BATCH_BYTES: number;
export function splitUploadBatches<T extends Blob>(files: T[]): T[][];
export function uniqueUploadFiles<T extends Blob>(files: T[]): Promise<T[]>;
