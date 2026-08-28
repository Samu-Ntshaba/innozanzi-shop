import {createHash,randomBytes} from "node:crypto";
import {createRemoteJWKSet,jwtVerify} from "jose";
import {publicSiteUrl} from "@/lib/public-site-url";

export const GOOGLE_AUTH_STATE_COOKIE="innozanzi-google-state";
export const GOOGLE_AUTH_VERIFIER_COOKIE="innozanzi-google-verifier";
export const GOOGLE_AUTH_NONCE_COOKIE="innozanzi-google-nonce";
export const googleAuthConfigured=()=>Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET);
export const googleRedirectUri=()=>`${publicSiteUrl()}/api/auth/google/callback`;
export const randomOauthValue=()=>randomBytes(32).toString("base64url");
export const pkceChallenge=(verifier:string)=>createHash("sha256").update(verifier).digest("base64url");
export const googleCookieOptions={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:10*60};

const googleKeys=createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export async function verifyGoogleIdToken(token:string,nonce:string){
  const clientId=process.env.GOOGLE_CLIENT_ID;
  if(!clientId)throw new Error("Google authentication is not configured");
  const{payload}=await jwtVerify(token,googleKeys,{audience:clientId,issuer:["https://accounts.google.com","accounts.google.com"]});
  if(payload.nonce!==nonce||typeof payload.sub!=="string"||typeof payload.email!=="string"||payload.email_verified!==true)throw new Error("Google identity could not be verified");
  return{sub:payload.sub,email:payload.email.trim().toLowerCase(),name:typeof payload.name==="string"?payload.name:null,picture:typeof payload.picture==="string"?payload.picture:null};
}
