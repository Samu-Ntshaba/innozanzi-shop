import {describe,expect,it} from "vitest";
import {extractText} from "unpdf";
import {adminSystemGuidePdf} from "@/domain/documents/commercial-pdf";

describe("admin system guide PDF",()=>{
  it("contains the complete quote-to-delivery operating guide",async()=>{
    const pdf=adminSystemGuidePdf();
    expect(pdf.subarray(0,8).toString()).toBe("%PDF-1.4");
    const result=await extractText(new Uint8Array(pdf),{mergePages:true});
    expect(result.totalPages).toBe(4);
    expect(result.text).toContain("The complete customer journey");
    expect(result.text).toContain("Capture and prepare a quotation");
    expect(result.text).toContain("Acceptance and payment");
    expect(result.text).toContain("Fulfilment, delivery and daily control");
  });
});
