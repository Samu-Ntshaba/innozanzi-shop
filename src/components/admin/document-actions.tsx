import Link from "next/link";
import { Download, Send } from "lucide-react";
import { buttonClass,secondaryButtonClass } from "@/components/admin/admin-ui";
import type { BusinessDocumentType } from "@/domain/documents/business-documents";

export function DocumentActions({type,id,label="document"}:{type:BusinessDocumentType;id:string;label?:string}){
  return <div className="flex flex-wrap gap-2"><a className={`${secondaryButtonClass} inline-flex items-center gap-2`} href={`/api/business-documents/${type.toLowerCase().replaceAll("_","-")}/${id}/download`}><Download aria-hidden="true" size={16}/>Download PDF</a><Link className={`${buttonClass} inline-flex items-center gap-2`} href={`/admin/documents/send?type=${type}&id=${id}`}><Send aria-hidden="true" size={16}/>Send {label}</Link></div>;
}
