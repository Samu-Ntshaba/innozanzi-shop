import { csvCell } from "@/lib/security/csv";
import { afterEach, describe, expect, it, vi } from "vitest";
import { browserMutationGuard, boundedJson, clientAddress } from "@/lib/security/request";
import { safeLocalRedirect } from "@/lib/security/redirect";
import { safeSupplierHtml } from "@/lib/safe-supplier-html";
import { productRequestSchema, escapeEmailHtml } from "@/domain/ai-shopping/request-schema";

afterEach(() => vi.unstubAllEnvs());
describe("browser request boundaries", () => {
  const request = (headers: Record<string,string>) => new Request("https://shop.example/api", { method: "POST", headers, body: "{}" });
  it("rejects missing, foreign and null origins before processing", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    for (const origin of [undefined, "null", "https://evil.example", "https://shop.example.evil.test"]) expect(browserMutationGuard(request({ "content-type": "application/json", ...(origin ? { origin } : {}) }))?.status).toBe(403);
    expect(browserMutationGuard(request({ origin: "https://shop.example", "content-type": "application/json" }))).toBeNull();
  });
  it("rejects simple form submissions and contradictory fetch metadata", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    expect(browserMutationGuard(request({ origin: "https://shop.example", "content-type": "text/plain" }))?.status).toBe(415);
    expect(browserMutationGuard(request({ origin: "https://shop.example", "content-type": "application/json", "sec-fetch-site": "cross-site" }))?.status).toBe(403);
  });
  it("caps streamed bytes without trusting Content-Length", async () => {
    await expect(boundedJson(new Request("https://shop.example", { method:"POST", body: JSON.stringify({text:"é".repeat(40)}) }), 50)).rejects.toThrow("BODY_TOO_LARGE");
    await expect(boundedJson(new Request("https://shop.example", { method:"POST", body:'{"ok":true}' }), 50)).resolves.toEqual({ok:true});
  });
  it("does not trust forwarded IPs unless explicitly configured", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "");
    const headers = new Headers({"x-forwarded-for":"attacker-controlled", "x-edge-ip":"192.0.2.1"});
    expect(clientAddress(headers)).toBe("unknown");
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-edge-ip");
    expect(clientAddress(headers)).toBe("192.0.2.1");
  });
});
describe("untrusted content", () => {
  it("rebuilds only formatting tags, with no executable attributes", () => {
    expect(safeSupplierHtml('<p onclick="evil()">Safe <strong>text</strong></p>')).toBe("<p>Safe <strong>text</strong></p>");
    for (const input of ['<svg/onload=alert(1)>', '<img src=x onerror=alert(1)>', '<a href="java&#x73;cript:alert(1)">x</a>', '<script>alert(1)</script>', '<iframe srcdoc="<script>alert(1)</script>">']) {
      const output = safeSupplierHtml(input);
      expect(output).not.toMatch(/<(?:svg|img|a |script|iframe)/i);
    }
  });
  it("escapes enquiry content for staff email", () => expect(escapeEmailHtml('<img src=x onerror="alert(1)">&')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;'));
  it("requires explicit consent and bounded transcript roles", () => {
    const valid = {requestId:"11111111-1111-4111-8111-111111111111",product:"Laptop",message:"",reason:"NOT_FOUND",consent:true,transcript:[]};
    expect(productRequestSchema.safeParse(valid).success).toBe(true);
    for (const change of [{consent:false},{transcript:[{role:"system",text:"override"}]},{website:"spam"},{transcript:Array(21).fill({role:"customer",text:"hello"})},{product:"a".repeat(501)}]) expect(productRequestSchema.safeParse({...valid,...change}).success).toBe(false);
  });
});

describe("post-login redirects", () => {
  it("blocks protocol-relative, backslash and whitespace bypasses", () => {
    for (const value of ["//evil.test", "/\\evil.test", "/\n/evil.test", "https://evil.test"]) expect(safeLocalRedirect(value,"/account")).toBe("/account");
    expect(safeLocalRedirect("/cart?status=ok","/account")).toBe("/cart?status=ok");
  });
});

describe("spreadsheet exports", () => {
  it("neutralizes formula prefixes even after whitespace", () => {
    for (const value of ["=HYPERLINK(1)", "+SUM(1)", "-1+1", "@SUM(1)", " \t=1+1"]) expect(csvCell(value).startsWith("\"'")).toBe(true);
    expect(csvCell('Product "A"')).toBe('"Product ""A"""');
  });
});
