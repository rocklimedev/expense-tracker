export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/** Receipt storage contract shared by the local and SFTP providers. */
export interface StorageProvider {
  put(key: string, data: Buffer, mimeType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
