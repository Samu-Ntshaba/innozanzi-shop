import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

import { defaultDocumentBranding, type DocumentBranding } from "./branding";

export type DocumentLine = { description: string; quantity: number; unitPrice?: string; total?: string };
export type CommercialPdfInput = {
  title: string;
  number: string;
  customer: string;
  email: string;
  issueDate: Date;
  dueDate?: Date;
  reference?: string;
  lines: DocumentLine[];
  subtotal?: string;
  vat?: string;
  total?: string;
  notes?: string | null;
};

type PngImage = { width: number; height: number; rgb: Buffer; alpha: Buffer };

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;
const NAVY = "0.027 0.110 0.196";
const BLUE = "0.000 0.557 0.820";
const PALE_BLUE = "0.941 0.976 0.992";
const SLATE = "0.278 0.333 0.400";
const LIGHT = "0.890 0.914 0.937";

const pdfText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/([\\()])/g, "\\$1");

const textWidth = (value: string, size: number, bold = false) => value.length * size * (bold ? 0.56 : 0.49);
const formatDate = (date: Date) => date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

function wrap(value: string, width: number, size = 9) {
  const paragraphs = value.replace(/\r/g, "").split("\n");
  const output: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      output.push("");
      continue;
    }
    const words = paragraph.trim().split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size) <= width || !line) line = candidate;
      else {
        output.push(line);
        line = word;
      }
    }
    if (line) output.push(line);
  }
  return output;
}

function decodeLogo(): PngImage | null {
  try {
    const png = readFileSync(join(process.cwd(), "public", "brand", "innozanzi-shop-logo-header-v2.png"));
    if (png.subarray(1, 4).toString() !== "PNG") return null;
    let offset = 8;
    let width = 0;
    let height = 0;
    let colorType = 0;
    const idat: Buffer[] = [];
    while (offset < png.length) {
      const length = png.readUInt32BE(offset);
      const type = png.subarray(offset + 4, offset + 8).toString();
      const data = png.subarray(offset + 8, offset + 8 + length);
      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        if (data[8] !== 8 || data[9] !== 6) return null;
        colorType = data[9];
      } else if (type === "IDAT") idat.push(data);
      else if (type === "IEND") break;
      offset += length + 12;
    }
    if (!width || !height || colorType !== 6) return null;
    const bytesPerPixel = 4;
    const stride = width * bytesPerPixel;
    const source = inflateSync(Buffer.concat(idat));
    const pixels = Buffer.alloc(stride * height);
    let sourceOffset = 0;
    for (let row = 0; row < height; row += 1) {
      const filter = source[sourceOffset++];
      for (let x = 0; x < stride; x += 1) {
        const raw = source[sourceOffset++];
        const left = x >= bytesPerPixel ? pixels[row * stride + x - bytesPerPixel] : 0;
        const up = row ? pixels[(row - 1) * stride + x] : 0;
        const upLeft = row && x >= bytesPerPixel ? pixels[(row - 1) * stride + x - bytesPerPixel] : 0;
        let value = raw;
        if (filter === 1) value += left;
        else if (filter === 2) value += up;
        else if (filter === 3) value += Math.floor((left + up) / 2);
        else if (filter === 4) {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        }
        pixels[row * stride + x] = value & 255;
      }
    }
    const rgb = Buffer.alloc(width * height * 3);
    const alpha = Buffer.alloc(width * height);
    for (let i = 0, rgbIndex = 0, alphaIndex = 0; i < pixels.length; i += 4) {
      rgb[rgbIndex++] = pixels[i];
      rgb[rgbIndex++] = pixels[i + 1];
      rgb[rgbIndex++] = pixels[i + 2];
      alpha[alphaIndex++] = pixels[i + 3];
    }
    return { width, height, rgb: deflateSync(rgb), alpha: deflateSync(alpha) };
  } catch {
    return null;
  }
}

function text(value: string, x: number, y: number, size = 9, font = "F1", color = NAVY) {
  return `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${pdfText(value)}) Tj ET`;
}

function rightText(value: string, right: number, y: number, size = 9, font = "F1", color = NAVY) {
  return text(value, Math.max(MARGIN, right - textWidth(value, size, font === "F2")), y, size, font, color);
}

function rect(x: number, y: number, width: number, height: number, color: string) {
  return `${color} rg ${x} ${y} ${width} ${height} re f`;
}

function pageHeader(input: CommercialPdfInput, branding: DocumentBranding, page: number, pages: number, hasLogo: boolean) {
  const titleLines = wrap(input.title, 300, 14).slice(0, 2);
  const titleTop = titleLines.length > 1 ? 806 : 800;
  const commands = [
    rect(0, PAGE_HEIGHT - 118, PAGE_WIDTH, 118, "1 1 1"),
    rect(0, PAGE_HEIGHT - 122, PAGE_WIDTH, 4, BLUE),
    hasLogo
      ? "q 156 0 0 52 40 760 cm /Logo Do Q"
      : text("INNOZANZI", MARGIN, 792, 20, "F2", NAVY),
    ...titleLines.map((line, index) => rightText(line, PAGE_WIDTH - MARGIN, titleTop - index * 17, 14, "F2", NAVY)),
    rightText(input.number, PAGE_WIDTH - MARGIN, titleLines.length > 1 ? 766 : 780, 10, "F2", BLUE),
  ];
  if (pages > 1) commands.push(rightText(`Page ${page} of ${pages}`, PAGE_WIDTH - MARGIN, titleLines.length > 1 ? 751 : 762, 8, "F1", SLATE));
  return commands;
}

function pageFooter(branding: DocumentBranding, page: number, pages: number) {
  return [
    `${LIGHT} RG 0.7 w ${MARGIN} 46 m ${PAGE_WIDTH - MARGIN} 46 l S`,
    text(branding.footer, MARGIN, 29, 7.5, "F1", SLATE),
    rightText(`${branding.website.replace(/^https?:\/\//, "")}  |  ${page}/${pages}`, PAGE_WIDTH - MARGIN, 29, 7.5, "F2", NAVY),
  ];
}

function firstPageBody(input: CommercialPdfInput, lines: DocumentLine[], branding: DocumentBranding) {
  const commands: string[] = [];
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  commands.push(rect(MARGIN, 664, contentWidth, 68, PALE_BLUE));
  commands.push(text("PREPARED FOR", MARGIN + 14, 714, 7.5, "F2", BLUE));
  commands.push(text(input.customer || "Customer", MARGIN + 14, 695, 12, "F2", NAVY));
  commands.push(text(input.email || "", MARGIN + 14, 680, 8.5, "F1", SLATE));
  commands.push(text("ISSUE DATE", 350, 714, 7.5, "F2", BLUE));
  commands.push(text(formatDate(input.issueDate), 350, 697, 9, "F2", NAVY));
  if (input.dueDate) {
    commands.push(text("DUE / DELIVERY", 455, 714, 7.5, "F2", BLUE));
    commands.push(text(formatDate(input.dueDate), 455, 697, 9, "F2", NAVY));
  }
  if (input.reference) commands.push(text(`Reference: ${input.reference}`, 350, 678, 8, "F1", SLATE));
  commands.push(...table(input, lines, 638));
  commands.push(...totalsAndNotes(input, branding, 638 - 26 - Math.max(lines.length, 1) * 34));
  return commands;
}

function continuationBody(input: CommercialPdfInput, lines: DocumentLine[]) {
  return table(input, lines, 704);
}

function table(input: CommercialPdfInput, lines: DocumentLine[], top: number) {
  const commands: string[] = [];
  const widths = [303, 58, 82, 68];
  commands.push(rect(MARGIN, top - 26, PAGE_WIDTH - MARGIN * 2, 26, NAVY));
  commands.push(text("DESCRIPTION", MARGIN + 10, top - 17, 7.5, "F2", "1 1 1"));
  commands.push(rightText("QTY", MARGIN + widths[0] + widths[1] - 10, top - 17, 7.5, "F2", "1 1 1"));
  commands.push(rightText("UNIT PRICE", MARGIN + widths[0] + widths[1] + widths[2] - 10, top - 17, 7.5, "F2", "1 1 1"));
  commands.push(rightText("TOTAL", PAGE_WIDTH - MARGIN - 10, top - 17, 7.5, "F2", "1 1 1"));
  lines.forEach((line, index) => {
    const y = top - 26 - (index + 1) * 34;
    if (index % 2 === 1) commands.push(rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 34, "0.973 0.980 0.988"));
    const description = wrap(line.description, widths[0] - 20, 8.5).slice(0, 2);
    description.forEach((part, lineIndex) => commands.push(text(part, MARGIN + 10, y + 21 - lineIndex * 11, 8.5, lineIndex ? "F1" : "F2", NAVY)));
    commands.push(rightText(String(line.quantity), MARGIN + widths[0] + widths[1] - 10, y + 13, 8.5, "F1", NAVY));
    commands.push(rightText(line.unitPrice || "-", MARGIN + widths[0] + widths[1] + widths[2] - 10, y + 13, 8.5, "F1", NAVY));
    commands.push(rightText(line.total || "-", PAGE_WIDTH - MARGIN - 10, y + 13, 8.5, "F2", NAVY));
    commands.push(`${LIGHT} RG 0.4 w ${MARGIN} ${y} m ${PAGE_WIDTH - MARGIN} ${y} l S`);
  });
  if (!lines.length) commands.push(text("No line items recorded", MARGIN + 10, top - 48, 8.5, "F1", SLATE));
  return commands;
}

function totalsAndNotes(input: CommercialPdfInput, branding: DocumentBranding, top: number) {
  const commands: string[] = [];
  const totalRows = [
    input.subtotal ? ["Subtotal", input.subtotal] : null,
    input.vat ? ["VAT", input.vat] : null,
    input.total ? ["TOTAL", input.total] : null,
  ].filter(Boolean) as string[][];
  let totalY = top - 8;
  totalRows.forEach(([label, value], index) => {
    const isTotal = index === totalRows.length - 1 && label === "TOTAL";
    if (isTotal) commands.push(rect(355, totalY - 8, 198, 29, NAVY));
    commands.push(text(label, 369, totalY, isTotal ? 10 : 8.5, "F2", isTotal ? "1 1 1" : SLATE));
    commands.push(rightText(value, 541, totalY, isTotal ? 11 : 9, "F2", isTotal ? "1 1 1" : NAVY));
    totalY -= isTotal ? 37 : 25;
  });
  const noteTop = totalRows.length ? Math.min(top - 8, totalY + totalRows.length * 25) : top - 8;
  if (input.notes) {
    commands.push(text("NOTES & TERMS", MARGIN, noteTop, 7.5, "F2", BLUE));
    wrap(input.notes, 285, 7.8).slice(0, 13).forEach((line, index) => {
      commands.push(text(line, MARGIN, noteTop - 16 - index * 10, 7.8, "F1", SLATE));
    });
  }
  commands.push(text(branding.companyName, MARGIN, 70, 7.5, "F2", NAVY));
  const contact = [branding.registration, branding.email, branding.phone, branding.address].filter(Boolean).join("  |  ");
  wrap(contact, PAGE_WIDTH - MARGIN * 2, 6.8).slice(0, 2).forEach((line, index) => commands.push(text(line, MARGIN, 59 - index * 8, 6.8, "F1", SLATE)));
  return commands;
}

export function commercialPdf(input: CommercialPdfInput, branding: DocumentBranding = defaultDocumentBranding) {
  const firstPageCapacity = input.total || input.notes ? 10 : 13;
  const continuationCapacity = 16;
  const chunks: DocumentLine[][] = [];
  chunks.push(input.lines.slice(0, firstPageCapacity));
  for (let index = firstPageCapacity; index < input.lines.length; index += continuationCapacity) {
    chunks.push(input.lines.slice(index, index + continuationCapacity));
  }
  const logo = decodeLogo();
  const pageCount = chunks.length;
  const pageIds = chunks.map((_, index) => 3 + index);
  const regularFontId = 3 + pageCount;
  const boldFontId = regularFontId + 1;
  const logoId = logo ? boldFontId + 1 : null;
  const alphaId = logo ? boldFontId + 2 : null;
  const firstContentId = boldFontId + (logo ? 3 : 1);
  const contentIds = chunks.map((_, index) => firstContentId + index);
  const objects = new Map<number, string | Buffer>();

  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`);
  objects.set(regularFontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.set(boldFontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  if (logo && logoId && alphaId) {
    objects.set(alphaId, Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${logo.alpha.length} >>\nstream\n`),
      logo.alpha,
      Buffer.from("\nendstream"),
    ]));
    objects.set(logoId, Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${alphaId} 0 R /Length ${logo.rgb.length} >>\nstream\n`),
      logo.rgb,
      Buffer.from("\nendstream"),
    ]));
  }

  chunks.forEach((lines, index) => {
    const commands = [
      ...pageHeader(input, branding, index + 1, pageCount, Boolean(logo)),
      ...(index === 0 ? firstPageBody(input, lines, branding) : continuationBody(input, lines)),
      ...pageFooter(branding, index + 1, pageCount),
    ].join("\n");
    const resources = `/Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >>${logoId ? ` /XObject << /Logo ${logoId} 0 R >>` : ""}`;
    objects.set(pageIds[index], `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << ${resources} >> /Contents ${contentIds[index]} 0 R >>`);
    objects.set(contentIds[index], `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`);
  });

  const maxId = Math.max(...objects.keys());
  const output: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")];
  const offsets = [0];
  let length = output[0].length;
  for (let id = 1; id <= maxId; id += 1) {
    const body = objects.get(id);
    if (!body) throw new Error(`Missing PDF object ${id}`);
    offsets[id] = length;
    const object = Buffer.concat([Buffer.from(`${id} 0 obj\n`), Buffer.isBuffer(body) ? body : Buffer.from(body), Buffer.from("\nendobj\n")]);
    output.push(object);
    length += object.length;
  }
  const xref = length;
  output.push(Buffer.from(`xref\n0 ${maxId + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer << /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return Buffer.concat(output);
}
