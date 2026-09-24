import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminPage,
  EmptyState,
  Panel,
  StatusBadge,
  buttonClass,
  dangerButtonClass,
  inputClass,
  secondaryButtonClass,
  tableClass,
} from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const route = "/api/admin/partner-sales/catalogue";
const successMessages: Record<string, string> = {
  assigned: "Catalogue item approved and assigned.",
  withdrawn: "Catalogue item withdrawn from public use.",
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PartnerCatalogueAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string | string[];
    message?: string | string[];
  }>;
}) {
  await requirePermission("partner_sales.catalogue.manage");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const partnership = await prisma.partnership.findUnique({
    where: { id },
    select: {
      id: true,
      partnerNumber: true,
      owner: { select: { name: true, email: true } },
      salesProfile: {
        select: {
          id: true,
          publicSlug: true,
          displayName: true,
          status: true,
          publicCatalogueEnabled: true,
          catalogueAssignments: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              sourceType: true,
              sourceId: true,
              status: true,
              visibleFrom: true,
              visibleUntil: true,
              presentationTitle: true,
              approvedAt: true,
              withdrawnAt: true,
            },
          },
        },
      },
    },
  });
  if (!partnership) notFound();

  const profile = partnership.salesProfile;
  const status = queryValue(query.status);
  const isError = status === "error";
  const message = isError
    ? queryValue(query.message) || "The catalogue assignment could not be updated."
    : status
      ? successMessages[status]
      : undefined;

  return (
    <AdminPage
      title="Approved catalogue"
      description={`${partnership.partnerNumber} · ${partnership.owner.name ?? partnership.owner.email} · explicit products and combos only`}
      actions={
        <>
          <Link
            className={secondaryButtonClass}
            href={`/admin/partnerships/partners/${partnership.id}/sales-channel`}
          >
            Sales profile
          </Link>
          {profile ? <StatusBadge value={profile.status} /> : null}
        </>
      }
    >
      {message ? (
        <div
          className={`border px-4 py-3 text-sm ${isError ? "border-rose-300 bg-rose-50 text-rose-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
          role={isError ? "alert" : "status"}
        >
          {message}
        </div>
      ) : null}

      {!profile ? (
        <Panel>
          <EmptyState
            title="Create the sales profile first"
            description="Catalogue approval is available after the partner has a controlled sales-channel profile."
            action={
              <Link
                className={buttonClass}
                href={`/admin/partnerships/partners/${partnership.id}/sales-channel`}
              >
                Set up sales profile
              </Link>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
          <Panel
            title="Approved assignments"
            description="Visibility is withdrawn automatically when its window expires or current stock, cost, or source eligibility changes."
          >
            {profile.catalogueAssignments.length ? (
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th>Presentation</th>
                    <th>Typed source</th>
                    <th>Window</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.catalogueAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <strong className="block text-slate-900">
                          {assignment.presentationTitle || "Use source title"}
                        </strong>
                        <span className="font-mono text-xs text-slate-500">
                          {assignment.id}
                        </span>
                      </td>
                      <td>
                        <span className="block font-semibold">
                          {assignment.sourceType.replaceAll("_", " ")}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          {assignment.sourceId}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600">
                        <span className="block">
                          From: {assignment.visibleFrom?.toLocaleString("en-ZA") ?? "Immediately"}
                        </span>
                        <span className="block">
                          Until: {assignment.visibleUntil?.toLocaleString("en-ZA") ?? "No set end"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge value={assignment.status} />
                      </td>
                      <td>
                        {assignment.status === "ACTIVE" ? (
                          <form action={route} className="grid min-w-56 gap-2" method="post">
                            <input name="operation" type="hidden" value="withdraw" />
                            <input name="partnershipId" type="hidden" value={partnership.id} />
                            <input name="assignmentId" type="hidden" value={assignment.id} />
                            <input
                              aria-label="Withdrawal reason"
                              className={inputClass}
                              maxLength={1000}
                              minLength={5}
                              name="reason"
                              placeholder="Required withdrawal reason"
                              required
                            />
                            <button className={dangerButtonClass}>Withdraw</button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {assignment.withdrawnAt?.toLocaleString("en-ZA") ?? "Withdrawn"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="No approved catalogue items"
                description="Assign a sellable source using the controlled form. Nothing is published automatically."
              />
            )}
          </Panel>

          <Panel
            title="Assign a catalogue source"
            description="Use the source UUID from an approved Product or Supplier Catalogue record. Combo and campaign sources are disabled for this rollout."
          >
            <form action={route} className="grid gap-4" method="post">
              <input name="operation" type="hidden" value="assign" />
              <input name="partnershipId" type="hidden" value={partnership.id} />
              <label className="text-sm font-semibold">
                Source type
                <select className={`${inputClass} mt-1`} name="sourceType" required>
                  <option value="PRODUCT">Innozanzi product</option>
                  <option value="SUPPLIER_CATALOGUE_PRODUCT">Supplier catalogue product</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Source UUID
                <input
                  className={`${inputClass} mt-1 font-mono`}
                  name="sourceId"
                  placeholder="00000000-0000-4000-8000-000000000000"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="text-sm font-semibold">
                  Visible from
                  <input className={`${inputClass} mt-1`} name="visibleFrom" type="datetime-local" />
                </label>
                <label className="text-sm font-semibold">
                  Visible until
                  <input className={`${inputClass} mt-1`} name="visibleUntil" type="datetime-local" />
                </label>
              </div>
              <label className="text-sm font-semibold">
                Presentation title
                <input
                  className={`${inputClass} mt-1`}
                  maxLength={180}
                  name="presentationTitle"
                  placeholder="Optional partner-specific title"
                />
              </label>
              <label className="text-sm font-semibold">
                Presentation copy
                <textarea
                  className={`${inputClass} mt-1 min-h-28`}
                  maxLength={1200}
                  name="presentationCopy"
                  placeholder="Optional approved plain-text description"
                />
              </label>
              <button className={buttonClass}>Approve and assign</button>
              <p className="text-xs leading-5 text-slate-500">
                No public price is published. Cost, margin, supplier identity, protected floors and internal notes remain private.
              </p>
            </form>
            {profile.publicSlug ? (
              <Link
                className={`${secondaryButtonClass} mt-4 w-full`}
                href={`/p/${profile.publicSlug}`}
                target="_blank"
              >
                Preview public catalogue
              </Link>
            ) : null}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}
