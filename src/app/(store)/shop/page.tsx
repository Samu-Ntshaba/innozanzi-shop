import { CataloguePage } from "@/components/store/catalogue-page";

export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ search?: string; category?: string; brand?: string; sort?: string; page?: string }> }) {
  return <CataloguePage params={await searchParams} />;
}
