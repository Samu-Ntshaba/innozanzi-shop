import { AdminPage, Panel } from "@/components/admin/admin-ui";
import { LinkedinContentGenerator } from "@/components/admin/linkedin-content-generator";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export default async function LinkedinContentPage() {
  await requirePermission("marketing.content.view");
  const products = await prisma.supplierCatalogueProduct.findMany({
    where: { active: true, availability: "IN_STOCK", stock: { gt: 0 } },
    select: { id: true, name: true, brand: true, manufacturerSku: true },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    take: 500,
  });
  return <AdminPage title="LinkedIn content generator" description="Create useful, factual B2B drafts from catalogue products or practical business technology themes.">
    <Panel title="Recommended workflow" description="Keep a person responsible for the final decision.">
      <p className="text-sm leading-6 text-slate-600">Generate a draft, verify its product facts and claims, adjust the wording for the current campaign, then copy the approved post into LinkedIn or your approval workflow.</p>
    </Panel>
    <LinkedinContentGenerator products={products}/>
  </AdminPage>;
}
