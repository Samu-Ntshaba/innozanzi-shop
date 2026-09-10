import { catalogueSuggestions } from "@/domain/catalogue/suggestions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ suggestions: [] }, { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" } });
  try {
    return Response.json(
      { suggestions: await catalogueSuggestions(query) },
      { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error("Catalogue suggestions unavailable", error);
    return Response.json({ suggestions: [] }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
