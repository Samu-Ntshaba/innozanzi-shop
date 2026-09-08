import { requireUser } from "@/domain/auth/session";
import { listAddresses } from "@/domain/addresses/service";
import { mapsConfigured } from "@/domain/addresses/google-places";
import { changeAddress } from "@/domain/addresses/actions";
import { AddressForm } from "@/components/account/address-form";
import { prisma } from "@/lib/prisma";
export default async function AddressesPage() {
  const ctx = await requireUser();
  const [addresses, profile] = await Promise.all([listAddresses(ctx.user.id), prisma.user.findUnique({ where: { id: ctx.user.id }, select: { phone: true } })]);
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Delivery addresses</h1><p className="mt-2 text-sm text-slate-600">Save addresses for your next order. To change an address, add its updated details and remove the old one. Existing orders keep their original delivery details.</p></div><div className="grid gap-4 sm:grid-cols-2">{addresses.map(a => <article key={a.id} className="rounded-xl border bg-white p-4 text-sm leading-6"><strong>{a.recipient}{a.isDefault ? " · Default" : ""}</strong><p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p><p>{a.suburb} {a.city}, {a.province}, {a.postalCode}</p><p>{a.phone}</p>{mapsConfigured() && !a.googlePlaceId && <p className="mt-2 text-amber-800">Add this address again using Google search before using it at checkout.</p>}<form action={changeAddress} className="mt-3 flex gap-4"><input type="hidden" name="id" value={a.id}/>{!a.isDefault && <button name="action" value="default" className="text-sky-700 underline">Set as default</button>}<button name="action" value="remove" className="text-red-700 underline">Remove</button></form></article>)}</div><section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Add an address</h2><AddressForm mapsEnabled={mapsConfigured()} name={ctx.user.name ?? ""} phone={profile?.phone ?? ""}/></section></div>;
}
