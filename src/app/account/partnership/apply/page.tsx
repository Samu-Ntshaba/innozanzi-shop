import Link from "next/link";
import { Check, FileCheck2, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/domain/auth/session";
import { partnershipStage, PARTNERSHIP_STAGE_COUNT } from "@/domain/partnerships/progress";
import { PartnershipDraftForm, PartnershipSubmitForm, PartnershipUploadForm } from "@/components/account/partnership-forms";

const input = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100";
const label = "text-sm font-semibold text-slate-800";
const stageNames = ["Company details", "Purchasing profile", "Documents & review"];

export default async function Apply({ searchParams }: { searchParams: Promise<{ application?: string; saved?: string; stage?: string }> }) {
  const ctx = await requireUser();
  const params = await searchParams;
  const [types, application] = await Promise.all([
    prisma.partnershipType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    params.application ? prisma.partnershipApplication.findFirst({ where: { id: params.application, userId: ctx.user.id }, include: { partnershipType: true, documents: { include: { document: true } } } }) : Promise.resolve(null),
  ]);
  if (params.application && !application) notFound();
  const requestedStage = Number(params.stage);
  const stage = partnershipStage(Number.isFinite(requestedStage) && requestedStage > 0 ? requestedStage : application?.currentStep);
  const selected = application?.partnershipType ?? types[0];
  const uploadedTypes = new Set(application?.documents.map(document => document.documentType) ?? []);
  const missingDocuments = application?.partnershipType.requiredDocumentTypes.filter(type => !uploadedTypes.has(type)) ?? [];

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Client portal · Partnership</p><h1 className="mt-2 text-3xl font-black text-slate-950">{application ? "Continue your application" : "Partnership application"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Apply for verified business sourcing, repeat procurement or reseller support. Your information stays private and is reviewed by the Innozanzi team.</p></div>
          <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">Stage {stage} of {PARTNERSHIP_STAGE_COUNT}</span>
        </div>

        <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Application progress">
          {stageNames.map((name, index) => { const number = index + 1; const reached = Boolean(application) && number <= Math.max(stage, partnershipStage(application?.currentStep)); const content = <><span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${number === stage ? "bg-sky-700 text-white" : reached ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{reached && number < stage ? <Check className="size-4" /> : number}</span><span className="hidden text-xs font-semibold sm:block">{name}</span></>; return <li key={name}>{reached && application ? <Link className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 hover:border-sky-400" href={`/account/partnership/apply?application=${application.id}&stage=${number}`}>{content}</Link> : <div className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5">{content}</div>}</li>; })}
        </ol>
        {params.saved ? <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">Draft saved. Your next stage is ready, and you can return at any time.</p> : null}
        {!types.length ? <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">Partnership applications are temporarily unavailable. Please contact support.</p> : null}

        {stage === 1 && types.length ? <PartnershipDraftForm buttonLabel="Save and continue to purchasing profile" className="mt-6 grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          {application ? <input type="hidden" name="applicationId" value={application.id} /> : null}<input type="hidden" name="stage" value="1" /><input type="hidden" name="currentStep" value="2" />
          <Section title="Choose the support you need" body="Select the partnership track that best matches how your business buys technology." />
          <label className={`${label} sm:col-span-2`}>Partnership track<select className={input} name="partnershipTypeId" defaultValue={selected?.id ?? ""} required>{types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          {selected ? <p className="rounded-lg bg-sky-50 p-4 text-sm leading-6 text-sky-950 sm:col-span-2"><strong>{selected.name}:</strong> {selected.description}</p> : null}
          <Section title="Registered company" body="Use the details shown on your company registration documents." />
          <Field required name="registeredBusinessName" label="Registered business name" value={application?.registeredBusinessName} /><Field name="tradingName" label="Trading name (optional)" value={application?.tradingName} /><Field required name="registrationNumber" label="Company registration number" value={application?.registrationNumber} /><Field name="vatNumber" label="VAT number (if registered)" value={application?.vatNumber} /><Area required name="businessAddress" label="Registered business address" value={application?.businessAddress} />
          <Section title="Authorised representative" body="This is the person we contact about verification and procurement requests." />
          <Field required name="representativeName" label="Full name" value={application?.representativeName ?? ctx.user.name} /><Field required name="representativeRole" label="Role or position" value={application?.representativeRole} /><Field required name="representativePhone" label="Contact number" value={application?.representativePhone} />
        </PartnershipDraftForm> : null}

        {stage === 2 && application ? <PartnershipDraftForm buttonLabel="Save and continue to documents" className="mt-6 grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          <input type="hidden" name="applicationId" value={application.id} /><input type="hidden" name="partnershipTypeId" value={application.partnershipTypeId} /><input type="hidden" name="stage" value="2" /><input type="hidden" name="currentStep" value="3" />
          <Section title="Tell us how your business buys" body="This helps our procurement team route requests, source suitable products and understand likely order volumes." />
          <Area required name="businessProfile" label="Business profile and activity" value={application.businessProfile} hint="What does your business do, who do you serve, and how will you use or resell the products?" /><Area required name="productCategories" label="Product categories of interest" value={application.productCategories.join(", ")} hint="For example: laptops, networking, monitors and power solutions." /><Field required name="purchasingFrequency" label="Expected purchasing frequency" value={application.purchasingFrequency} /><label className={label}>Estimated monthly purchasing value (optional)<input className={input} name="estimatedMonthlyValue" type="number" min="0" step="0.01" defaultValue={application.estimatedMonthlyValue?.toString()} /></label><Area name="salesChannels" label="Sales channels or marketplaces (optional)" value={application.salesChannels.join(", ")} /><Area name="marketplaceLinks" label="Storefront and marketplace links (optional)" value={application.marketplaceLinks.join("\n")} /><Area name="references" label="Trade references or verification details (optional)" value={application.references} />
        </PartnershipDraftForm> : null}

        {stage === 3 && application ? <>
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex gap-3"><FileCheck2 className="mt-0.5 size-6 shrink-0 text-sky-700" /><div><h2 className="text-xl font-bold text-slate-950">Supporting documents</h2><p className="mt-1 text-sm leading-6 text-slate-600">Upload the documents required for {application.partnershipType.name}. PDF, JPG, PNG, WebP, CSV and XLSX files up to 10 MB are accepted and kept private.</p></div></div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">{application.partnershipType.requiredDocumentTypes.map(type => <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold ${uploadedTypes.has(type) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`} key={type}>{uploadedTypes.has(type) ? <Check className="size-4" /> : <span className="size-2 rounded-full bg-amber-500" />}{friendly(type)} · {uploadedTypes.has(type) ? "uploaded" : "required"}</div>)}</div>
            {application.documents.length ? <div className="mt-5 divide-y rounded-lg border border-slate-200 px-4">{application.documents.map(document => <div className="flex flex-wrap justify-between gap-3 py-3" key={document.id}><div><p className="font-semibold">{friendly(document.documentType)}</p><Link className="text-sm text-sky-700 underline" href={`/api/documents/${document.documentId}`} target="_blank">{document.document.originalName}</Link></div><span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{friendly(document.status)}</span></div>)}</div> : null}
            <PartnershipUploadForm className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"><input type="hidden" name="applicationId" value={application.id} /><label className={label}>Document type<select className={input} name="documentType" required>{[...new Set([...application.partnershipType.requiredDocumentTypes, "DIRECTOR_IDENTIFICATION", "TAX_COMPLIANCE", "VAT_CERTIFICATE", "BANKING_CONFIRMATION", "BBBEE", "BUSINESS_PROFILE", "STORE_SCREENSHOT", "PRODUCT_CATALOGUE", "TRADE_REFERENCE", "OTHER"])].map(type => <option key={type} value={type}>{friendly(type)}</option>)}</select></label><label className={label}>Expiry date (if applicable)<input className={input} name="expiryDate" type="date" /></label><label className={`${label} sm:col-span-2`}>Choose private document<input className={`${input} py-2`} name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx" required /></label></PartnershipUploadForm>
          </section>
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Review your application</h2><p className="mt-1 text-sm text-slate-600">Check your information before submission. Our team reviews the business and documents; submission does not guarantee credit or pricing terms.</p></div><div className="flex gap-2"><Link className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" href={`/account/partnership/apply?application=${application.id}&stage=1`}>Edit company</Link><Link className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" href={`/account/partnership/apply?application=${application.id}&stage=2`}>Edit purchasing</Link></div></div><dl className="mt-5 grid gap-4 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2"><Summary label="Business" value={application.registeredBusinessName} /><Summary label="Representative" value={application.representativeName} /><Summary label="Track" value={application.partnershipType.name} /><Summary label="Purchasing frequency" value={application.purchasingFrequency} /><Summary label="Categories" value={application.productCategories.join(", ")} /><Summary label="Required documents" value={missingDocuments.length ? `${missingDocuments.length} still required` : "All uploaded"} /></dl></section>
          <PartnershipSubmitForm className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5 sm:p-6"><input type="hidden" name="id" value={application.id} /><div className="flex gap-3"><ShieldCheck className="size-6 shrink-0 text-emerald-800" /><div><h2 className="text-xl font-bold text-emerald-950">Declarations and submission</h2><p className="mt-1 text-sm text-emerald-900">After submission, the application is locked while our team reviews it. We will contact you if anything else is needed.</p></div></div><div className="mt-4 space-y-3 text-sm text-emerald-950"><Declaration name="termsAccepted">I accept the partnership programme terms and review process.</Declaration><Declaration name="accuracyDeclared">I confirm the supplied information is accurate.</Declaration><Declaration name="verificationConsent">I consent to Innozanzi verifying the supplied information and documents.</Declaration></div></PartnershipSubmitForm>
        </> : null}
      </div>

      <aside className="h-fit rounded-xl bg-[#071b33] p-5 text-white lg:sticky lg:top-28">
        <p className="text-xs font-bold uppercase tracking-widest text-sky-300">How it works</p><h2 className="mt-2 text-xl font-bold">Partnership procurement</h2><p className="mt-3 text-sm leading-6 text-slate-300">This programme gives verified businesses a structured way to request sourcing, recurring supply and project support after approval.</p>
        <ol className="mt-5 space-y-4 text-sm">{stageNames.map((name, index) => <li className="flex gap-3" key={name}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 font-bold text-sky-200">{index + 1}</span><div><p className="font-bold">{name}</p><p className="mt-1 leading-5 text-slate-400">{index === 0 ? "Tell us who the registered business and contact person are." : index === 1 ? "Explain what you buy, how often and through which channels." : "Upload verification evidence, check everything and submit."}</p></div></li>)}</ol>
        <div className="mt-6 border-t border-white/15 pt-5 text-sm leading-6 text-slate-300"><p className="font-bold text-white">What happens next?</p><p className="mt-1">A human reviewer verifies the application. You will see status updates here and receive an email if documents or changes are required.</p></div>
      </aside>
    </div>
  </main>;
}

function friendly(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase()); }
function Section({ title, body }: { title: string; body: string }) { return <div className="border-b border-slate-200 pb-3 sm:col-span-2"><h2 className="text-lg font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{body}</p></div>; }
function Field({ name, label: valueLabel, value, required = false }: { name: string; label: string; value?: string | null; required?: boolean }) { return <label className={label}>{valueLabel}<input className={input} name={name} defaultValue={value ?? ""} required={required} /></label>; }
function Area({ name, label: valueLabel, value, hint, required = false }: { name: string; label: string; value?: string | null; hint?: string; required?: boolean }) { return <label className={`${label} sm:col-span-2`}>{valueLabel}<textarea className={`${input} min-h-24 py-2`} name={name} defaultValue={value ?? ""} required={required} />{hint ? <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{hint}</span> : null}</label>; }
function Declaration({ name, children }: { name: string; children: React.ReactNode }) { return <label className="flex gap-3"><input className="mt-1 size-4" type="checkbox" name={name} required /><span>{children}</span></label>; }
function Summary({ label: title, value }: { label: string; value?: string | null }) { return <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</dt><dd className="mt-1 font-semibold text-slate-900">{value || "Not provided"}</dd></div>; }
