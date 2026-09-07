import sharp from "sharp";

const formats: Record<string, string> = {
  "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp", "image/avif": "heif",
};
export async function verifiedCatalogueImage(input: Buffer, declaredType: string) {
  const format = formats[declaredType];
  if (!format || input.length === 0 || input.length > 10 * 1024 * 1024) throw new Error("INVALID_IMAGE");
  const image = sharp(input, { limitInputPixels: 24_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (metadata.format !== format || (metadata.pages ?? 1) > 1) throw new Error("INVALID_IMAGE");
  // Decode and re-encode: discard trailing payloads and EXIF/location metadata.
  const output = await image.rotate().webp({ quality: 90 }).toBuffer();
  if (output.length > 10 * 1024 * 1024) throw new Error("INVALID_IMAGE");
  return output;
}
