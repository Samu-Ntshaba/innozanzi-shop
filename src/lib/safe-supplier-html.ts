const allowed = new Set(["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td"]);
export function safeSupplierHtml(value: string | null) {
  if (!value) return "";
  return value.split(/(<[^>]*>)/g).map(part => {
    const tag = part.match(/^<(\/?)\s*([a-z0-9]+)(?:\s[^>]*)?\/?>(?:$)/i);
    if (tag && allowed.has(tag[2].toLowerCase())) return `<${tag[1]}${tag[2].toLowerCase()}>`;
    return part.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }).join("");
}
