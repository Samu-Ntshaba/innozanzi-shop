import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

describe("distributor-direct order operations readiness",()=>{
  it("keeps dispatch and delivery actions inside desktop Orders",()=>{
    const page=source("src/app/admin/orders/[id]/page.tsx");
    expect(page).toContain("OrderSupplierShipments");
    expect(page).toContain("OrderAddressChange");
    expect(page).not.toContain(`/admin/orders/\${order.id}/delivery`);
  });

  it("provides the same supplier and shipment actions in Mobile Admin",()=>{
    const page=source("src/app/mobile-admin/orders/[id]/page.tsx");
    expect(page).toContain("OrderSupplierSetup");
    expect(page).toContain("OrderSupplierShipments");
    expect(page).toContain("setOrderStatus");
    expect(page).toContain("resolveOrderOperation");
  });

  it("uses the shared action resolver in desktop Orders and never presents a dead-end message",()=>{
    const page=source("src/app/admin/orders/[id]/page.tsx");
    expect(page).toContain("resolveOrderOperation");
    expect(page).not.toContain("no further normal fulfilment transitions");
    expect(page).toContain("five simple milestones");
  });

  it("renders a real distributor assignment control in both order workspaces",()=>{
    const desktop=source("src/app/admin/orders/[id]/page.tsx"),mobile=source("src/app/mobile-admin/orders/[id]/page.tsx");
    expect(desktop).toContain("OrderDistributorAssignment");
    expect(mobile).toContain("OrderDistributorAssignment");
    expect(source("src/components/admin/order-distributor-assignment.tsx")).toContain("Assign distributor and continue");
  });

  it("assigns only approved purchasing distributors and records an audit trail",()=>{
    const actions=source("src/domain/orders/procurement-actions.ts");
    expect(actions).toContain("assignOrderItemDistributor");
    expect(actions).toContain('approvalStatus:"APPROVED"');
    expect(actions).toContain("purchasingEnabled:true");
    expect(actions).toContain('action:"order.item-distributor.assign"');
  });

  it("uses additive supplier-group shipment persistence",()=>{
    const schema=source("prisma/schema.prisma"),migration=source("prisma/migrations/20260916090000_distributor_order_operations/migration.sql");
    expect(schema).toContain("procurementId");
    expect(schema).toContain("expectedDispatchAt");
    expect(migration).toContain("ADD COLUMN \"procurementId\"");
    expect(migration).not.toMatch(/DROP (TABLE|COLUMN)/);
  });

  it("does not offer supplier status jumps that the server action rejects",()=>{
    const desktop=source("src/app/admin/orders/[id]/page.tsx"),shipments=source("src/components/admin/order-supplier-shipments.tsx"),actions=source("src/domain/orders/procurement-actions.ts");
    expect(desktop).toContain("allowedSupplierProgressStatuses(record?.status)");
    expect(desktop).toContain('defaultValue={record?.status??"SUBMITTED"}');
    expect(shipments).toContain("allowedSupplierProgressStatuses(group.status)");
    expect(actions).toContain("allowedSupplierProgressStatuses(previous)");
  });

  it("detects deployment skew before an admin submits an obsolete Server Action",()=>{
    const config=source("next.config.ts");
    expect(config).toContain("deploymentId: railwayDeploymentId");
    expect(config).toContain("process.env.RAILWAY_DEPLOYMENT_ID");
    expect(config).toContain("process.env.RAILWAY_GIT_COMMIT_SHA");
  });

  it("advances the Prisma runtime cache-buster with the latest migration",()=>{
    expect(source("src/lib/prisma.ts")).toContain('PRISMA_SCHEMA_VERSION = "2026-09-16-pricing-trading-platform"');
  });

  it("retires the standalone order delivery page to the Order workspace",()=>{
    expect(source("src/app/admin/orders/[id]/delivery/page.tsx")).toContain("redirect(`/admin/orders/");
  });
});
