"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { provinces, type DeliveryAddress, type SavedAddress } from "@/domain/addresses/schema";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 focus:outline-sky-600";
type Suggestion = { id: string; text: string };
type Province = DeliveryAddress["province"];
type AddressDraft = Omit<DeliveryAddress, "province"> & { province: Province | "" };
export function DeliveryAddressFields({ addresses = [], mapsEnabled, name = "", phone = "", supportedProvinces = [...provinces] }: { addresses?: SavedAddress[]; mapsEnabled: boolean; name?: string; phone?: string; supportedProvinces?: Province[] }) {
  const usable = addresses.filter(a => (!mapsEnabled || a.googlePlaceId) && supportedProvinces.includes(a.province) && /^(?:\+27|0)[6-8]\d{8}$/.test(a.phone.replace(/[\s()-]/g, "")));
  const [selected, setSelected] = useState(usable[0]?.id ?? "");
  const [address, setAddress] = useState<AddressDraft>({ recipient: name, phone, line1: "", line2: "", suburb: "", city: "", province: "", postalCode: "" });
  const [query, setQuery] = useState("");
  const [proof, setProof] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const session = useRef("");
  const generation = useRef(0);
  const listId = useId();
  const chosen = usable.find(a => a.id === selected);
  useEffect(() => {
    if (!mapsEnabled || selected || proof || query.trim().length < 3) return;
    const controller = new AbortController();
    const current = ++generation.current;
    const timer = setTimeout(async () => {
      if (current !== generation.current) return;
      setBusy(true); setError("");
      try {
        session.current ||= crypto.randomUUID();
        const response = await fetch("/api/addresses/places", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "search", input: query, sessionToken: session.current }), signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (current === generation.current) { setSuggestions(result.suggestions); setActive(-1); if (!result.suggestions.length) setError("No matching addresses. Include your street number and city."); }
      } catch (e) { if (!controller.signal.aborted && current === generation.current) setError(e instanceof Error ? e.message : "Address search is unavailable."); }
      finally { if (!controller.signal.aborted && current === generation.current) setBusy(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, mapsEnabled, selected, proof]);
  async function choose(suggestion: Suggestion) {
    const current = ++generation.current;
    setSuggestions([]); setBusy(true); setError("");
    try {
      const response = await fetch("/api/addresses/places", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "resolve", placeId: suggestion.id, sessionToken: session.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (current !== generation.current) return;
      const next = result.address as DeliveryAddress;
      setAddress(a => ({ ...a, ...next })); setQuery(suggestion.text);
      if (!supportedProvinces.includes(next.province)) { setProof(""); setError("We currently deliver to " + supportedProvinces.join(", ") + "."); }
      else setProof(result.proof);
    } catch (e) { if (current === generation.current) setError(e instanceof Error ? e.message : "Could not select this address."); }
    finally { session.current = ""; if (current === generation.current) setBusy(false); }
  }
  const fields = [["recipient", "Recipient name", "name"], ["phone", "Phone number", "tel"], ["line1", "Street address", "address-line1"], ["line2", "Unit, complex or building (optional)", "address-line2"], ["suburb", "Suburb (optional)", "address-level3"], ["city", "City", "address-level2"], ["postalCode", "Postal code", "postal-code"]] as const;
  return <div className="mt-5 space-y-4">
    {usable.length > 0 && <label className="block text-sm font-semibold">Deliver to<select className={inputClass} name="addressId" value={selected} onChange={e => { generation.current++; setBusy(false); setSelected(e.target.value); setSuggestions([]); }}>{usable.map(a => <option key={a.id} value={a.id}>{a.isDefault ? "Default · " : ""}{a.line1}, {a.city}</option>)}<option value="">Use a new address</option></select></label>}
    {chosen ? <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6"><strong>{chosen.recipient}</strong><p>{chosen.line1}{chosen.line2 ? `, ${chosen.line2}` : ""}</p><p>{chosen.suburb} {chosen.city}, {chosen.province}, {chosen.postalCode}</p><p>{chosen.phone}</p><Link href="/account/addresses" className="text-sky-700 underline">Manage saved addresses</Link></div> : <>
      {mapsEnabled && <div className="relative"><label htmlFor={`${listId}-search`} className="text-sm font-semibold">Find your delivery address</label><input id={`${listId}-search`} className={inputClass} role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" placeholder="Start with your street number and name" value={query} onChange={e => { generation.current++; setBusy(false); setQuery(e.target.value); setProof(""); setSuggestions([]); setActive(-1); }} onKeyDown={e => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive(i => suggestions.length ? (i + (e.key === "ArrowDown" ? 1 : suggestions.length - 1)) % suggestions.length : -1); }
        if (e.key === "Escape") { generation.current++; setBusy(false); setSuggestions([]); setActive(-1); }
        if (e.key === "Enter") { e.preventDefault(); if (active >= 0 && suggestions[active]) void choose(suggestions[active]); }
      }}/>
        {suggestions.length > 0 && <div className="absolute z-20 w-full overflow-hidden rounded-lg border bg-white shadow-lg"><ul id={listId} role="listbox">{suggestions.map((s, i) => <li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={active === i}><button type="button" tabIndex={-1} className={`w-full px-3 py-3 text-left text-sm hover:bg-sky-50 ${active === i ? "bg-sky-50" : ""}`} onClick={() => void choose(s)}>{s.text}</button></li>)}</ul><p translate="no" className="whitespace-nowrap px-3 py-2 text-right font-sans text-xs font-normal text-[#5e5e5e]">Google Maps</p></div>}
        {/* <p className="mt-2 text-xs text-slate-500">Street searches are sent to Google Maps. Select a result, then add your unit and contact details. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">Google privacy</a> · <a href="https://maps.google.com/help/terms_maps/" target="_blank" rel="noreferrer" className="underline">Google Maps terms</a></p> */}
        <p role="status" className="mt-1 text-sm text-sky-800">{busy ? "Searching…" : proof ? "Address selected. Please check your delivery details." : ""}</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error} <Link className="underline" href="/contact">Contact support</Link></p>}
        <input type="hidden" name="addressProof" value={proof}/>
      </div>}
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(([field, fieldLabel, autocomplete]) => <label key={field} className="text-sm font-semibold">{fieldLabel}<input className={inputClass} name={field} value={address[field]} autoComplete={autocomplete} type={field === "phone" ? "tel" : "text"} required={!["line2", "suburb"].includes(field)} maxLength={field === "postalCode" ? 4 : field === "phone" ? 40 : 180} pattern={field === "postalCode" ? "[0-9]{4}" : undefined} inputMode={field === "postalCode" ? "numeric" : field === "phone" ? "tel" : undefined} title={field === "phone" ? "Enter a South African cellphone number, for example 0712345678" : undefined} readOnly={mapsEnabled && ["line1", "city", "suburb", "postalCode"].includes(field)} onChange={e => setAddress(a => ({ ...a, [field]: e.target.value }))}/></label>)}
        <label className="text-sm font-semibold">Province<select className={inputClass} name={mapsEnabled ? undefined : "province"} value={address.province} disabled={mapsEnabled} required onChange={e => setAddress(a => ({ ...a, province: e.target.value as Province }))}><option value="" disabled>Select province</option>{supportedProvinces.map(p => <option key={p}>{p}</option>)}</select>{mapsEnabled && <input type="hidden" name="province" value={address.province}/>}</label>
      </div>
      <p className="text-xs text-slate-500">Delivery is currently available in {supportedProvinces.join(", ")}.</p>
      {mapsEnabled && !proof && <p className="text-sm text-slate-600">Choose a complete street address above to continue.</p>}
    </>}
  </div>;
}
