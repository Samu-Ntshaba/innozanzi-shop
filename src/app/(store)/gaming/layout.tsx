import { BehaviourSignal } from "@/components/store/behaviour-signal";

export default function GamingLayout({children}:{children:React.ReactNode}){
  return <><BehaviourSignal signal={{eventType:"GAMING_VISIT",entityType:"EXPERIENCE",entityId:"gaming",category:"Gaming",context:"gaming"}}/>{children}</>;
}
