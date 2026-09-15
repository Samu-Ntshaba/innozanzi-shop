import { inputClass } from "@/components/admin/admin-ui";
import { updateOrderDeliveryAddress } from "@/domain/orders/procurement-actions";

type Address={id:string;recipient:string;phone:string|null;line1:string;line2:string|null;suburb:string|null;city:string;province:string;postalCode:string;countryCode:string};

export function OrderAddressChange({orderId,address,supplierPlaced}:{orderId:string;address:Address;supplierPlaced:boolean}){
  return <details className="mt-4 rounded border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-bold">Controlled address change</summary><form action={updateOrderDeliveryAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="orderId" value={orderId}/><input type="hidden" name="addressId" value={address.id}/>
    <label>Recipient<input className={`${inputClass} mt-1 w-full`} name="recipient" defaultValue={address.recipient} required/></label><label>Phone<input className={`${inputClass} mt-1 w-full`} name="phone" defaultValue={address.phone??""} required/></label>
    <label className="sm:col-span-2">Address line 1<input className={`${inputClass} mt-1 w-full`} name="line1" defaultValue={address.line1} required/></label><label className="sm:col-span-2">Address line 2<input className={`${inputClass} mt-1 w-full`} name="line2" defaultValue={address.line2??""}/></label>
    <label>Suburb<input className={`${inputClass} mt-1 w-full`} name="suburb" defaultValue={address.suburb??""}/></label><label>City<input className={`${inputClass} mt-1 w-full`} name="city" defaultValue={address.city} required/></label><label>Province<input className={`${inputClass} mt-1 w-full`} name="province" defaultValue={address.province} required/></label><label>Postal code<input className={`${inputClass} mt-1 w-full`} name="postalCode" defaultValue={address.postalCode} required/></label>
    <label className="sm:col-span-2">Reason for change<textarea className={`${inputClass} mt-1 min-h-16 w-full`} name="reason" required/></label>
    {supplierPlaced?<label className="rounded border border-amber-300 bg-amber-50 p-3 text-sm sm:col-span-2"><input className="mr-2" type="checkbox" name="supplierNotified" required/>I confirm every affected distributor was notified of this address change.</label>:null}
    <button className="min-h-11 border border-sky-700 bg-white px-4 font-bold text-sky-800 sm:col-span-2">Save audited address change</button>
  </form></details>;
}
