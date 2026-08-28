import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {GOOGLE_AUTH_NONCE_COOKIE,GOOGLE_AUTH_STATE_COOKIE,GOOGLE_AUTH_VERIFIER_COOKIE,googleAuthConfigured,googleCookieOptions,googleRedirectUri,pkceChallenge,randomOauthValue} from "@/domain/auth/google";

export async function GET(){
  if(!googleAuthConfigured())return NextResponse.redirect(new URL("/sign-in?error=google-unavailable",googleRedirectUri()));
  const state=randomOauthValue(),verifier=randomOauthValue(),nonce=randomOauthValue(),store=await cookies();
  store.set(GOOGLE_AUTH_STATE_COOKIE,state,googleCookieOptions);store.set(GOOGLE_AUTH_VERIFIER_COOKIE,verifier,googleCookieOptions);store.set(GOOGLE_AUTH_NONCE_COOKIE,nonce,googleCookieOptions);
  const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID!,redirect_uri:googleRedirectUri(),response_type:"code",scope:"openid email profile",state,nonce,code_challenge:pkceChallenge(verifier),code_challenge_method:"S256",prompt:"select_account"}).toString();
  return NextResponse.redirect(url);
}
