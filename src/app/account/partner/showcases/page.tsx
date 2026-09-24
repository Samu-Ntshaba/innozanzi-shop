import Link from "next/link";
import { requirePartnerSalesContext } from "@/domain/partner-sales/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PartnerShowcasesPage() {
  const { partnership } = await requirePartnerSalesContext();
  const showcases = await prisma.partnerShowcase.findMany({
    where: { profile: { partnershipId: partnership.id } },
    select: {
      id: true,
      publicId: true,
      title: true,
      status: true,
      visibility: true,
      expiresAt: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">Partner sales</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Showcases</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Curate approved catalogue items for a public partner page or a private, expiring client link.
          </p>
        </div>
        <Link className="inline-flex min-h-11 items-center rounded-xl bg-sky-700 px-5 text-sm font-black text-white hover:bg-sky-800" href="/account/partner/showcases/new">
          New showcase
        </Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3">Showcase</th><th className="px-5 py-3">Visibility</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Expiry</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {showcases.map((showcase) => (
                <tr key={showcase.id}>
                  <td className="px-5 py-4"><p className="font-bold text-slate-950">{showcase.title}</p><p className="mt-1 text-xs text-slate-500">{showcase.publicId}</p></td>
                  <td className="px-5 py-4 text-slate-600">{showcase.visibility === "CLIENT_SPECIFIC" ? "Private client link" : "Public"}</td>
                  <td className="px-5 py-4 text-slate-600">{showcase._count.items}</td>
                  <td className="px-5 py-4 font-bold text-slate-700">{showcase.status.replaceAll("_", " ")}</td>
                  <td className="px-5 py-4 text-slate-600">{showcase.expiresAt?.toLocaleDateString("en-ZA") ?? "No expiry"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!showcases.length ? <p className="px-5 py-12 text-center text-sm text-slate-500">No showcases yet. Create one from approved catalogue items.</p> : null}
      </section>
    </main>
  );
}
