import { describe, expect, it } from "vitest";
import { vi } from "vitest";
vi.mock("@/lib/prisma",()=>({prisma:{}}));
vi.mock("@/domain/auth/session",()=>({requirePermission:vi.fn()}));
import { partnershipAdminActions } from "@/app/admin/partnerships/page";

describe("sales partner Admin entry points", () => {
  it("separates direct registration from public application review", () => {
    expect(partnershipAdminActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Register sales partner", href: "/admin/partnerships/partners/new", primary: true }),
      expect.objectContaining({ label: "Review applications", href: "/admin/partnerships/applications" }),
      expect.objectContaining({ label: "Manage partners", href: "/admin/partnerships/partners" }),
    ]));
  });
});
