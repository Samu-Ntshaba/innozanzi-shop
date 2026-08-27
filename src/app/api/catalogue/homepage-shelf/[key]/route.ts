import { NextResponse } from "next/server";
import { getHomepageShelfProducts } from "@/domain/catalogue/queries";
import { homepageShelf } from "@/domain/catalogue/homepage-shelves";

export async function GET(_:Request,{params}:{params:Promise<{key:string}>}) {
  const {key}=await params;
  if(!homepageShelf(key)) return NextResponse.json({error:"Unknown shelf"},{status:404});
  return NextResponse.json({products:await getHomepageShelfProducts(key)});
}
