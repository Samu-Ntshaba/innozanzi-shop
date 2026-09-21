import { beforeEach,expect,it,vi } from "vitest";

const mocks=vi.hoisted(()=>({update:vi.fn(),confirmation:vi.fn(),invoice:vi.fn(),staff:vi.fn()}));
const job={id:"order",type:"PAID_ORDER_COMMUNICATION",status:"PENDING"};
const tx={$queryRaw:vi.fn().mockResolvedValue([{locked:true}]),notification:{findUnique:vi.fn().mockResolvedValue(job),update:mocks.update}};
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:vi.fn(async fn=>fn(tx)),notification:{update:mocks.update,findMany:vi.fn().mockResolvedValue([])},order:{findUnique:vi.fn().mockResolvedValue({id:"order",orderNumber:"ORD-1",email:"buyer@example.com",phone:null,grandTotal:"5",paymentMethod:"OZOW",placedAt:new Date(),createdAt:new Date(),companyName:null,items:[],addresses:[]})},supplier:{findMany:vi.fn().mockResolvedValue([])}}}));
vi.mock("@/domain/notifications/customer-order",()=>({sendPaidOrderConfirmation:mocks.confirmation}));
vi.mock("@/domain/orders/paid-invoice",()=>({ensurePaidOrderInvoice:mocks.invoice}));
vi.mock("@/domain/notifications/role-email",()=>({sendStaffEmail:mocks.staff}));
import { notifyStaffOfPaidOrder } from "@/domain/notifications/order-alerts";

beforeEach(()=>{vi.clearAllMocks();tx.$queryRaw.mockResolvedValue([{locked:true}]);tx.notification.findUnique.mockResolvedValue(job);mocks.confirmation.mockResolvedValue(undefined);mocks.invoice.mockResolvedValue(undefined);mocks.staff.mockResolvedValue(undefined);});

it("persists a retryable failure without falsely marking communication sent",async()=>{
  mocks.confirmation.mockRejectedValueOnce(new Error("provider secret detail"));
  await expect(notifyStaffOfPaidOrder("order")).rejects.toThrow("provider secret detail");
  expect(mocks.update).toHaveBeenCalledWith({where:{id:"order"},data:{status:"FAILED",sentAt:null,error:"Paid order communication failed; the scheduled worker will retry."}});
  expect(mocks.update).not.toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:"SENT"})}));
});

it("marks the durable job sent only after customer, staff and invoice work succeeds",async()=>{
  await notifyStaffOfPaidOrder("order");
  expect(mocks.confirmation).toHaveBeenCalledWith("order");
  expect(mocks.staff).toHaveBeenCalled();
  expect(mocks.invoice).toHaveBeenCalledWith("order");
  expect(mocks.update).toHaveBeenLastCalledWith({where:{id:"order"},data:{status:"SENT",sentAt:expect.any(Date),error:null}});
});
