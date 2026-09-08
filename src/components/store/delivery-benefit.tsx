import { getCommerceSettings } from "@/domain/commerce/settings";
import { formatZar } from "@/lib/money";
export async function DeliveryBenefit(){const settings=await getCommerceSettings();return <>Free from {formatZar(settings.freeDeliveryThreshold)} · {formatZar(settings.customerDelivery)} below</>;}
