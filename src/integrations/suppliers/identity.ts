import { createHash } from "node:crypto";
const normalized=(s:string)=>s.normalize("NFKC").trim().toUpperCase();
function validGtin(value:string){if(![8,12,13,14].includes(value.length)||!/^\d+$/.test(value)||/^0+$/.test(value))return false;const digits=value.split("").map(Number),check=digits.pop()!;const sum=digits.reverse().reduce((s,d,i)=>s+d*(i%2===0?3:1),0);return (10-sum%10)%10===check;}
// No title matching: ambiguous/unknown models remain separate offers.
export function supplierIdentity(input:{supplierId:string;sku:string;brand?:string|null;mpn?:string|null;barcode?:string|null;condition?:string|null}){
 const condition=normalized(input.condition??"NEW");
 if(input.barcode&&validGtin(input.barcode))return `gtin:${input.barcode.padStart(14,"0")}:${condition}`;
 if(input.brand&&input.mpn)return `mpn:${normalized(input.brand)}:${normalized(input.mpn)}:${condition}`;
 return `offer:${input.supplierId}:${input.sku.trim()}`;
}
export function offerSlug(name:string,supplierId:string,sku:string){return `${name.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,130)}-${createHash("sha256").update(`${supplierId}:${sku}`).digest("hex").slice(0,12)}`;}
