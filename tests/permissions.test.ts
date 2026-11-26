import { describe, expect, it } from "vitest";
import { can, canManageRole } from "@/lib/permissions";
import { planCode, plans } from "@/lib/plans";

describe("workspace permissions", () => {
  it("limits viewer and member actions and restricts billing to owners", () => {
    expect(can("VIEWER", "read")).toBe(true);
    expect(can("VIEWER", "write")).toBe(false);
    expect(can("MEMBER", "manage")).toBe(false);
    expect(can("ADMIN", "bill")).toBe(false);
    expect(can("OWNER", "bill")).toBe(true);
  });
  it("protects ownership and peer admins", () => {
    expect(canManageRole("OWNER", "OWNER", "VIEWER")).toBe(false);
    expect(canManageRole("ADMIN", "ADMIN", "MEMBER")).toBe(false);
    expect(canManageRole("ADMIN", "MEMBER", "ADMIN")).toBe(false);
    expect(canManageRole("OWNER", "MEMBER", "ADMIN")).toBe(true);
  });
});
describe("plan enforcement", () => {
  it("grants paid quotas to active and trialing subscriptions", () => {
    expect(planCode("pro", "active")).toBe("pro");
    expect(planCode("business", "trialing")).toBe("business");
    expect(planCode("business", "past_due")).toBe("starter");
    expect(planCode("unknown", "active")).toBe("starter");
    expect(plans.starter.documents).toBeLessThan(plans.pro.documents);
  });
});
