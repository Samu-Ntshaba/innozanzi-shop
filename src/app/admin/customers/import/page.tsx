import Link from "next/link";
import { AdminPage, Panel, secondaryButtonClass } from "@/components/admin/admin-ui";
import { requirePermission } from "@/domain/auth/session";
import { importCustomers } from "@/domain/crm/actions";
import { ImportCustomers } from "./import-customers";
import { getCrmCustomFields } from "@/domain/crm/custom-fields";

export default async function ImportCustomersPage() {
  await requirePermission("customers.manage");
  const fields = await getCrmCustomFields();
  return <AdminPage title="Bulk import customers" description="Upload a CSV, match its columns to the CRM, and turn unmatched columns into new CRM fields." actions={<Link className={secondaryButtonClass} href="/admin/customers">Cancel</Link>}>
    <Panel title="CSV column mapping" description="The first row must contain column names. You can import up to 2,000 customers at a time.">
      <ImportCustomers action={importCustomers} fields={fields} />
    </Panel>
  </AdminPage>;
}
