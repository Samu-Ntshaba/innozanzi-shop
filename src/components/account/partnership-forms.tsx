"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePartnershipDraftSecure, type PartnershipFormState } from "@/domain/partnerships/draft-actions";
import { submitPartnershipApplication } from "@/domain/partnerships/actions";
import { uploadPartnershipDocumentState } from "@/domain/partnerships/documents";

const initialState: PartnershipFormState = {};
const uploadInitialState: { error?: string; success?: string } = {};

function ActionButton({ idle, pending, className }: { idle: string; pending: string; className: string }) {
  const status = useFormStatus();
  return <button className={`${className} disabled:cursor-wait disabled:opacity-60`} disabled={status.pending}>{status.pending ? pending : idle}</button>;
}

export function PartnershipDraftForm({ children, className, buttonLabel }: { children: React.ReactNode; className: string; buttonLabel: string }) {
  const [state, action] = useActionState(savePartnershipDraftSecure, initialState);
  return <form action={action} className={className}>
    {children}
    {state.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-2" role="alert">{state.error}</p> : null}
    <ActionButton className="min-h-12 rounded-lg bg-sky-700 px-5 font-bold text-white sm:col-span-2" idle={buttonLabel} pending="Saving…" />
  </form>;
}

export function PartnershipSubmitForm({ children, className }: { children: React.ReactNode; className: string }) {
  const [state, action] = useActionState(submitPartnershipApplication, initialState);
  return <form action={action} className={className}>
    {children}
    {state.error ? <p className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-sm font-semibold text-red-800" role="alert">{state.error}</p> : null}
    <ActionButton className="mt-5 min-h-12 rounded-lg bg-emerald-700 px-5 py-3 font-bold text-white" idle="Submit application for review" pending="Submitting for review…" />
  </form>;
}

export function PartnershipUploadForm({ children, className }: { children: React.ReactNode; className: string }) {
  const [state, action] = useActionState(uploadPartnershipDocumentState, uploadInitialState);
  return <form action={action} className={className}>
    {children}
    {state.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 sm:col-span-2" role="alert">{state.error}</p> : null}
    {state.success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 sm:col-span-2" role="status">{state.success}</p> : null}
    <ActionButton className="min-h-12 rounded-lg bg-slate-900 px-5 py-3 font-bold text-white sm:col-span-2" idle="Upload document" pending="Uploading securely…" />
  </form>;
}

export function PartnershipActionButton({ idle, pending, className }: { idle: string; pending: string; className: string }) {
  return <ActionButton idle={idle} pending={pending} className={className} />;
}
