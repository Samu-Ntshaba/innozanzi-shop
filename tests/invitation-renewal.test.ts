import{describe,expect,it}from"vitest";
import{invitationRenewalMode}from"@/domain/auth/invitation-utils";
describe("invitation renewal",()=>{
  it("keeps sales-partner renewal passwordless",()=>{
    expect(invitationRenewalMode([{status:"APPROVED"}])).toBe("LINK_ONLY");
    expect(invitationRenewalMode([{status:"CONDITIONALLY_APPROVED"}])).toBe("LINK_ONLY");
    expect(invitationRenewalMode([{status:"SUSPENDED"}])).toBe("PARTNER_INACTIVE");
    expect(invitationRenewalMode([{status:"TERMINATED"}])).toBe("PARTNER_INACTIVE");
    expect(invitationRenewalMode([])).toBe("TEMPORARY_PASSWORD");
  });
});
