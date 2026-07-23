import { AdminPage, Panel, buttonClass, inputClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { createTransport } from "@/domain/logistics/actions";
import { prisma } from "@/lib/prisma";

export default async function NewTransport() {
  await requirePermission("transport.create");
  const [categories, providers, orders, suppliers, returns, claims, staff, partners, notes] = await Promise.all([
    prisma.transportCategory.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.transportProvider.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, orderNumber: true, email: true } }),
    prisma.supplier.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { companyName: "asc" } }),
    prisma.returnCase.findMany({ where: { status: { not: "CLOSED" } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.distributorClaim.findMany({ where: { status: { notIn: ["CLOSED", "DECLINED"] } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.findMany({ where: { accountType: "INTERNAL_EMPLOYEE", status: "ACTIVE" }, select: { id: true, name: true, email: true } }),
    prisma.partnership.findMany({ where: { status: { in: ["APPROVED", "CONDITIONALLY_APPROVED"] } }, include: { owner: true } }),
    prisma.deliveryNote.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const select = `${inputClass} mt-1 w-full`;
  return <AdminPage title="Create transport record" description="Capture transport arranged inside or outside the system. Only select links relevant to this movement.">
    <Panel><form action={createTransport} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label>Transport type<select className={select} name="categoryId" required><option value="">Select category</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Provider<select className={select} name="providerId"><option value="">Internal / not assigned</option>{providers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Scheduled date<input className={select} name="scheduledAt" type="datetime-local"/></label>
      <label>Origin<input className={select} name="origin" required/></label><label>Destination<input className={select} name="destination" required/></label>
      <label>Distance km<input className={select} name="distanceKm" type="number" min="0" step=".1"/></label>
      <label>Related order<select className={select} name="orderId"><option value="">None</option>{orders.map(x=><option key={x.id} value={x.id}>{x.orderNumber} · {x.email}</option>)}</select></label>
      <label>Delivery note<select className={select} name="deliveryNoteId"><option value="">None</option>{notes.map(x=><option key={x.id} value={x.id}>{x.deliveryNoteNumber}</option>)}</select></label>
      <label>Supplier<select className={select} name="supplierId"><option value="">None</option>{suppliers.map(x=><option key={x.id} value={x.id}>{x.companyName}</option>)}</select></label>
      <label>Return case<select className={select} name="returnCaseId"><option value="">None</option>{returns.map(x=><option key={x.id} value={x.id}>{x.referenceNumber}</option>)}</select></label>
      <label>Distributor claim<select className={select} name="distributorClaimId"><option value="">None</option>{claims.map(x=><option key={x.id} value={x.id}>{x.claimNumber}</option>)}</select></label>
      <label>Partnership<select className={select} name="partnershipId"><option value="">None</option>{partners.map(x=><option key={x.id} value={x.id}>{x.partnerNumber} · {x.owner.name??x.owner.email}</option>)}</select></label>
      <label>Responsible person<select className={select} name="responsibleUserId"><option value="">Unassigned</option>{staff.map(x=><option key={x.id} value={x.id}>{x.name??x.email}</option>)}</select></label>
      <label>Technician<select className={select} name="technicianId"><option value="">None</option>{staff.map(x=><option key={x.id} value={x.id}>{x.name??x.email}</option>)}</select></label>
      <label>PO reference<input className={select} name="purchaseOrderReference"/></label>
      <label>Cost responsibility<select className={select} name="responsibility">{["INNOZANZI","CUSTOMER","SUPPLIER","DISTRIBUTOR","SHARED","INCLUDED_IN_PRODUCT_PRICE","INCLUDED_IN_PARTNERSHIP","RECOVERABLE_FROM_SUPPLIER","RECOVERABLE_FROM_CUSTOMER","WAIVED","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Allocation method<select className={select} name="allocationMethod">{["NONE","FULL_ORDER","EQUAL_PER_ITEM","BY_QUANTITY","BY_PRODUCT_VALUE","BY_WEIGHT","BY_VOLUME","MANUAL"].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Estimated cost R<input className={select} name="estimatedAmount" type="number" min="0" step=".01" defaultValue="0"/></label>
      <label>Proposed budget R<input className={select} name="approvedBudget" type="number" min="0" step=".01" defaultValue="0"/></label>
      <label>Customer charge R<input className={select} name="customerCharge" type="number" min="0" step=".01" defaultValue="0"/></label>
      <label>Vehicle<input className={select} name="vehicle"/></label><label>Driver name<input className={select} name="driverName"/></label>
      <label className="sm:col-span-2 xl:col-span-3">Purpose<textarea className={`${select} min-h-24`} name="purpose" required/></label>
      <label className="sm:col-span-2">Special handling instructions<textarea className={`${select} min-h-20`} name="specialInstructions"/></label>
      <label>Internal note<textarea className={`${select} min-h-20`} name="internalNote"/></label>
      <button className={`${buttonClass} sm:col-span-2 xl:col-span-3`}>Create transport request</button>
    </form></Panel>
  </AdminPage>;
}
