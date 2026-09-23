import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, Mail, Phone, ShieldCheck } from "lucide-react";
import { partnerCatalogue } from "@/domain/partner-sales/catalogue";
import { supportEmail } from "@/lib/support";

export const dynamic = "force-dynamic";

const themeStyles = {
  DEFAULT: {
    hero: "border-slate-200 bg-white text-slate-950",
    accent: "bg-sky-700 text-white hover:bg-sky-800",
    eyebrow: "text-sky-700",
  },
  OCEAN: {
    hero: "border-sky-800 bg-sky-950 text-white",
    accent: "bg-cyan-300 text-sky-950 hover:bg-cyan-200",
    eyebrow: "text-cyan-300",
  },
  FOREST: {
    hero: "border-emerald-800 bg-emerald-950 text-white",
    accent: "bg-emerald-300 text-emerald-950 hover:bg-emerald-200",
    eyebrow: "text-emerald-300",
  },
  GRAPHITE: {
    hero: "border-slate-700 bg-slate-950 text-white",
    accent: "bg-white text-slate-950 hover:bg-slate-100",
    eyebrow: "text-slate-300",
  },
} as const;

function quotationHref(
  email: string | null,
  partnerName: string,
  itemTitle?: string,
) {
  const recipient = email ?? supportEmail;
  const subject = itemTitle
    ? `Quotation request: ${itemTitle} via ${partnerName}`
    : `Quotation request via ${partnerName}`;
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}`;
}

export default async function PublicPartnerCataloguePage({
  params,
}: {
  params: Promise<{ partnerSlug: string }>;
}) {
  const { partnerSlug } = await params;
  const catalogue = await partnerCatalogue(partnerSlug, new Date());
  if (!catalogue) notFound();

  const { profile, items } = catalogue;
  const theme =
    profile.themePreset in themeStyles
      ? themeStyles[profile.themePreset as keyof typeof themeStyles]
      : themeStyles.DEFAULT;

  return (
    <main className="bg-slate-50 pb-20">
      <section className={`border-b ${theme.hero}`}>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.42fr)]">
            <div>
              <p className={`text-xs font-black uppercase tracking-[.2em] ${theme.eyebrow}`}>
                Approved Innozanzi sales partner
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-5">
                {profile.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Approved tenant logos use the configured public asset bucket.
                  <img
                    alt={`${profile.displayName} logo`}
                    className="h-20 w-40 rounded-xl bg-white object-contain p-3 shadow-sm"
                    src={profile.logoUrl}
                  />
                ) : null}
                <div>
                  <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                    {profile.displayName}
                  </h1>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold opacity-80">
                    <BadgeCheck className="size-4" /> Approved technology catalogue
                  </p>
                </div>
              </div>
              {profile.footerText ? (
                <p className="mt-6 max-w-3xl whitespace-pre-wrap text-base leading-7 opacity-85 sm:text-lg">
                  {profile.footerText}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-current/20 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-sm font-bold">Talk to the partner team</p>
              <div className="mt-3 grid gap-2 text-sm">
                {profile.contactEmail ? (
                  <a className="flex items-center gap-2 break-all underline" href={`mailto:${profile.contactEmail}`}>
                    <Mail className="size-4 shrink-0" /> {profile.contactEmail}
                  </a>
                ) : null}
                {profile.contactPhone ? (
                  <a className="flex items-center gap-2" href={`tel:${profile.contactPhone}`}>
                    <Phone className="size-4 shrink-0" /> {profile.contactPhone}
                  </a>
                ) : null}
              </div>
              <a
                className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition ${theme.accent}`}
                href={quotationHref(profile.contactEmail, profile.displayName)}
              >
                Request quotation <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">
              Curated for business
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Approved catalogue
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Select what your organisation needs and request a tailored quotation. Prices are confirmed by Innozanzi after current availability and commercial review.
            </p>
          </div>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            {items.length} available {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {items.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                key={item.assignmentId}
              >
                <div className="grid aspect-[16/10] place-items-center bg-slate-100 p-6">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Approved catalogue media may originate from vetted supplier hosts.
                    <img
                      alt={item.image.altText ?? item.title}
                      className="h-full w-full object-contain"
                      loading="lazy"
                      src={item.image.url}
                    />
                  ) : (
                    <ShieldCheck className="size-16 text-slate-300" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {item.sku ? (
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      SKU {item.sku}
                    </p>
                  ) : null}
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <a
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-black text-white transition hover:bg-sky-800"
                    href={quotationHref(
                      profile.contactEmail,
                      profile.displayName,
                      item.title,
                    )}
                  >
                    Request quotation <ArrowRight className="size-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h3 className="text-xl font-bold text-slate-950">Catalogue update in progress</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Current availability is being reviewed. Contact the partner team for a tailored technology quotation.
            </p>
          </div>
        )}
      </section>

      <section id="request-quotation" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Need a tailored solution?</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              Tell {profile.displayName} what your business needs. The team will coordinate a current, approved quotation with Innozanzi.
            </p>
          </div>
          <a
            className="mt-5 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-700 px-6 text-sm font-black text-white hover:bg-sky-800 sm:mt-0"
            href={quotationHref(profile.contactEmail, profile.displayName)}
          >
            Request quotation <ArrowRight className="size-4" />
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
          <p className="font-bold text-slate-900">Merchant and fulfilment disclosure</p>
          <p className="mt-1">
            Innozanzi is the merchant of record. Quotations and tax documents are issued by Innozanzi on behalf of {profile.displayName}; payment is collected by Innozanzi, which also manages fulfilment and order communication.
          </p>
          <Link className="mt-3 inline-block font-semibold text-sky-700 underline" href="/contact">
            Contact Innozanzi support
          </Link>
        </div>
      </section>
    </main>
  );
}
