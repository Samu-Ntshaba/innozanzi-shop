import { AdminPage, Panel, tableClass } from "@/components/admin/admin-ui";
import { moderateReview } from "@/domain/admin/actions";
import { getAdminReviews } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";

export default async function ReviewsPage() {
  await requirePermission("products.update");
  const rows = await getAdminReviews();
  return <AdminPage title="Reviews" description="Moderate customer product reviews and comments before publication."><Panel><table className={tableClass}><thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Review</th><th>Status</th><th>Moderate</th></tr></thead><tbody>{rows.map(review => <tr key={review.id}><td>{review.product?.name ?? review.supplierCatalogueProduct?.name ?? "Unknown product"}</td><td>{review.user.name ?? review.user.email}</td><td>{review.rating}/5</td><td className="max-w-xs truncate">{review.title ?? review.body ?? "—"}</td><td>{review.status}</td><td><form action={moderateReview} className="flex gap-2"><input type="hidden" name="id" value={review.id}/><button name="status" value="APPROVED" className="text-emerald-700 underline">Approve</button><button name="status" value="REJECTED" className="text-red-700 underline">Reject</button><button name="status" value="HIDDEN" className="text-slate-600 underline">Hide</button></form></td></tr>)}</tbody></table></Panel></AdminPage>;
}
