import { mkdirSync,writeFileSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { adminSystemGuidePdf } from "../src/domain/documents/commercial-pdf";

const output=resolve(process.argv[2]??"tmp/admin-system-guide/Innozanzi-Admin-System-Guide.pdf");
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,adminSystemGuidePdf());
console.info(output);
