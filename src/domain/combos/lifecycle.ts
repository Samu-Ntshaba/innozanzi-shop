export type ComboState = "DRAFT"|"SCHEDULED"|"ACTIVE"|"PAUSED"|"EXPIRED"|"CANCELLED"|"SOLD_OUT";

const transitions: Record<ComboState, ComboState[]> = {
  DRAFT:["SCHEDULED","ACTIVE","CANCELLED"],
  SCHEDULED:["ACTIVE","PAUSED","CANCELLED","EXPIRED","SOLD_OUT"],
  ACTIVE:["PAUSED","EXPIRED","CANCELLED","SOLD_OUT"],
  PAUSED:["SCHEDULED","ACTIVE","CANCELLED","EXPIRED","SOLD_OUT"],
  EXPIRED:[],
  CANCELLED:[],
  SOLD_OUT:["PAUSED","SCHEDULED"],
};

export function assertComboTransition(from:ComboState,to:ComboState){
  if(from===to)return;
  if(!transitions[from].includes(to))throw new Error(`Combo campaign cannot move from ${from} to ${to}.`);
}

export function scheduledComboState(current:ComboState,startsAt:Date,endsAt:Date,stockAvailable:boolean,now=new Date()):ComboState{
  if(["CANCELLED","EXPIRED"].includes(current))return current;
  if(!stockAvailable)return "SOLD_OUT";
  if(now>=endsAt)return "EXPIRED";
  if(current==="PAUSED")return current;
  if(now>=startsAt&&now<endsAt)return "ACTIVE";
  return "SCHEDULED";
}
