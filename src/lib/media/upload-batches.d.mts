export function splitUploadBatches<T>(files: T[]): T[][];
export function uniqueUploadFiles<T extends Blob>(files: T[]): Promise<T[]>;
