"use client";
import { useActionState } from "react";
import { saveAddress } from "@/domain/addresses/actions";
import { DeliveryAddressFields } from "@/components/store/delivery-address-fields";
import type { Province } from "@/domain/addresses/delivery-areas";
export function AddressForm(props: { mapsEnabled: boolean; name: string; phone: string; supportedProvinces: Province[] }) {
  const [state, action, pending] = useActionState(saveAddress, { error: "", success: false });
  return <form action={action} className="min-w-0"><DeliveryAddressFields {...props}/>{state.error && <p role="alert" className="mt-4 text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="mt-4 text-sm text-emerald-700">Address saved. You can choose it at checkout.</p>}<button disabled={pending} className="mt-5 w-full rounded-lg bg-sky-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{pending ? "Saving…" : "Save address"}</button></form>;
}
