"use client";

export function ConfirmActionButton({message,label,className}:{message:string;label:string;className?:string}){
  return <button className={className} onClick={event=>{if(!window.confirm(message))event.preventDefault()}} type="submit">{label}</button>;
}
