import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("payments.approve");
  const id = z.string().uuid().parse((await params).id);
  const proof = await prisma.paymentProof.findUnique({ where: { id }, select: { path: true } });
  if (!proof) return new Response("Not found", { status: 404 });
  const bucket = process.env.SUPABASE_PRIVATE_BUCKET ?? "private-documents";
  const signed = await createSupabaseAdmin().storage.from(bucket).createSignedUrl(proof.path, 300);
  if (signed.error || !signed.data.signedUrl) return new Response("Document unavailable", { status: 503 });
  return NextResponse.redirect(signed.data.signedUrl, 303);
}
