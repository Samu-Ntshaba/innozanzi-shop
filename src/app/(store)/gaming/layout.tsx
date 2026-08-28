import { GamingHeader } from "@/components/store/gaming-header";
import { BehaviourSignal } from "@/components/store/behaviour-signal";

export default function GamingLayout({children}:{children:React.ReactNode}){
  return <div className="min-h-dvh bg-[#0b111b]"><BehaviourSignal signal={{eventType:"GAMING_VISIT",entityType:"EXPERIENCE",entityId:"gaming",category:"Gaming",context:"gaming"}}/><GamingHeader/>{children}</div>;
}
