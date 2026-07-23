export function canActivateAgreement(signatures:readonly {versionId:string;signerRole:string}[],versionId:string){
  const roles=new Set(signatures.filter(item=>item.versionId===versionId).map(item=>item.signerRole));
  return roles.has("PARTNER")&&roles.has("INNOZANZI");
}

export function canChangeAgreement(status:string){
  return status==="ACTIVE";
}

