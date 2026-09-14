import Decimal from "decimal.js";
import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({transaction:vi.fn(),find:vi.fn(),create:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:mocks.transaction}}));
import { ensurePaidOrderInvoice } from "@/domain/orders/paid-invoice";
const d=(value:number)=>new Decimal(value);
beforeEach(()=>{
 vi.clearAllMocks();
 mocks.transaction.mockImplementation(async fn=>fn({$queryRaw:vi.fn(),order:{findUniqueOrThrow:mocks.find},invoice:{create:mocks.create}}));
 mocks.find.mockResolvedValue({id:"order",orderNumber:"ORD-1",email:"customer@example.com",currency:"ZAR",paymentStatus:"PAID",items:[{productName:"Product",quantity:1,unitPrice:d(115),vatRate:d(.15),vatTotal:d(15),lineTotal:d(115)}],addresses:[],payments:[{amount:d(230),paidAt:new Date(),provider:"OZOW",externalReference:"payment"}],invoices:[],subtotal:d(100),discountTotal:d(0),deliveryTotal:d(100),vatTotal:d(30),grandTotal:d(230),isTestData:false});
});
it("creates one paid invoice including delivery and its VAT from immutable order totals",async()=>{
 await ensurePaidOrderInvoice("order");
 const data=mocks.create.mock.calls[0][0].data;
 expect(data.invoiceNumber).toBe("INV-ORD-1");expect(data.status).toBe("PAID");expect(data.balanceDue).toBe(0);
 expect(data.subtotal.toString()).toBe("200");expect(data.grandTotal.toString()).toBe("230");
 expect(data.items.create[0].unitPrice.toString()).toBe("100");expect(data.items.create[1].lineTotal.toString()).toBe("115");
});
it("reuses an existing invoice and never invoices an unpaid order",async()=>{
 mocks.find.mockResolvedValueOnce({paymentStatus:"PAID",invoices:[{id:"existing"}]});
 expect(await ensurePaidOrderInvoice("order")).toEqual({id:"existing"});
 mocks.find.mockResolvedValueOnce({paymentStatus:"PENDING"});expect(await ensurePaidOrderInvoice("order")).toBeNull();
 expect(mocks.create).not.toHaveBeenCalled();
});
