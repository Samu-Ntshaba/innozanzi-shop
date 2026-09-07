import { verifiedCatalogueImage } from "@/lib/security/catalogue-image";
import { browserMutationGuard, boundedFormData } from "@/lib/security/request";
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
  "image/avif",
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
  const blocked = browserMutationGuard(request, "multipart/form-data"); if (blocked) return blocked;
  if (Number(request.headers.get("content-length")) > MAX_FILE_SIZE + 65_536) return NextResponse.json({ error: "Upload is too large." }, { status: 413 });
  try {
    const auth = await getAuthContext();
    if (
      !auth ||
      !hasPermission(auth.grants, "products.update", auth.isSuperAdministrator)
    ) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let formData: FormData;
    try { formData = await boundedFormData(request, MAX_FILE_SIZE + 65_536); }
    catch (error) { return NextResponse.json({ error: "The upload is invalid or too large." }, { status: error instanceof Error && error.message === "BODY_TOO_LARGE" ? 413 : 400 }); }
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

    let image: Buffer;
    try { image = await verifiedCatalogueImage(Buffer.from(await file.arrayBuffer()), file.type); }
    catch { return NextResponse.json({ error: "Upload a valid, still JPG, PNG, WebP or AVIF image up to 24 megapixels." }, { status: 400 }); }
    const filename = `${safeFilename(file.name.replace(/\.[^.]+$/, ""))}.webp`;
    const { supabase, bucket } = await ensureBucket();
    const objectPath = `catalogue/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${filename}`;
    const { error } = await supabase.storage.from(bucket).upload(objectPath, image, {
      contentType: "image/webp",
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    return NextResponse.json({
      name: filename,
      path: objectPath,
      size: image.length,
      type: "image/webp",
      url: data.publicUrl,
    });
  } catch (error) {
    console.error("Catalogue image upload failed", error);
    return NextResponse.json({ error: "The image could not be uploaded." }, { status: 500 });
  }
}
