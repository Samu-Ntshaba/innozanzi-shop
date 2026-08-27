import type { Metadata } from "next";
import { PcBuilderWorkspace } from "@/components/store/pc-builder-workspace";
import { getPcBuilderSteps } from "@/domain/catalogue/pc-builder";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Build Your Own PC Online",description:"Build a compatible custom PC step by step using live components, stock and customer pricing from Innozanzi distributors.",alternates:{canonical:"/build-a-pc"}};

export default async function BuildPcPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const[steps,query]=await Promise.all([getPcBuilderSteps(),searchParams]);
  return <PcBuilderWorkspace steps={steps} error={query.error}/>;
}
