import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma",()=>({prisma:{}}));
vi.mock("@/domain/auth/session",()=>({requirePermission:vi.fn()}));
import { partnershipAdminActions } from "@/domain/partnerships/admin-links";
import { ManualPartnerForm } from "@/app/admin/partnerships/partners/new/manual-partner-form";

describe("sales partner Admin entry points", () => {
  it("separates direct registration from public application review", () => {
    expect(partnershipAdminActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Register sales partner", href: "/admin/partnerships/partners/new", primary: true }),
      expect.objectContaining({ label: "Review applications", href: "/admin/partnerships/applications" }),
      expect.objectContaining({ label: "Manage partners", href: "/admin/partnerships/partners" }),
    ]));
  });
  it("submits registration to a stable POST endpoint without password fields", () => {
    const html=renderToStaticMarkup(createElement(ManualPartnerForm,{clients:[],types:[{id:"type-id",label:"Sales partner"}],managers:[]}));
    expect(html).toContain('action="/api/admin/partnerships/partners/register"');
    expect(html).toContain('method="post"');
    expect(html).not.toContain('name="password"');
    expect(html.toLowerCase()).not.toContain("temporary password");
  });
});
