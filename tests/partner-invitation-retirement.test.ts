import{describe,expect,it,vi}from"vitest";
import{retireStalePartnerInvitationEmails}from"@/domain/auth/invitation-utils";

describe("partner invitation resend recovery",()=>{
  it("retires pending and failed earlier partner invitation emails",async()=>{
    const updateMany=vi.fn().mockResolvedValue({count:2});
    await retireStalePartnerInvitationEmails({notification:{updateMany}},"33333333-3333-4333-8333-333333333333");
    expect(updateMany).toHaveBeenCalledWith({
      where:{userId:"33333333-3333-4333-8333-333333333333",type:"EMAIL_OUTBOX",subject:"Your Innozanzi sales partner account is ready",status:{in:["PENDING","FAILED"]}},
      data:{status:"READ",error:"Superseded by a newer partner invitation."},
    });
  });
});
