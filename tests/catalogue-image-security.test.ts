import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { verifiedCatalogueImage } from "@/lib/security/catalogue-image";
import { boundedFormData } from "@/lib/security/request";

const fixture = () => sharp({ create: { width: 4, height: 4, channels: 3, background: "white" } }).png().toBuffer();
describe("catalogue image validation", () => {
  it("rejects HTML and SVG disguised as raster images", async () => {
    for (const input of ['<html><script>alert(1)</script></html>', '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>']) {
      await expect(verifiedCatalogueImage(Buffer.from(input), "image/png")).rejects.toThrow();
    }
  });
  it("rejects a mismatch between the declared and decoded format", async () => {
    await expect(verifiedCatalogueImage(await fixture(), "image/jpeg")).rejects.toThrow("INVALID_IMAGE");
  });
  it("re-encodes valid pixels without appended payloads or metadata", async () => {
    const image = await sharp(await fixture()).withExif({ IFD0: { Artist: "private metadata" } }).png().toBuffer();
    const result = await verifiedCatalogueImage(Buffer.concat([image, Buffer.from("<script>appended-payload</script>")]), "image/png");
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("webp");expect(metadata.width).toBe(4);expect(metadata.exif).toBeUndefined();expect(result.includes(Buffer.from("appended-payload"))).toBe(false);
  });
  it("rejects compressed images exceeding the pixel limit", async () => {
    const input = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "white" } }).png().toBuffer();
    await expect(verifiedCatalogueImage(input, "image/png")).rejects.toThrow();
  });
});
describe("multipart limits", () => {
  it("accepts a bounded form and rejects oversized bodies without a size header", async () => {
    const form = new FormData();form.append("file", new Blob([await fixture()], {type:"image/png"}), "photo.png");
    const request = () => new Request("https://shop.example/api/uploads", {method:"POST",body:form});
    const data = await boundedFormData(request(), 2048);expect(data.get("file")).toBeInstanceOf(File);
    await expect(boundedFormData(request(), 10)).rejects.toThrow("BODY_TOO_LARGE");
  });
});
