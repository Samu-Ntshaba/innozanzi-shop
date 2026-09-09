import { requireUser } from "@/domain/auth/session";
import { listAddresses } from "@/domain/addresses/service";
import { mapsConfigured } from "@/domain/addresses/google-places";
import { getDeliveryProvinces } from "@/domain/addresses/delivery-areas";
import { changeAddress } from "@/domain/addresses/actions";
import { AddressForm } from "@/components/account/address-form";
import { prisma } from "@/lib/prisma";

export default async function AddressesPage() {
  const ctx = await requireUser();
  const [addresses, profile, supportedProvinces] = await Promise.all([
    listAddresses(ctx.user.id),
    prisma.user.findUnique({ where: { id: ctx.user.id }, select: { phone: true } }),
    getDeliveryProvinces(),
  ]);
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Delivery addresses</h1><p className="mt-2 text-sm text-slate-600">Save addresses for your next order. To change an address, add its updated details and remove the old one. Existing orders keep their original delivery details.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{addresses.map(address => <article key={address.id} className="rounded-xl border bg-white p-4 text-sm leading-6">
      <strong>{address.recipient}{address.isDefault ? " · Default" : ""}</strong>
      <p>{address.line1}{address.line2 ? ", " + address.line2 : ""}</p>
      <p>{address.suburb} {address.city}, {address.province}, {address.postalCode}</p>
      <p>{address.phone || "Cellphone number required before checkout"}</p>
      {mapsConfigured() && !address.googlePlaceId ? <p className="mt-2 text-amber-800">Add this address again using Google search before using it at checkout.</p> : null}
      {!supportedProvinces.includes(address.province) ? <p className="mt-2 text-amber-800">This province is not currently enabled for delivery.</p> : null}
      <form action={changeAddress} className="mt-3 flex gap-4"><input type="hidden" name="id" value={address.id}/>{!address.isDefault ? <button name="action" value="default" className="text-sky-700 underline">Set as default</button> : null}<button name="action" value="remove" className="text-red-700 underline">Remove</button></form>
    </article>)}</div>
    <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Add an address</h2><AddressForm mapsEnabled={mapsConfigured()} name={ctx.user.name ?? ""} phone={profile?.phone ?? ""} supportedProvinces={supportedProvinces}/></section>
  </div>;
}
