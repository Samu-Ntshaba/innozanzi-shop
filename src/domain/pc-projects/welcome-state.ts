export const PC_BUILDER_RETURN_AFTER_MS=30*24*60*60*1000;
export type PcBuilderWelcomeKind="first"|"return"|null;

export function pcBuilderWelcomeKind(lastVisit:number|null,now:number):PcBuilderWelcomeKind {
  if(!lastVisit)return "first";
  return now-lastVisit>=PC_BUILDER_RETURN_AFTER_MS?"return":null;
}
