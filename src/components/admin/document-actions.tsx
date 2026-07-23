import Link from "next/link";
import { buttonClass,secondaryButtonClass } from "@/components/admin/admin-ui";
import type { BusinessDocumentType } from "@/domain/documents/business-documents";

export function DocumentActions({type,id,label="document"}:{type:BusinessDocumentType;id:string;label?:string}){
  return <div className="flex flex-wrap gap-2"><a className={secondaryButtonClass} href={`/api/business-documents/${type.toLowerCase().replaceAll("_","-")}/${id}/download`}>Download PDF</a><Link className={buttonClass} href={`/admin/documents/send?type=${type}&id=${id}`}>Send {label}</Link></div>;
}
