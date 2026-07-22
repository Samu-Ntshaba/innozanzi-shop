import { prisma } from "@/lib/prisma";

export async function getAdminDashboard() {
  const [products, orders, customers, pendingPayments, lowStock, revenue, openRequests, quotesToApprove, outstandingInvoices, pipeline] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count(),
    prisma.user.count({ where: { customerProfile: { isNot: null } } }),
    prisma.paymentProof.count({ where: { status: "PENDING" } }),
    prisma.inventory.count({ where: { onHand: { lte: prisma.inventory.fields.reorderLevel } } }),
    prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { grandTotal: true } }),
    prisma.quotationRequest.count({where:{status:{in:["OPEN","IN_REVIEW"]}}}),
    prisma.quotation.count({where:{status:"PENDING_APPROVAL"}}),
    prisma.invoice.count({where:{status:{in:["DRAFT","ISSUED","PARTIALLY_PAID","OVERDUE"]}}}),
    prisma.quotation.aggregate({where:{status:{in:["PENDING_APPROVAL","ISSUED","ACCEPTED"]}},_sum:{grandTotal:true}}),
  ]);
  return {products,orders,customers,pendingPayments,lowStock,openRequests,quotesToApprove,outstandingInvoices,pipeline:pipeline._sum.grandTotal?.toString()??"0",revenue:revenue._sum.grandTotal?.toString()??"0"};
}

export const getAdminProducts = () => prisma.product.findMany({ where: { deletedAt: null }, include: { category: true, brand: true, inventory: true }, orderBy: { updatedAt: "desc" }, take: 100 });
export const getAdminCategories = () => prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
export const getAdminBrands = () => prisma.brand.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } });
export const getAdminSuppliers = () => prisma.supplier.findMany({ where: { deletedAt: null }, include: { _count: { select: { products: true } } }, orderBy: { companyName: "asc" } });
export const getAdminInventory = () => prisma.inventory.findMany({ include: { product: { select: { name: true, sku: true } }, variant: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 150 });
export const getAdminOrders = () => prisma.order.findMany({ include: { _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
export const getAdminPayments = () => prisma.paymentProof.findMany({ include: { payment: { include: { order: { select: { orderNumber: true, email: true } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
export const getAdminCustomers = () => prisma.user.findMany({ where: { customerProfile: { isNot: null } }, include: { customerProfile: { include: { company: true } }, _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
export const getAdminReviews = () => prisma.review.findMany({ include: { product: { select: { name: true } }, user: { select: { email: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
