import { afterEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { webhook } from "@/lib/billing";

afterEach(() => vi.unstubAllEnvs());
describe("Stripe webhook signatures", () => {
  it("accepts a correctly signed irrelevant event and rejects tampering and missing signatures", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unit_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_unit_fixture");
    vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_pro_fixture");
    vi.stubEnv("STRIPE_BUSINESS_PRICE_ID", "price_business_fixture");
    const event = JSON.stringify({
      id: "evt_test",
      created: Math.floor(Date.now() / 1000),
      type: "test.irrelevant",
    });
    const signature = new Stripe(
      "sk_test_unit_fixture",
    ).webhooks.generateTestHeaderString({
      payload: event,
      secret: "whsec_unit_fixture",
    });
    await expect(webhook(event, signature)).resolves.toBeUndefined();
    await expect(webhook(event + " ", signature)).rejects.toHaveProperty(
      "status",
      400,
    );
    await expect(webhook(event, null)).rejects.toHaveProperty("status", 400);
  });
});
