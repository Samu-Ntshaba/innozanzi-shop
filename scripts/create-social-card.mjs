import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public", "social", "innozanzi-share.png");
const background = Buffer.from(`
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#071B33"/>
      <stop offset="1" stop-color="#0B395B"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop stop-color="#0EA5E9" stop-opacity=".42"/>
      <stop offset="1" stop-color="#0EA5E9" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="90" r="380" fill="url(#glow)"/>
  <rect x="64" y="164" width="250" height="36" rx="18" fill="#FBBF24"/>
  <text x="189" y="188" fill="#071B33" font-family="Arial, sans-serif" font-size="18" font-weight="800" text-anchor="middle">BUSINESS TECHNOLOGY</text>
  <text x="64" y="280" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="54" font-weight="800">Technology that</text>
  <text x="64" y="346" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="54" font-weight="800">moves business forward.</text>
  <text x="64" y="418" fill="#BAE6FD" font-family="Arial, sans-serif" font-size="28" font-weight="500">Fast quotations · Expert advice · Delivery &amp; support</text>
  <text x="64" y="520" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="24" font-weight="700">shop.innozanzi.co.za</text>
  <rect x="64" y="548" width="520" height="4" rx="2" fill="#0EA5E9"/>
</svg>`);

const logo = await sharp(path.join(root, "public", "brand", "innozanzi-shop-logo-white.png"))
  .resize({ width: 270 }).png().toBuffer();
const product = await sharp(path.join(root, "public", "products", "preview", "business-laptop.png"))
  .resize({ width: 400 }).png().toBuffer();

await sharp(background)
  .composite([
    { input: logo, left: 64, top: 48 },
    { input: product, left: 800, top: 145, blend: "screen" },
  ])
  .png({ quality: 90, compressionLevel: 9 })
  .toFile(output);

console.log(output);
