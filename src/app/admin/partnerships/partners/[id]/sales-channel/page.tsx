import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminPage,
  Panel,
  StatusBadge,
  buttonClass,
  dangerButtonClass,
  inputClass,
  secondaryButtonClass,
} from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { PARTNER_THEME_PRESETS } from "@/domain/partner-sales/profile-service";
import { partnerSalesSettings } from "@/domain/partner-sales/settings";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";

const themeStyles = {
  DEFAULT: "border-slate-300 bg-white text-slate-950",
  OCEAN: "border-sky-300 bg-sky-950 text-white",
  FOREST: "border-emerald-300 bg-emerald-950 text-white",
  GRAPHITE: "border-slate-500 bg-slate-900 text-white",
} as const;

const successMessages: Record<string, string> = {
  saved: "Profile saved successfully.",
  "submit-review": "Profile submitted for Admin review.",
  approve: "Profile approved and activated.",
  "changes-required": "Profile returned with required changes.",
  suspend: "Sales channel suspended.",
  reactivate: "Sales channel reactivated.",
  close: "Sales channel closed.",
};

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PartnerSalesChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string | string[];
    message?: string | string[];
  }>;
}) {
  await requirePermission("partner_sales.profile.approve");
  const [{ id }, query, settings] = await Promise.all([
    params,
    searchParams,
    partnerSalesSettings(),
  ]);
  const partnership = await prisma.partnership.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      agreement: { select: { status: true, expiresAt: true } },
      sourceApplication: {
        select: {
          registeredBusinessName: true,
          tradingName: true,
          registrationNumber: true,
          vatNumber: true,
          representativeName: true,
          representativePhone: true,
        },
      },
      salesProfile: { include: { logoDocument: true } },
    },
  });
  if (!partnership) notFound();

  const profile = partnership.salesProfile;
  const now = new Date();
  const partnershipActive = Boolean(
    partnership.status === "APPROVED" &&
      !partnership.suspendedAt &&
      !partnership.terminatedAt,
  );
  const agreementActive = Boolean(
    partnership.agreement?.status === "ACTIVE" &&
      (!partnership.agreement.expiresAt ||
        partnership.agreement.expiresAt > now),
  );
  const contactReady = Boolean(
    profile?.contactName && profile.contactEmail && profile.contactPhone,
  );
  const readiness = [
    { label: "Partner sales feature enabled", ready: settings.enabled },
    { label: "Partnership active", ready: partnershipActive },
    { label: "Agreement active and current", ready: agreementActive },
    { label: "Approved display name and public slug", ready: Boolean(profile?.displayName && profile.publicSlug) },
    { label: "Validated logo uploaded", ready: Boolean(profile?.logoDocumentId) },
    { label: "Contact details complete", ready: contactReady },
  ];
  const route = `/api/admin/partner-sales/profiles/${partnership.id}`;
  const status = queryValue(query.status);
  const routeMessage = queryValue(query.message);
  const isError = status === "error";
  const message = isError
    ? routeMessage || "The sales profile could not be updated."
    : status
      ? successMessages[status]
      : undefined;
  const canEdit = !profile || ["INVITED", "PROFILE_INCOMPLETE", "ADMIN_REVIEW", "CHANGES_REQUIRED"].includes(profile.status);
  const application = partnership.sourceApplication;
  const displayName = profile?.displayName ?? application.tradingName ?? application.registeredBusinessName ?? "";
  const logoUrl = profile?.logoDocument
    ? createSupabaseAdmin().storage
        .from(profile.logoDocument.bucket)
        .getPublicUrl(profile.logoDocument.path).data.publicUrl
    : null;
  const theme =
    profile?.themePreset && profile.themePreset in themeStyles
      ? (profile.themePreset as keyof typeof themeStyles)
      : "DEFAULT";

  return (
    <AdminPage
      title="Sales channel profile"
      description={`${partnership.partnerNumber} · ${partnership.owner.name ?? partnership.owner.email} · controlled co-branding and activation`}
      actions={
        <>
          <Link
            className={secondaryButtonClass}
            href={`/admin/partnerships/partners/${partnership.id}`}
          >
            Partner record
          </Link>
          <StatusBadge value={profile?.status ?? "INVITED"} />
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

      <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-4">
          <Panel
            title="Approved profile details"
            description="Only these bounded fields and a verified still image can appear in partner-facing material. Custom HTML, CSS, scripts and tracking tags are not accepted."
          >
            <form
              action={route}
              className="grid gap-4 sm:grid-cols-2"
              encType="multipart/form-data"
              method="post"
            >
              <input name="operation" type="hidden" value="save" />
              <label className="text-sm font-semibold">
                Display name
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={displayName}
                  disabled={!canEdit}
                  maxLength={120}
                  minLength={2}
                  name="displayName"
                  required
                />
              </label>
              <label className="text-sm font-semibold">
                Public slug
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.publicSlug ?? ""}
                  disabled={!canEdit}
                  maxLength={80}
                  minLength={3}
                  name="publicSlug"
                  pattern="[A-Za-z0-9 -]+"
                  placeholder="acme-business"
                  required
                />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Legal business name
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.legalName ?? application.registeredBusinessName ?? ""}
                  disabled={!canEdit}
                  maxLength={200}
                  name="legalName"
                />
              </label>
              <label className="text-sm font-semibold">
                Registration number
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.registrationNumber ?? application.registrationNumber ?? ""}
                  disabled={!canEdit}
                  maxLength={100}
                  name="registrationNumber"
                />
              </label>
              <label className="text-sm font-semibold">
                VAT number
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.vatNumber ?? application.vatNumber ?? ""}
                  disabled={!canEdit}
                  maxLength={100}
                  name="vatNumber"
                />
              </label>
              <label className="text-sm font-semibold">
                Contact name
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.contactName ?? application.representativeName ?? ""}
                  disabled={!canEdit}
                  maxLength={120}
                  name="contactName"
                />
              </label>
              <label className="text-sm font-semibold">
                Contact email
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.contactEmail ?? partnership.owner.email}
                  disabled={!canEdit}
                  maxLength={254}
                  name="contactEmail"
                  type="email"
                />
              </label>
              <label className="text-sm font-semibold">
                Contact phone
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.contactPhone ?? application.representativePhone ?? ""}
                  disabled={!canEdit}
                  maxLength={40}
                  name="contactPhone"
                />
              </label>
              <label className="text-sm font-semibold">
                Theme preset
                <select
                  className={`${inputClass} mt-1`}
                  defaultValue={theme}
                  disabled={!canEdit}
                  name="themePreset"
                >
                  {PARTNER_THEME_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset.charAt(0) + preset.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Footer copy
                <textarea
                  className={`${inputClass} mt-1 min-h-24`}
                  defaultValue={profile?.footerText ?? ""}
                  disabled={!canEdit}
                  maxLength={500}
                  name="footerText"
                  placeholder="Plain text only. No markup, links, scripts or tracking tags."
                />
              </label>
              <label className="text-sm font-semibold sm:col-span-2">
                Approved logo
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className={`${inputClass} mt-1 file:mr-3`}
                  disabled={!canEdit}
                  name="logo"
                  type="file"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  JPG, PNG or WebP · verified and re-encoded · maximum 2 MB.
                </span>
              </label>
              <label className="text-sm font-semibold">
                Default commission method
                <select
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.defaultCommissionMethod ?? "PERCENTAGE"}
                  disabled={!canEdit}
                  name="defaultCommissionMethod"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED_AMOUNT">Fixed rand amount</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Default commission value
                <input
                  className={`${inputClass} mt-1`}
                  defaultValue={profile?.defaultCommissionValue.toString() ?? "0"}
                  disabled={!canEdit}
                  max="10000000"
                  min="0"
                  name="defaultCommissionValue"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="flex items-center gap-3 border border-slate-300 p-3 text-sm font-semibold sm:col-span-2">
                <input
                  defaultChecked={profile?.publicCatalogueEnabled ?? false}
                  disabled={!canEdit}
                  name="publicCatalogueEnabled"
                  type="checkbox"
                />
                Publish the catalogue after profile activation
              </label>
              <button className={`${buttonClass} sm:col-span-2`} disabled={!canEdit}>
                Save controlled profile
              </button>
              {!canEdit ? (
                <p className="text-xs text-slate-600 sm:col-span-2">
                  Suspend an active channel before changing approved branding.
                </p>
              ) : null}
            </form>
          </Panel>

          <Panel
            title="Co-branded preview"
            description="This preview uses only the selected safe preset and approved plain-text fields."
          >
            <article className={`border p-6 ${themeStyles[theme]}`}>
              <div className="flex flex-wrap items-center gap-4">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase logo origin is tenant-configured at runtime.
                  <img
                    alt={`${displayName || "Partner"} logo`}
                    className="h-16 w-32 rounded-sm bg-white object-contain p-2"
                    src={logoUrl}
                  />
                ) : (
                  <div className="flex h-16 w-32 items-center justify-center border border-current/30 text-xs">
                    Logo required
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70">Your technology sales partner</p>
                  <h2 className="mt-1 text-2xl font-semibold">{displayName || "Partner display name"}</h2>
                </div>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm opacity-90">
                {profile?.footerText || "Approved partner contact and footer copy appears here."}
              </p>
              <p className="mt-5 border-t border-current/20 pt-4 text-xs leading-5 opacity-80">
                Quotations are issued and payments collected by Innozanzi on behalf of the partner. Innozanzi manages fulfilment and order communication.
              </p>
            </article>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Onboarding readiness">
            <ul className="space-y-3">
              {readiness.map((item) => (
                <li className="flex items-start gap-2 text-sm" key={item.label}>
                  <span
                    aria-hidden="true"
                    className={item.ready ? "text-emerald-700" : "text-amber-700"}
                  >
                    {item.ready ? "●" : "○"}
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Review and activation"
            description="Every lifecycle action is permission-checked, audited and returned to this canonical page."
          >
            <div className="space-y-3">
              {profile && ["PROFILE_INCOMPLETE", "CHANGES_REQUIRED"].includes(profile.status) ? (
                <LifecycleForm
                  action={route}
                  label="Submit for review"
                  operation="submit-review"
                />
              ) : null}
              {profile?.status === "ADMIN_REVIEW" ? (
                <>
                  <LifecycleForm
                    action={route}
                    label="Approve & activate"
                    operation="approve"
                  />
                  <LifecycleForm
                    action={route}
                    label="Request changes"
                    operation="changes-required"
                    reason
                    secondary
                  />
                </>
              ) : null}
              {profile && ["ADMIN_REVIEW", "ACTIVE"].includes(profile.status) ? (
                <LifecycleForm
                  action={route}
                  danger
                  label="Suspend channel"
                  operation="suspend"
                  reason
                />
              ) : null}
              {profile?.status === "SUSPENDED" ? (
                <LifecycleForm
                  action={route}
                  label="Reactivate channel"
                  operation="reactivate"
                />
              ) : null}
              {profile && profile.status !== "CLOSED" ? (
                <LifecycleForm
                  action={route}
                  danger
                  label="Close channel"
                  operation="close"
                  reason
                />
              ) : null}
              {!profile ? (
                <p className="text-sm text-slate-600">Save the controlled profile before review can begin.</p>
              ) : null}
            </div>
          </Panel>
        </aside>
      </div>
    </AdminPage>
  );
}

function LifecycleForm({
  action,
  operation,
  label,
  reason = false,
  danger = false,
  secondary = false,
}: {
  action: string;
  operation: string;
  label: string;
  reason?: boolean;
  danger?: boolean;
  secondary?: boolean;
}) {
  return (
    <form action={action} encType="multipart/form-data" method="post">
      <input name="operation" type="hidden" value={operation} />
      {reason ? (
        <textarea
          className={`${inputClass} mb-2 min-h-20`}
          maxLength={1000}
          minLength={5}
          name="reason"
          placeholder="Required reason"
          required
        />
      ) : null}
      <button
        className={danger ? dangerButtonClass : secondary ? secondaryButtonClass : buttonClass}
      >
        {label}
      </button>
    </form>
  );
}
