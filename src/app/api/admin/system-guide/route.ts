import { adminSystemGuidePdf } from "@/domain/documents/commercial-pdf";
import { requirePermission } from "@/domain/auth/session";

export async function GET(){
  await requirePermission("reports.view");
  const pdf=adminSystemGuidePdf();
  return new Response(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":"inline; filename=Innozanzi-Admin-System-Guide.pdf","Cache-Control":"private, no-store"}});
}
