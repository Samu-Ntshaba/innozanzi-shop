"use client";

import { useMemo, useState } from "react";
import { buttonClass, inputClass } from "@/components/admin/admin-ui";

type Field = { key: string; label: string };
type Mapping = Record<string, string>;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; } else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = "";
    } else value += character;
  }
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
const guesses: Record<string, string> = {
  first_name: "firstName", firstname: "firstName", name: "name", full_name: "name",
  last_name: "lastName", lastname: "lastName", surname: "lastName",
  email: "email", email_address: "email", phone: "phone", mobile: "phone", telephone: "phone",
  company: "companyName", company_name: "companyName", business: "companyName",
};

export function ImportCustomers({ action, fields }: { action: (data: FormData) => void | Promise<void>; fields: Field[] }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const payload = useMemo(() => sourceRows.map((row) => {
    const result: Record<string, unknown> = { customFields: {} as Record<string, string> };
    headers.forEach((header, index) => {
      const target = mapping[header];
      if (!target || target === "ignore" || !row[index]) return;
      if (target.startsWith("custom:")) (result.customFields as Record<string, string>)[target.slice(7)] = row[index];
      else result[target] = row[index];
    });
    return result;
  }), [headers, mapping, sourceRows]);
  const newFields = headers.filter((header) => mapping[header] === "new").map((header) => ({ key: normalise(header), label: header }));
  const finalPayload = payload.map((row, rowIndex) => {
    const copy = { ...row, customFields: { ...(row.customFields as Record<string, string>) } };
    headers.forEach((header, index) => { if (mapping[header] === "new" && sourceRows[rowIndex][index]) copy.customFields[normalise(header)] = sourceRows[rowIndex][index]; });
    return copy;
  });

  async function load(file?: File) {
    if (!file) return;
    const parsed = parseCsv(await file.text());
    const nextHeaders = parsed[0] ?? [];
    setHeaders(nextHeaders);
    setSourceRows(parsed.slice(1).filter((row) => row.some(Boolean)));
    setMapping(Object.fromEntries(nextHeaders.map((header) => [header, guesses[normalise(header)] ?? (fields.some((field) => field.key === normalise(header)) ? `custom:${normalise(header)}` : "new")])));
  }

  return <form action={action} className="space-y-5">
    <label className="block border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-700">
      Choose a CSV file
      <input className="mx-auto mt-3 block text-sm font-normal" type="file" accept=".csv,text/csv" onChange={(event) => load(event.target.files?.[0])} required />
    </label>
    {headers.length ? <>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="border-b p-2">File column</th><th className="border-b p-2">Import into</th><th className="border-b p-2">Example</th></tr></thead><tbody>
        {headers.map((header, index) => <tr key={`${header}-${index}`}><td className="border-b p-2 font-semibold">{header}</td><td className="border-b p-2"><select className={`${inputClass} w-full`} value={mapping[header] ?? "ignore"} onChange={(event) => setMapping({ ...mapping, [header]: event.target.value })}>
          <option value="ignore">Do not import</option><option value="firstName">First name</option><option value="lastName">Last name</option><option value="name">Full name</option><option value="email">Email</option><option value="phone">Phone</option><option value="companyName">Company</option>
          {fields.map((field) => <option key={field.key} value={`custom:${field.key}`}>{field.label}</option>)}<option value="new">Create new CRM column: {header}</option>
        </select></td><td className="border-b p-2 text-slate-500">{sourceRows[0]?.[index] || "—"}</td></tr>)}
      </tbody></table></div>
      <input type="hidden" name="rows" value={JSON.stringify(finalPayload)} /><input type="hidden" name="newFields" value={JSON.stringify(newFields)} />
      <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-600">{sourceRows.length} row(s) ready. Existing email addresses will be skipped.</p><button className={buttonClass}>Import customers</button></div>
    </> : null}
  </form>;
}
