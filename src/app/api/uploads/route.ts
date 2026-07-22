import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getAuthContext } from "@/domain/auth/session";
import { hasPermission } from "@/domain/auth/permissions";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function safeFilename(filename: string) {
  const cleaned = filename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return cleaned || "file";
}

async function ensureBucket() {
  const supabase = createSupabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (!data && error) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
    });

    if (createError) {
      throw createError;
    }
  }

  return { supabase, bucket };
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (
      !auth ||
      !hasPermission(auth.grants, "products.update", auth.isSuperAdministrator)
    ) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A file is required." }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The file must be between 1 byte and 10 MB." },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "This file type is not supported." },
        { status: 400 },
      );
    }

    const { supabase, bucket } = await ensureBucket();
    const objectPath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFilename(file.name)}`;
    const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    return NextResponse.json({
      name: file.name,
      path: objectPath,
      size: file.size,
      type: file.type,
      url: data.publicUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
