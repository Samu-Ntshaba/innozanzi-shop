"use client";

export function ConfirmActionButton({message,label,className}:{message:string;label:string;className?:string}){
  return <button className={className} onClick={event=>{if(!window.confirm(message))event.preventDefault()}} type="submit">{label}</button>;
}

export function PermanentDeleteButton({email,className}:{email:string;className?:string}){
  return <button className={className} onClick={event=>{const first=window.confirm(`Permanently delete ${email}? This cannot be undone.`);if(!first){event.preventDefault();return}const typed=window.prompt(`Type DELETE to permanently remove ${email}.`);if(typed!=="DELETE")event.preventDefault()}} type="submit">Permanently delete</button>;
}
