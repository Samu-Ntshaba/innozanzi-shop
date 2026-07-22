import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white"><StoreHeader />{children}<StoreFooter /></div>;
}
