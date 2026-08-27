import { GamingHeader } from "@/components/store/gaming-header";

export default function GamingLayout({children}:{children:React.ReactNode}){
  return <div className="min-h-dvh bg-[#050713]"><GamingHeader/>{children}</div>;
}
