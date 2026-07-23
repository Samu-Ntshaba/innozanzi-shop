import {describe,expect,it} from"vitest";
import{canActivateAgreement,canChangeAgreement}from"../../src/domain/partnerships/agreement-rules";

describe("partnership agreement controls",()=>{
  it("requires both parties on the exact same version",()=>{
    expect(canActivateAgreement([{versionId:"v1",signerRole:"PARTNER"},{versionId:"v1",signerRole:"INNOZANZI"}],"v1")).toBe(true);
    expect(canActivateAgreement([{versionId:"v1",signerRole:"PARTNER"},{versionId:"v2",signerRole:"INNOZANZI"}],"v2")).toBe(false);
  });
  it("allows amendments and renewals only for active agreements",()=>{
    expect(canChangeAgreement("ACTIVE")).toBe(true);
    expect(canChangeAgreement("DRAFT")).toBe(false);
    expect(canChangeAgreement("AWAITING_INTERNAL_SIGNATURE")).toBe(false);
  });
});
