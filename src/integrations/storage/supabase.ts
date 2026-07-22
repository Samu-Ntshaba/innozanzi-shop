import { createSupabaseAdmin } from "@/lib/supabase";
import type { StorageProvider } from "./provider";

export class SupabaseStorageProvider implements StorageProvider {
  private client = createSupabaseAdmin();
  async upload(bucket: string, path: string, body: Blob | ArrayBuffer, contentType: string) { const { error } = await this.client.storage.from(bucket).upload(path, body, { contentType, upsert: false }); if (error) throw error; return { bucket, path, publicUrl: this.publicUrl(bucket, path) }; }
  async remove(bucket: string, path: string) { const { error } = await this.client.storage.from(bucket).remove([path]); if (error) throw error; }
  async signedUrl(bucket: string, path: string, expiresInSeconds = 300) { const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresInSeconds); if (error) throw error; return data.signedUrl; }
  publicUrl(bucket: string, path: string) { return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl; }
}
