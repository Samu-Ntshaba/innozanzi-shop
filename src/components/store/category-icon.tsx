import {
  Boxes,
  Cable,
  Camera,
  Cpu,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  Network,
  Package,
  PlugZap,
  Printer,
  Server,
  Smartphone,
  Speaker,
  Tablet,
} from "lucide-react";

export const categoryIconOptions = [
  ["package", "General"],
  ["laptop", "Laptop"],
  ["monitor", "Monitor"],
  ["printer", "Printer"],
  ["keyboard", "Keyboard & mouse"],
  ["headphones", "Headsets & audio"],
  ["storage", "Storage"],
  ["components", "PC components"],
  ["network", "Networking"],
  ["power", "Power & UPS"],
  ["server", "Servers"],
  ["mobile", "Mobile phones"],
  ["tablet", "Tablets"],
  ["camera", "Cameras"],
  ["cable", "Cables & adapters"],
  ["speaker", "Speakers"],
] as const;

const icons = {
  package: Package,
  laptop: Laptop,
  monitor: Monitor,
  printer: Printer,
  keyboard: Keyboard,
  headphones: Headphones,
  storage: Boxes,
  components: Cpu,
  network: Network,
  power: PlugZap,
  server: Server,
  mobile: Smartphone,
  tablet: Tablet,
  camera: Camera,
  cable: Cable,
  speaker: Speaker,
} as const;

export type CategoryIconKey = keyof typeof icons;

export function categoryIconKey(value?: string | null, slug = ""): CategoryIconKey {
  const configured = value?.startsWith("icon:") ? value.slice(5) : value;
  if (configured && configured in icons) return configured as CategoryIconKey;
  const match = categoryIconOptions.find(([key]) => slug.includes(key));
  if (match) return match[0];
  if (/desktop|computer|component|pc-/.test(slug)) return "components";
  if (/mouse/.test(slug)) return "keyboard";
  if (/audio|headset/.test(slug)) return "headphones";
  if (/ups|electric|energy/.test(slug)) return "power";
  if (/router|switch|wifi/.test(slug)) return "network";
  return "package";
}

export function CategoryIcon({ value, slug, className = "size-4" }: { value?: string | null; slug?: string; className?: string }) {
  const Icon = icons[categoryIconKey(value, slug)];
  return <Icon className={className} />;
}
