import { AdminPage, Panel, inputClass, buttonClass } from "@/components/admin/admin-ui";
import { CategoryIcon, categoryIconKey, categoryIconOptions } from "@/components/store/category-icon";
import { createCategory, deleteCategory, updateCategory } from "@/domain/admin/actions";
import { getAdminCategories } from "@/domain/admin/queries";
import { requirePermission } from "@/domain/auth/session";

const IconSelect = ({ value }: { value?: string | null }) => (
  <select className={inputClass} defaultValue={categoryIconKey(value)} name="iconKey">
    {categoryIconOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
  </select>
);

export default async function Page() {
  await requirePermission("products.update");
  const rows = await getAdminCategories();
  return <AdminPage title="Categories" description="Control customer-facing category names, order, visibility and icons.">
    <Panel title="Add category">
      <form action={createCategory} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-semibold">Name<input className={`${inputClass} mt-1 w-full`} name="name" required/></label>
        <label className="text-sm font-semibold">Slug<input className={`${inputClass} mt-1 w-full`} name="slug" placeholder="Generated from name"/></label>
        <label className="text-sm font-semibold">Icon<span className="mt-1 block"><IconSelect/></span></label>
        <label className="text-sm font-semibold">Display order<input className={`${inputClass} mt-1 w-full`} min="0" name="displayOrder" type="number" defaultValue="0"/></label>
        <button className={`${buttonClass} self-end`}>Add category</button>
        <label className="text-sm font-semibold md:col-span-2 xl:col-span-5">Description<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="description"/></label>
      </form>
    </Panel>

    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map(category => {
        const removalLabel = category._count.products || category._count.children || category._count.couponCategories ? "Deactivate" : "Delete";
        return <Panel key={category.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-800"><CategoryIcon value={category.imagePath} slug={category.slug} className="size-5"/></span><div className="min-w-0"><h2 className="truncate font-bold">{category.name}</h2><p className="text-xs text-slate-500">{category._count.products} product{category._count.products === 1 ? "" : "s"} · {category.isActive ? "Visible" : "Hidden"}</p></div></div>
            <form action={deleteCategory}><input name="id" type="hidden" value={category.id}/><button className="text-sm font-bold text-red-700">{removalLabel}</button></form>
          </div>
          <form action={updateCategory} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input name="id" type="hidden" value={category.id}/>
            <label className="text-sm font-semibold">Name<input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={category.name} required/></label>
            <label className="text-sm font-semibold">Slug<input className={`${inputClass} mt-1 w-full`} name="slug" defaultValue={category.slug} required/></label>
            <label className="text-sm font-semibold">Icon<span className="mt-1 block"><IconSelect value={category.imagePath}/></span></label>
            <label className="text-sm font-semibold">Display order<input className={`${inputClass} mt-1 w-full`} min="0" name="displayOrder" type="number" defaultValue={category.displayOrder}/></label>
            <label className="text-sm font-semibold sm:col-span-2">Description<textarea className={`${inputClass} mt-1 min-h-20 w-full`} name="description" defaultValue={category.description ?? ""}/></label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input defaultChecked={category.isActive} name="isActive" type="checkbox"/> Visible to customers</label>
            <button className={`${buttonClass} sm:justify-self-end`}>Save changes</button>
          </form>
        </Panel>;
      })}
    </div>
  </AdminPage>;
}
