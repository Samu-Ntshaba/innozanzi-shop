# SEO and marketing management

## Audit findings addressed

- Replaced hard-coded global metadata with database-backed fallbacks.
- Added canonical, Open Graph, X, robots and sitemap controls per public entity.
- Excluded test products from public catalogue queries, product pages and sitemaps.
- Marked quotation-list, quotation submission and filtered catalogue URLs as no-index.
- Added organisation and South African local-business JSON-LD.
- Replaced product purchase-style structured data with truthful quotation-request `AskAction` data.
- Added product and breadcrumb structured data, visible category links and social sharing controls.
- Added public media management with required alternative text.
- Added safe permanent/temporary redirects with loop checks and fallback-route execution.
- Added a database-backed SEO audit without invented analytics.

## Administration

The Marketing role is permission-based and has no financial, procurement, user-administration or security access. The Marketing navigation contains:

- Dashboard
- Homepage
- Global SEO
- Page SEO
- SEO audit
- Redirects
- Media library
- Email marketing

Global settings are fallbacks. Page-level records override only the supplied values, avoiding repeated data entry. All settings, SEO records, redirects and homepage changes create audit records.

Homepage blocks are server-rendered and support draft, review, approval, scheduled, published, expired and archived states. Only published blocks inside their start/end window appear publicly. Version snapshots are retained.

## Indexing rules

Production permits useful public routes. Administration, account, API, authentication, quotation workflow and query-generated filter URLs are blocked or marked no-index. Development and Test Mode return a site-wide robots disallow rule.

Sitemaps contain only published, active, non-test content whose SEO record permits indexing and sitemap inclusion.

## Remaining external integrations

Search Console, Bing and analytics fields are prepared without arbitrary script injection. Actual impressions, clicks, rankings, Core Web Vitals and Merchant Center reporting require verified external integrations; the administration dashboard intentionally does not invent these values.
