import Link from "next/link";
import { AdminPage, Panel, secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { importCustomers } from "@/domain/crm/actions";
import { prisma } from "@/lib/prisma";
import { ImportCustomers } from "./import-customers";

export default async function ImportCustomersPage() {
  await requirePermission("customers.manage");
  const fields = await prisma.crmCustomField.findMany({ select: { key: true, label: true }, orderBy: { createdAt: "asc" } });
  return <AdminPage title="Bulk import customers" description="Upload a CSV, match its columns to the CRM, and turn unmatched columns into new CRM fields." actions={<Link className={secondaryButtonClass} href="/admin/customers">Cancel</Link>}>
    <Panel title="CSV column mapping" description="The first row must contain column names. You can import up to 2,000 customers at a time.">
      <ImportCustomers action={importCustomers} fields={fields} />
    </Panel>
  </AdminPage>;
}
