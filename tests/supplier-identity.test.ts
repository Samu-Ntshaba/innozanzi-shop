import { expect,it } from "vitest";
import { offerSlug,supplierIdentity } from "@/integrations/suppliers/identity";
it("preserves supplier-local SKU namespaces and avoids slug collisions",()=>{expect(supplierIdentity({supplierId:"a",sku:"123"})).not.toBe(supplierIdentity({supplierId:"b",sku:"123"}));expect(offerSlug("Laptop","a","123")).not.toBe(offerSlug("Laptop","b","123"));});
it("matches exact branded manufacturer identifiers and separates condition",()=>{expect(supplierIdentity({supplierId:"a",sku:"123",brand:"Dell",mpn:"X1"})).toBe(supplierIdentity({supplierId:"b",sku:"other",brand:"DELL",mpn:"X1"}));expect(supplierIdentity({supplierId:"a",sku:"123",brand:"Dell",mpn:"X1",condition:"UNBOXED"})).not.toBe(supplierIdentity({supplierId:"b",sku:"other",brand:"Dell",mpn:"X1"}));});
