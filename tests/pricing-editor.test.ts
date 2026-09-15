import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { DEFAULT_COMMERCE } from "@/domain/commerce/config";
const harness = vi.hoisted(() => ({ states: [] as unknown[], cursor: 0, preview: vi.fn() }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.states)) harness.states[index] = initial;
    return [harness.states[index], (value: unknown) => { harness.states[index] = typeof value === "function" ? value(harness.states[index]) : value; }];
  },
  useRef: (initial: unknown) => {
    const index = harness.cursor++;
    return harness.states[index] ?? (harness.states[index] = { current: initial });
  },
  useActionState: () => [{ error: "", success: "" }, vi.fn(), false],
}));
vi.mock("@/domain/commerce/actions", () => ({ previewCommerceSettings: harness.preview, saveCommerceSettings: vi.fn(), saveDraftCommerceSettings: vi.fn(), loadDraftCommerceSettings: vi.fn() }));
import { PricingEditor } from "@/components/admin/pricing-editor";
type Element = ReactElement<Record<string, unknown>>;
function render() { harness.cursor = 0; return PricingEditor({ initial: DEFAULT_COMMERCE, initialDraft: null }); }
function all(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(all);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...all(element.props.children)];
}
function change(element: Element, value: string) { (element.props.onChange as (e: unknown) => void)({ target: { value } }); }
beforeEach(() => { harness.states = []; harness.cursor = 0; vi.clearAllMocks(); });
it("keeps the editor usable when supplier cost is zero or cleared", () => {
  const input = all(render()).find(e => e.type === "input" && e.props.value === 800)!;
  change(input, "");
  expect(() => render()).not.toThrow();
  expect(all(render()).some(e => e.props.role === "alert")).toBe(true);
});
it("keeps custom cost row identity while its name is edited", () => {
  harness.states[0] = { ...DEFAULT_COMMERCE, customCosts: [{ name: "Insurance", description: "", basis: "PER_ITEM", amount: 1, active: true }] };
  const before = all(render());
  const row = before.find(e => e.type === "div" && e.key?.includes("0"))!;
  change(before.find(e => e.props["aria-label"] === "Cost name")!, "Insurance premium");
  expect(all(render()).find(e => e.type === "div" && e.key?.includes("0"))!.key).toBe(row.key);
});
it("does not invalidate catalogue impact when publication reason or simulator changes", () => {
  expect(render().props.onChange).toBeUndefined();
});
it("discards a preview response if settings changed while it was calculating", async () => {
  let finish!: (value: unknown) => void;
  harness.preview.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const form = new FormData();
  const Original = globalThis.FormData;
  vi.stubGlobal("FormData", class { constructor() { return form; } });
  try {
    const nodes = all(render());
    const preview = nodes.find(e => e.type === "button" && e.props.children === "Preview catalogue")!;
    (preview.props.onClick as (e: unknown) => void)({ currentTarget: { form: {} } });
    change(nodes.find(e => e.props.name === "handling")!, "20");
    finish({ ok: true, impact: { token: "obsolete" } });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(all(render()).some(e => e.props.name === "impactToken")).toBe(false);
  } finally { vi.stubGlobal("FormData", Original); }
});
