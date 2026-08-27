"use client";
import { useEffect } from "react";

type Signal={eventType:"VIEW"|"SEARCH"|"GAMING_VISIT"|"BUILD_VISIT"|"RECOMMENDATION_IMPRESSION"|"RECOMMENDATION_CLICK";entityType:string;entityId?:string;category?:string;brand?:string;searchTerm?:string;price?:number;recommendationId?:string;context?:string};
export function BehaviourSignal({signal}:{signal:Signal}){
  useEffect(()=>{const key=`rec:${signal.eventType}:${signal.entityType}:${signal.entityId??signal.searchTerm??"page"}`;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");void fetch("/api/recommendations/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(signal),keepalive:true})},[signal]);return null;
}
