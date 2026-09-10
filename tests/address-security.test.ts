import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapsConfigured, normalizePlace, resolveAddress, searchAddresses, signAddress, verifyAddress } from "@/domain/addresses/google-places";
import { deliveryFromForm } from "@/domain/addresses/service";
const { findFirst, findUnique } = vi.hoisted(() => ({ findFirst: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { address: { findFirst }, siteSetting: { findUnique } } }));
const address = { recipient: "Test Customer", phone: "0712345678", line1: "12 Example Road", line2: "Unit 4", suburb: "Example", city: "Cape Town", province: "Western Cape" as const, postalCode: "0123" };
const user = "11111111-1111-4111-8111-111111111111";
function form(values: Record<string, string> = address) { const result = new FormData(); Object.entries(values).forEach(([k,v]) => result.set(k,v)); return result; }
const component = (type: string, longText: string, shortText?: string) => ({ types: [type], longText, shortText });
const place = { id: "ChIJ_example", addressComponents: [component("country", "South Africa", "ZA"), component("street_number", "12"), component("route", "Example Road"), component("locality", "Cape Town"), component("administrative_area_level_1", "Western Cape"), component("postal_code", "0123")] };
beforeEach(() => { vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-server-secret"); vi.clearAllMocks(); findUnique.mockResolvedValue(null); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("address selection proof", () => {
  it("binds selection to account, location fields and expiry while allowing recipient/unit changes", () => {
    vi.useFakeTimers();
    const token = signAddress(user, place.id, address);
    expect(verifyAddress(token, user, { ...address, recipient: "Another recipient", line2: "Unit 8" })).toBe(place.id);
    expect(() => verifyAddress(token, "another-user", address)).toThrow();
    expect(() => verifyAddress(token, user, { ...address, line1: "99 Fake Road" })).toThrow();
    expect(() => verifyAddress(`${token}tampered`, user, address)).toThrow();
    vi.advanceTimersByTime(30 * 60_000);
    expect(() => verifyAddress(token, user, address)).toThrow();
  });
  it("never treats a missing or placeholder key as configured", () => {
    for (const key of ["", " ", "replace-with-key", "YOUR_API_KEY"]) { vi.stubEnv("GOOGLE_MAPS_API_KEY", key); expect(mapsConfigured()).toBe(false); }
  });
});
describe("checkout delivery boundary", () => {
  it("rejects empty, incomplete or unselected addresses", async () => {
    await expect(deliveryFromForm(user, new FormData())).rejects.toThrow("Complete");
    await expect(deliveryFromForm(user, form())).rejects.toThrow("Please select");
    await expect(deliveryFromForm(user, form({ ...address, postalCode: "abc" }))).rejects.toThrow("Complete");
  });
  it("accepts a signed address and rejects edited fields", async () => {
    const data = form({ ...address, addressProof: signAddress(user, place.id, address) });
    await expect(deliveryFromForm(user, data)).resolves.toMatchObject({ ...address, googlePlaceId: place.id });
    data.set("city", "Pretoria"); await expect(deliveryFromForm(user, data)).rejects.toThrow("Please select");
  });
  it("looks up saved addresses by current owner and ignores forged form fields", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    findFirst.mockResolvedValue({ ...address, googlePlaceId: place.id });
    await expect(deliveryFromForm(user, form({ addressId: id, line1: "forged" }))).resolves.toMatchObject(address);
    expect(findFirst).toHaveBeenCalledWith({ where: { id, userId: user, deletedAt: null, type: { in: ["DELIVERY", "BOTH"] } } });
    findFirst.mockResolvedValue(null);
    await expect(deliveryFromForm(user, form({ addressId: id }))).rejects.toThrow("Choose one");
    findFirst.mockResolvedValue({ ...address, googlePlaceId: null });
    await expect(deliveryFromForm(user, form({ addressId: id }))).rejects.toThrow("Please add");
  });
  it("permits complete manual details only when Maps is not configured, without accepting forged verification", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    await expect(deliveryFromForm(user, form({ ...address, googlePlaceId: "fake" }))).resolves.toMatchObject({ ...address, googlePlaceId: null });
  });
  it("requires a South African cellphone number and an admin-enabled province", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    await expect(deliveryFromForm(user, form({ ...address, phone: "0111234567" }))).rejects.toThrow("cellphone");
    findUnique.mockResolvedValue({ value: { provinces: ["Gauteng"] } });
    await expect(deliveryFromForm(user, form())).rejects.toThrow("currently deliver");
  });
});
describe("Places provider", () => {
  it("preserves leading zeros, accepts valid Google variants and rejects foreign or incomplete results", () => {
    expect(normalizePlace(place).address.postalCode).toBe("0123");
    expect(normalizePlace({ ...place, addressComponents: place.addressComponents.filter(c => !c.types.includes("street_number")) }).address.line1).toBe("Example Road");
    expect(normalizePlace({ ...place, addressComponents: place.addressComponents.map(c => c.types.includes("administrative_area_level_1") ? component("administrative_area_level_1", "Province of Gauteng", "GP") : c) }).address.province).toBe("Gauteng");
    for (const type of ["route", "postal_code", "country"]) expect(() => normalizePlace({ ...place, addressComponents: place.addressComponents.filter(c => !c.types.includes(type)) })).toThrow();
    expect(() => normalizePlace({ ...place, addressComponents: [...place.addressComponents.filter(c => !c.types.includes("country")), component("country", "United States", "US")] })).toThrow("South African");
  });
  it("uses one session, server key headers, ZA restriction, minimal fields and no cache", async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ suggestions: [{ placePrediction: { placeId: place.id, text: { text: "12 Example Road" } } }] }) }).mockResolvedValueOnce({ ok: true, json: async () => place });
    vi.stubGlobal("fetch", fetch);
    expect(await searchAddresses("12 Example", user)).toEqual([{ id: place.id, text: "12 Example Road" }]);
    expect(await resolveAddress(place.id, user)).toMatchObject({ placeId: place.id });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ input: "12 Example", sessionToken: user, includedRegionCodes: ["za"], languageCode: "en" });
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: "no-store", headers: { "X-Goog-Api-Key": "test-server-secret" } });
    expect(fetch.mock.calls[1][0]).toContain(`sessionToken=${user}`);
    expect(fetch.mock.calls[1][1].headers["X-Goog-FieldMask"]).toBe("id,addressComponents");
  });
  it("does not expose upstream errors or keys", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "private provider details" }) }));
    await expect(searchAddresses("12 Example", user)).rejects.toThrow("temporarily unavailable");
  });
});
