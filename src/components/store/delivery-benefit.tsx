import { getCommerceSettings } from "@/domain/commerce/settings";
import { getDeliveryProvinces } from "@/domain/addresses/delivery-areas";
import { formatZar } from "@/lib/money";
export async function DeliveryBenefit(){const[settings,deliveryProvinces]=await Promise.all([getCommerceSettings(),getDeliveryProvinces()]);return <>{deliveryProvinces.join(", ")} · Free from {formatZar(settings.freeDeliveryThreshold)}</>;}
