const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.innozanzi.co.za").replace(/\/$/, "");

const absoluteImage = (path?: string | null) => {
  if (!path) return `${siteUrl()}/social/innozanzi-share.png`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
};

export type CampaignProduct = {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  brand: string | null;
  category: string;
  imagePath: string | null;
};

export type CampaignCopy = {
  subject: string;
  preview: string;
  headline: string;
  introduction: string;
  ctaLabel: string;
  productBlurbs: string[];
};

const productCard = (product: CampaignProduct, blurb: string, accent: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #dbe3ea;border-radius:12px;overflow:hidden;background:#ffffff">
    <tr>
      <td width="150" valign="top" style="padding:0;background:#f4f7f9">
        <img src="${escapeHtml(absoluteImage(product.imagePath))}" width="150" alt="${escapeHtml(product.name)}" style="display:block;width:150px;height:150px;object-fit:contain;background:#f4f7f9">
      </td>
      <td valign="middle" style="padding:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${accent}">${escapeHtml(product.brand ?? product.category)}</div>
        <h2 style="margin:6px 0 8px;font-size:18px;line-height:1.3;color:#071b33">${escapeHtml(product.name)}</h2>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#516273">${escapeHtml(blurb)}</p>
        <a href="${siteUrl()}/products/${encodeURIComponent(product.slug)}" style="font-size:13px;font-weight:700;color:${accent};text-decoration:none">View product&nbsp; →</a>
      </td>
    </tr>
  </table>`;

const spotlightCard = (product: CampaignProduct, blurb: string, accent: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #dbe3ea;border-radius:12px;overflow:hidden;background:#ffffff">
    <tr><td align="center" style="padding:24px;background:#f4f7f9"><img src="${escapeHtml(absoluteImage(product.imagePath))}" width="300" alt="${escapeHtml(product.name)}" style="display:block;width:100%;max-width:300px;height:220px;object-fit:contain"></td></tr>
    <tr><td style="padding:22px 24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${accent}">${escapeHtml(product.brand ?? product.category)}</div>
      <h2 style="margin:7px 0 9px;font-size:22px;line-height:1.3;color:#071b33">${escapeHtml(product.name)}</h2>
      <p style="margin:0 0 15px;font-size:14px;line-height:1.7;color:#516273">${escapeHtml(blurb)}</p>
      <a href="${siteUrl()}/products/${encodeURIComponent(product.slug)}" style="display:inline-block;border-radius:7px;background:#071b33;color:#ffffff;text-decoration:none;padding:11px 16px;font-size:13px;font-weight:700">View product</a>
    </td></tr>
  </table>`;

export function renderProductCampaign(input: {
  template: "SPOTLIGHT" | "ESSENTIALS" | "NEW_ARRIVALS";
  copy: CampaignCopy;
  products: CampaignProduct[];
}) {
  const accent = input.template === "NEW_ARRIVALS" ? "#087ea4" : "#009fe3";
  const label = input.template === "SPOTLIGHT" ? "Product spotlight" : input.template === "ESSENTIALS" ? "Everyday tech essentials" : "New arrivals";
  const cards = input.products.map((product, index) => {
    const blurb = input.copy.productBlurbs[index] ?? product.shortDescription ?? "Useful technology selected for everyday work, study, home and play.";
    return input.template === "SPOTLIGHT" && index === 0 ? spotlightCard(product, blurb, accent) : productCard(product, blurb, accent);
  }).join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:26px 24px 28px;border-radius:14px;background:#071b33">
        <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#74d4ff">${label}</div>
        <h1 style="margin:10px 0 12px;font-size:30px;line-height:1.15;color:#ffffff">${escapeHtml(input.copy.headline)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#d5e3ef">${escapeHtml(input.copy.introduction)}</p>
      </td></tr>
      <tr><td style="padding:24px 0 4px">${cards}</td></tr>
      <tr><td align="center" style="padding:16px 0 8px">
        <a href="${siteUrl()}/shop" style="display:inline-block;border-radius:8px;background:${accent};color:#ffffff;text-decoration:none;padding:14px 24px;font-size:14px;font-weight:700">${escapeHtml(input.copy.ctaLabel)}</a>
      </td></tr>
      <tr><td style="padding:18px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:#667085">Prices include VAT where shown. Stock and pricing are checked again when you place your order.</td></tr>
    </table>`;
}

export function fallbackCampaignCopy(products: CampaignProduct[]): CampaignCopy {
  const lead = products[0];
  return {
    subject: `${lead?.category ?? "Technology"} worth discovering at Innozanzi Shop`,
    preview: "Shop useful technology for work, study, home and play.",
    headline: "Technology picked for real life",
    introduction: "Explore a focused selection of useful products, with secure checkout, delivery updates and help when you need it.",
    ctaLabel: "Shop the collection",
    productBlurbs: products.map(product => product.shortDescription ?? `Discover ${product.name} and check current availability online.`),
  };
}
