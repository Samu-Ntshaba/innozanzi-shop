import { OfferBanner } from "@/components/store/offer-banner";
import { StoreFrame } from "@/components/store/store-frame";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { MarketingPopupLayer } from "@/components/store/marketing-popup-layer";
import { AIShoppingAssistant } from "@/components/store/ai-shopping-assistant";

export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreFrame header={<StoreHeader />} footer={<StoreFooter />} marketing={<><MarketingPopupLayer /><AIShoppingAssistant /></>}><OfferBanner/>{children}</StoreFrame>;
}
