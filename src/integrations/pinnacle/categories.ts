const title = (value: string) => value.split("-").filter(Boolean).map(word => word === "pc" ? "PC" : word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

/** Converts Pinnacle's web taxonomy into the public taxonomy already used by Syntech. */
export function pinnacleCategory(categoryTree: string, fallback: string) {
  const parts = categoryTree.toLowerCase().split("/").filter(Boolean);
  const path = parts.join("/");
  let category = "Technology";
  let mapped: string[] = [];

  if (path.startsWith("computing/client-devices/notebooks")) { category = "Computers"; mapped = ["Notebooks", ...parts.slice(3)]; }
  else if (path.startsWith("computing/client-devices/desktops")) { category = "Computers"; mapped = ["Desktop computers", ...parts.slice(3)]; }
  else if (path.startsWith("computing/client-devices")) { category = "Computers"; mapped = parts.slice(2); }
  else if (path.startsWith("computing/bags-sleeves")) { category = "Bags & luggage"; mapped = parts.slice(2); }
  else if (path.startsWith("computing/components")) { category = "Components"; mapped = parts.slice(2); }
  else if (path.startsWith("computing")) { category = "Computer peripherals"; mapped = parts.slice(1); }
  else if (path.startsWith("networking") || path.startsWith("security")) { category = "Networking & security"; mapped = parts.slice(1); }
  else if (path.startsWith("power")) { category = "Power"; mapped = parts.slice(1); }
  else if (path.startsWith("printing")) { category = "Printing"; mapped = parts.slice(1); }
  else if (path.startsWith("enterprise")) { category = "Enterprise"; mapped = parts.slice(1); }
  else if (parts.length) { category = title(parts[0]); mapped = parts.slice(1); }
  else if (fallback) { category = title(fallback); }

  const categoryPath = [category, ...mapped.map(title)].filter(Boolean).join("/");
  return { category, categoryPath };
}
