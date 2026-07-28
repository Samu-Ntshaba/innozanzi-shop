import type { ReactNode } from "react";

export function BlogContent({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(<ul className="my-5 list-disc space-y-2 pl-6 text-slate-700" key={`list-${blocks.length}`}>{bullets.map((item, index) => <li key={index}>{item}</li>)}</ul>);
    bullets = [];
  };
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (line.startsWith("- ")) { bullets.push(line.slice(2)); return; }
    flushBullets();
    if (!line) return;
    if (line.startsWith("### ")) blocks.push(<h3 className="mb-3 mt-8 text-xl font-bold tracking-tight text-slate-950" key={index}>{line.slice(4)}</h3>);
    else if (line.startsWith("## ")) blocks.push(<h2 className="mb-4 mt-10 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl" key={index}>{line.slice(3)}</h2>);
    else if (line.startsWith("# ")) blocks.push(<h2 className="mb-4 mt-10 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl" key={index}>{line.slice(2)}</h2>);
    else blocks.push(<p className="my-4 text-[1.05rem] leading-8 text-slate-700" key={index}>{line}</p>);
  });
  flushBullets();
  return <div>{blocks}</div>;
}
