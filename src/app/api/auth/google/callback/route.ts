import {cookies} from "next/headers";
import {NextRequest,NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {createSession} from "@/domain/auth/session";
import {GOOGLE_AUTH_NONCE_COOKIE,GOOGLE_AUTH_STATE_COOKIE,GOOGLE_AUTH_VERIFIER_COOKIE,googleAuthConfigured,googleRedirectUri,verifyGoogleIdToken} from "@/domain/auth/google";
import {enqueueEmail} from "@/integrations/email/outbox";
import {emailTemplates} from "@/integrations/email/templates";
import {notifySupportOfNewUser} from "@/domain/auth/user-notifications";

const fail=(code:string)=>NextResponse.redirect(new URL(`/sign-in?error=${code}`,googleRedirectUri()));

export async function GET(request:NextRequest){
  if(!googleAuthConfigured())return fail("google-unavailable");
  const store=await cookies(),state=store.get(GOOGLE_AUTH_STATE_COOKIE)?.value,verifier=store.get(GOOGLE_AUTH_VERIFIER_COOKIE)?.value,nonce=store.get(GOOGLE_AUTH_NONCE_COOKIE)?.value;
  store.delete(GOOGLE_AUTH_STATE_COOKIE);store.delete(GOOGLE_AUTH_VERIFIER_COOKIE);store.delete(GOOGLE_AUTH_NONCE_COOKIE);
  const code=request.nextUrl.searchParams.get("code"),returnedState=request.nextUrl.searchParams.get("state");
  if(!code||!state||!verifier||!nonce||returnedState!==state)return fail("google-state");
  try{
    const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID!,client_secret:process.env.GOOGLE_CLIENT_SECRET!,redirect_uri:googleRedirectUri(),grant_type:"authorization_code",code_verifier:verifier}),cache:"no-store"});
    if(!response.ok)throw new Error("Google token exchange failed");
    const tokens=await response.json() as{id_token?:string};if(!tokens.id_token)throw new Error("Google ID token missing");
    const profile=await verifyGoogleIdToken(tokens.id_token,nonce);let created=false;
    const user=await prisma.$transaction(async tx=>{
      const linked=await tx.account.findUnique({where:{provider_providerAccountId:{provider:"google",providerAccountId:profile.sub}},include:{user:{include:{customerProfile:true}}}});
      if(linked){if(linked.user.deletedAt||linked.user.status!=="ACTIVE")throw new Error("ACCOUNT_UNAVAILABLE");return linked.user}
      const existing=await tx.user.findUnique({where:{email:profile.email},include:{customerProfile:true}});
      if(existing&&!existing.customerProfile)throw new Error("STAFF_LINK_BLOCKED");
      if(existing?.deletedAt)throw new Error("ACCOUNT_UNAVAILABLE");
      if(existing?.status==="DISABLED"&&!existing.customerProfile?.source.match(/^(MANUAL|IMPORT)/))throw new Error("ACCOUNT_UNAVAILABLE");
      const customerRole=await tx.role.findUnique({where:{slug:"customer"}}),verifiedAt=new Date();
      const customer=existing?await tx.user.update({where:{id:existing.id},data:{name:existing.name??profile.name,image:existing.image??profile.picture,emailVerified:existing.emailVerified??verifiedAt,status:"ACTIVE",lastLoginAt:verifiedAt}}):await tx.user.create({data:{email:profile.email,name:profile.name,image:profile.picture,status:"ACTIVE",emailVerified:verifiedAt,lastLoginAt:verifiedAt,customerProfile:{create:{source:"GOOGLE"}}}});
      if(existing&&!existing.customerProfile)throw new Error("STAFF_LINK_BLOCKED");
      if(customerRole)await tx.userRole.upsert({where:{userId_roleId:{userId:customer.id,roleId:customerRole.id}},update:{},create:{userId:customer.id,roleId:customerRole.id}});
      await tx.account.create({data:{userId:customer.id,type:"oauth",provider:"google",providerAccountId:profile.sub}});
      created=!existing;return customer;
    });
    if(created){await enqueueEmail(emailTemplates.welcome(user.email,user.name??"there"),user.id);await notifySupportOfNewUser({userId:user.id,name:user.name,email:user.email,accountType:user.accountType,source:"GOOGLE_REGISTRATION"})}
    await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});await createSession(user.id);
    const returnTo=store.get("innozanzi-return-to")?.value;store.delete("innozanzi-return-to");return NextResponse.redirect(new URL(returnTo?.startsWith("/")&&!returnTo.startsWith("//")?returnTo:"/account",googleRedirectUri()));
  }catch(error){console.error("Google authentication failed",error);return fail(error instanceof Error&&error.message==="STAFF_LINK_BLOCKED"?"google-existing-account":"google-failed")}
}
