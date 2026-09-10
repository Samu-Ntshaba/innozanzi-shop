import { OfferBanner } from "@/components/store/offer-banner";
import { StoreFrame } from "@/components/store/store-frame";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { MarketingPopupLayer } from "@/components/store/marketing-popup-layer";
import { AIShoppingAssistant } from "@/components/store/ai-shopping-assistant";
import { getAuthContext } from "@/domain/auth/session";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const authenticated = Boolean(await getAuthContext());
  return <StoreFrame header={<StoreHeader />} footer={<StoreFooter />} marketing={<><MarketingPopupLayer /><AIShoppingAssistant authenticated={authenticated} /></>}><OfferBanner/>{children}</StoreFrame>;
}
