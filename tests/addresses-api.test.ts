import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), search: vi.fn(), resolve: vi.fn() }));
vi.mock("@/domain/auth/session", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/domain/auth/rate-limit", () => ({ consumeRateLimit: mocks.limit }));
vi.mock("@/domain/addresses/google-places", () => ({ mapsConfigured: () => true, searchAddresses: mocks.search, resolveAddress: mocks.resolve, signAddress: () => "signed-proof" }));
import { POST } from "@/app/api/addresses/places/route";
const body = { action: "search", input: "12 Example Road", sessionToken: "11111111-1111-4111-8111-111111111111" };
const request = (data: unknown = body, origin = "https://shop.example") => new Request("https://shop.example/api/addresses/places", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(data) });
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example"); mocks.auth.mockResolvedValue({ user: { id: "current-user" } }); mocks.limit.mockResolvedValue({ allowed: true }); mocks.search.mockResolvedValue([]); });
afterEach(() => vi.unstubAllEnvs());
it("blocks foreign requests and unauthenticated users without contacting Google", async () => {
  expect((await POST(request(body, "https://evil.example"))).status).toBe(403);
  mocks.auth.mockResolvedValue(null); expect((await POST(request())).status).toBe(401);
  expect(mocks.search).not.toHaveBeenCalled();
});
it("rejects oversized requests and exhausted rate limits before contacting Google", async () => {
  expect((await POST(request({ ...body, input: "x".repeat(3000) }))).status).toBe(400);
  mocks.limit.mockResolvedValue({ allowed: false }); expect((await POST(request())).status).toBe(429);
  expect(mocks.search).not.toHaveBeenCalled();
});
it("returns transient results and never leaks upstream exception details", async () => {
  const response = await POST(request()); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  mocks.search.mockRejectedValue(new Error("key=secret upstream failure"));
  expect(JSON.stringify(await (await POST(request())).json())).not.toContain("secret");
});
