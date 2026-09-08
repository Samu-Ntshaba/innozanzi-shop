import { NextResponse } from "next/server";
import { publicSiteUrl } from "@/lib/public-site-url";
export async function GET(){return NextResponse.redirect(new URL("/account/orders",publicSiteUrl()),303);}
export async function POST(){return GET();}
