import { AdminPage, Panel, buttonClass, inputClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createTransport } from "@/domain/logistics/actions";
import { prisma } from "@/lib/prisma";

export default async function NewTransport() {
  await requirePermission("transport.create");
  const [categories, providers, orders, suppliers, returns, claims, staff, partners, deliveryNotes] = await Promise.all([
    prisma.transportCategory.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.transportProvider.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, orderNumber: true, email: true } }),
    prisma.supplier.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { companyName: "asc" } }),
    prisma.returnCase.findMany({ where: { status: { not: "CLOSED" } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.distributorClaim.findMany({ where: { status: { notIn: ["CLOSED", "DECLINED"] } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.findMany({
      where: { accountType: "INTERNAL_EMPLOYEE", status: "ACTIVE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.partnership.findMany({
      where: { status: { in: ["APPROVED", "CONDITIONALLY_APPROVED"] } },
      include: { owner: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.deliveryNote.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const field = `${inputClass} mt-1 w-full`;

  return (
    <AdminPage
      title="Create transport request"
      description="Choose what is moving and when. Existing business data fills in the route, links and financial defaults."
    >
      <Panel>
        <form action={createTransport} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Movement type
              <select className={field} name="categoryId" required>
                <option value="">Select movement type</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Related business record
              <select className={field} name="relatedRecord">
                <option value="">General business movement</option>
                <optgroup label="Orders">
                  {orders.map((order) => <option key={order.id} value={`ORDER:${order.id}`}>{order.orderNumber} · {order.email}</option>)}
                </optgroup>
                <optgroup label="Delivery notes">
                  {deliveryNotes.map((note) => <option key={note.id} value={`DELIVERY_NOTE:${note.id}`}>{note.deliveryNoteNumber}</option>)}
                </optgroup>
                <optgroup label="Returns">
                  {returns.map((item) => <option key={item.id} value={`RETURN_CASE:${item.id}`}>{item.referenceNumber}</option>)}
                </optgroup>
                <optgroup label="Distributor claims">
                  {claims.map((claim) => <option key={claim.id} value={`DISTRIBUTOR_CLAIM:${claim.id}`}>{claim.claimNumber}</option>)}
                </optgroup>
                <optgroup label="Suppliers">
                  {suppliers.map((supplier) => <option key={supplier.id} value={`SUPPLIER:${supplier.id}`}>{supplier.companyName}</option>)}
                </optgroup>
                <optgroup label="Partnerships">
                  {partners.map((partner) => <option key={partner.id} value={`PARTNERSHIP:${partner.id}`}>{partner.partnerNumber} · {partner.owner.name ?? partner.owner.email}</option>)}
                </optgroup>
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                This automatically links the order, customer, delivery note, return, supplier or partner.
              </span>
            </label>
            <label className="text-sm font-semibold">
              Provider
              <select className={field} name="providerId">
                <option value="">Choose later / internal transport</option>
                {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Planned date
              <input className={field} name="scheduledAt" type="datetime-local" />
            </label>
          </div>

          <details className="rounded-lg border border-slate-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              Route and instructions <span className="font-normal text-slate-500">· optional</span>
            </summary>
            <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Origin<input className={field} name="origin" placeholder="Filled automatically when available" /></label>
              <label className="text-sm font-semibold">Destination<input className={field} name="destination" placeholder="Filled automatically when available" /></label>
              <label className="text-sm font-semibold md:col-span-2">Purpose<textarea className={`${field} min-h-20`} name="purpose" placeholder="Generated from the movement type and linked record" /></label>
              <label className="text-sm font-semibold md:col-span-2">Special handling instructions<textarea className={`${field} min-h-20`} name="specialInstructions" placeholder="Fragile items, access instructions, contact details or timing constraints" /></label>
            </div>
          </details>

          <details className="rounded-lg border border-slate-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              Internal assignment <span className="font-normal text-slate-500">· optional</span>
            </summary>
            <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Responsible person
                <select className={field} name="responsibleUserId">
                  <option value="">Assign later</option>
                  {staff.map((person) => <option key={person.id} value={person.id}>{person.name ?? person.email}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Technician
                <select className={field} name="technicianId">
                  <option value="">Not required / assign later</option>
                  {staff.map((person) => <option key={person.id} value={person.id}>{person.name ?? person.email}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold md:col-span-2">Internal note<textarea className={`${field} min-h-20`} name="internalNote" /></label>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <p className="max-w-2xl text-xs leading-5 text-slate-500">
              Costs, quotations, approval, driver details and payment are recorded only when their workflow stage is reached.
            </p>
            <button className={buttonClass}>Create transport request</button>
          </div>
        </form>
      </Panel>
    </AdminPage>
  );
}
