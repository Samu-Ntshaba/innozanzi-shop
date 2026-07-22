export type StoredObject = { path: string; bucket: string; publicUrl?: string };
export interface StorageProvider {
  upload(bucket: string, path: string, body: Blob | ArrayBuffer, contentType: string): Promise<StoredObject>;
  remove(bucket: string, path: string): Promise<void>;
  signedUrl(bucket: string, path: string, expiresInSeconds?: number): Promise<string>;
  publicUrl(bucket: string, path: string): string;
}
