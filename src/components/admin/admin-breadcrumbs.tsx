"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function labelFor(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ").replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function AdminBreadcrumbs() {
  const segments = usePathname().split("/").filter(Boolean).slice(1);
  if (!segments.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <Link className="hover:text-sky-700" href="/admin">Overview</Link>
      {segments.map((segment, index) => {
        const href = `/admin/${segments.slice(0, index + 1).join("/")}`;
        const isIdentifier = /^[0-9a-f-]{24,}$/i.test(segment);
        const label = isIdentifier ? "Record" : labelFor(decodeURIComponent(segment));
        return <span className="flex items-center gap-1" key={href}><span aria-hidden="true">/</span>{index === segments.length - 1 ? <span aria-current="page" className="text-slate-700">{label}</span> : <Link className="hover:text-sky-700" href={href}>{label}</Link>}</span>;
      })}
    </nav>
  );
}
