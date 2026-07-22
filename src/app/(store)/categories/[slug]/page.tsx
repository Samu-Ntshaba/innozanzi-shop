import { CataloguePage } from "@/components/store/catalogue-page";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ search?: string; brand?: string; sort?: string; page?: string }> }) {
  const { slug } = await params;
  const heading = slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return <CataloguePage heading={heading} params={{ ...(await searchParams), category: slug }} />;
}
