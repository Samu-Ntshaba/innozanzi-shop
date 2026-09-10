import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("closes the AI assistant when browsing products", () => {
  const assistant = readFileSync(
    "src/components/store/ai-shopping-assistant.tsx",
    "utf8",
  );

  expect(assistant).toContain(
    'href="/shop" onClick={()=>setOpen(false)} className="font-bold underline">Browse products</Link>',
  );
});
