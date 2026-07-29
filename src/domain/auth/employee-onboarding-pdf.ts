import { commercialPdf } from "@/domain/documents/commercial-pdf";
import { getDocumentBranding } from "@/domain/documents/branding";

export type EmployeeOnboardingInput = {
  name: string;
  email: string;
  role: string;
  company: string;
  department?: string | null;
  expiresAt: Date;
};

export async function employeeOnboardingPdf(input: EmployeeOnboardingInput) {
  const branding = await getDocumentBranding();
  return commercialPdf({
    title: "EMPLOYEE SYSTEM ONBOARDING GUIDE",
    number: `ONBOARDING-${new Date().getFullYear()}`,
    customer: input.name,
    email: input.email,
    issueDate: new Date(),
    dueDate: input.expiresAt,
    reference: `${input.role} | ${input.department || "General"}`,
    lines: [
      { description: "ACCESS | Activate from the invitation email, replace the temporary password before expiry, and never share credentials or customer data.", quantity: 1 },
      { description: "ROLES & PERMISSIONS | Menus and actions are role-controlled. A visible record does not automatically give approval, payment, deletion, or publishing authority.", quantity: 1 },
      { description: "CUSTOMER CRM | Website registrations, manual records, and CSV imports share the customer profile. Maintain contacts, companies, custom fields, notes, and history.", quantity: 1 },
      { description: "CATALOGUE | Products connect to categories, brands, variants, specifications, images, documents, pricing, promotions, suppliers, and inventory.", quantity: 1 },
      { description: "QUOTATIONS | Customer requests or staff-assisted quotes become provisional and final quotations. Review and approval must happen before payment instructions are sent.", quantity: 1 },
      { description: "RFQs & TENDERS | Sources, extracted requirements, line pricing, supplier selection, costs, commission, approval, and submission remain linked to one opportunity.", quantity: 1 },
      { description: "PAYMENTS | Proof and provider events require authorised verification. Verification reserves current stock and creates the order atomically; never treat submission as payment.", quantity: 1 },
      { description: "ORDERS | Orders retain customer, pricing, tax, product, address, payment, and status snapshots. Use the lifecycle controls instead of editing history manually.", quantity: 1 },
      { description: "INVOICES & DELIVERY NOTES | Commercial documents derive from quotes/orders where possible, retain their own line snapshots, and record generation and sending history.", quantity: 1 },
      { description: "INVENTORY | On-hand, reserved, and available stock are separate. Every adjustment needs a reason and creates an immutable movement ledger entry.", quantity: 1 },
      { description: "SUPPLIERS | Suppliers link to catalogue sourcing, RFQ pricing, logistics, distributor claims, cost recovery, and supporting commercial records.", quantity: 1 },
      { description: "LOGISTICS | Transport may connect to orders, delivery notes, returns, suppliers, distributor claims, partners, and payments. Quotes, approval, proof, cost, and settlement are separate stages.", quantity: 1 },
      { description: "RETURNS & REFUNDS | A case links the customer, original order/item, evidence, inspection, resolution, refund/replacement/repair, returned inventory, recovery, and customer updates.", quantity: 1 },
      { description: "SUPPORT & CALENDAR | Tickets route to departments and assignees; messages and tasks form the activity history and dated work appears in the operations calendar.", quantity: 1 },
      { description: "PARTNERSHIPS | A partner remains the same verified customer. Applications, evidence, approval, benefits, terms, agreements, requests, offers, and messages stay connected.", quantity: 1 },
      { description: "MARKETING & CONTENT | Homepage content, blog, media, popups, campaigns, SEO, redirects, catalogue publishing, and analytics affect the customer-facing site.", quantity: 1 },
      { description: "DOCUMENT CENTRE | Download and send only authorised documents. Private files use protected storage; dispatch records retain recipients, attachment names, and resend history.", quantity: 1 },
      { description: "REPORTS & SYNCHRONISATION | Reports read operational source records. Supplier/catalogue synchronisation must not bypass product review, stock controls, or publishing rules.", quantity: 1 },
      { description: "AUDIT & TEST MODE | Important changes record actor and before/after context. Test data must remain identifiable and must never be confused with production business activity.", quantity: 1 },
      { description: "DAILY CONTROL | Verify identities, references, totals, VAT, stock, recipients, documents, permissions, and current status before any consequential action.", quantity: 1 },
      { description: "ESCALATION | Stop and contact support when access looks wrong, records disagree, an email/document has the wrong recipient, or payment and stock do not reconcile.", quantity: 1 },
    ],
    notes: [
      `Assigned role: ${input.role}`,
      `Company: ${input.company}`,
      `Department: ${input.department || "Not assigned"}`,
      "",
      "Your permissions may not include every area listed above. Only use modules and actions made available to your role. Important business changes are audited.",
      "",
      `Support: ${branding.email} | ${branding.phone}`,
    ].join("\n"),
  }, branding);
}
