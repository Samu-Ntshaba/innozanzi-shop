const CANONICAL_SITE_URL="https://shop.innozanzi.co.za";

export function publicSiteUrl(){
  const configured=process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if(!configured)return CANONICAL_SITE_URL;
  try{
    const url=new URL(configured);
    // Guard the known truncated production hostname and any unsafe production
    // callback configuration. Payment returns must always use our canonical shop.
    if(url.hostname==="shop.innozanzi.co")return CANONICAL_SITE_URL;
    if(process.env.NODE_ENV==="production"&&url.hostname!=="shop.innozanzi.co.za")return CANONICAL_SITE_URL;
    return url.origin;
  }catch{return CANONICAL_SITE_URL}
}
