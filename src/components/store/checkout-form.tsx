"use client";
import { useActionState, type ReactNode } from "react";
import { placeRetailOrder } from "@/domain/checkout/actions";
export function CheckoutForm({ children, className }: { children: ReactNode; className: string }) {
  const [state, action] = useActionState(placeRetailOrder, { error: "" });
  return <form action={action} className={className}>{state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 lg:col-span-2">{state.error}</p>}{children}</form>;
}
