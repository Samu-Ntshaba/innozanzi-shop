import { NextResponse } from "next/server";

export function browserMutationGuard(request: Request, contentType = "application/json") {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "This request must come from our website." }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== contentType) {
    return NextResponse.json({ error: "Unsupported request content type." }, { status: 415 });
  }
  return null;
}

export async function boundedBody(request: Request, maxBytes: number): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { reader.releaseLock(); }
}

export async function boundedJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const body = await boundedBody(request, maxBytes);
  return body.length ? JSON.parse(body.toString("utf8")) : null;
}

export async function boundedFormData(request: Request, maxBytes: number): Promise<FormData> {
  const body = await boundedBody(request, maxBytes);
  return new Response(new Uint8Array(body), { headers: { "content-type": request.headers.get("content-type") || "" } }).formData();
}

// Only trust an address header when the deployment proxy overwrites it.
export function clientAddress(headers: Headers) {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  return header ? headers.get(header)?.split(",")[0]?.trim().slice(0,128) || "unknown" : "unknown";
}
