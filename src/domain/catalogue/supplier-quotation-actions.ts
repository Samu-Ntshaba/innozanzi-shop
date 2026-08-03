"use server";
import{addSupplierCartItemAction}from"@/domain/cart/actions";
export async function requestSupplierProductQuotation(formData:FormData){return addSupplierCartItemAction(formData)}
