import { redirect } from "next/navigation";

export default async function LegacyOrderDelivery({params}:{params:Promise<{id:string}>}){
  redirect(`/admin/orders/${(await params).id}`);
}
