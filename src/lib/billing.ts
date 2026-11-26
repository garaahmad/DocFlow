import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { appUrl } from "@/lib/auth";
import { ServiceError } from "@/lib/access";
import { db } from "@/lib/db";

const prices = () => ({
  pro: process.env.STRIPE_PRO_PRICE_ID,
  business: process.env.STRIPE_BUSINESS_PRICE_ID,
});
export const billingEnabled = () =>
  Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    prices().pro &&
    prices().business,
  );
function stripe() {
  if (!billingEnabled() || !process.env.STRIPE_SECRET_KEY)
    throw new ServiceError(
      503,
      "Stripe billing is disabled until credentials and prices are configured.",
    );
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 1,
    timeout: 12000,
  });
}
export async function billingLink(
  workspaceId: string,
  email: string,
  plan: "pro" | "business" | "portal",
) {
  const client = stripe();
  let record = await db.subscription.findUnique({ where: { workspaceId } });
  const returnUrl = appUrl() + "/dashboard/billing";
  if (!record && plan === "portal")
    throw new ServiceError(
      409,
      "Create a subscription before opening billing.",
    );
  if (!record) {
    const customer = await client.customers.create(
      { email, metadata: { workspaceId } },
      { idempotencyKey: "docflow-customer-" + workspaceId },
    );
    record = await db.subscription.upsert({
      where: { workspaceId },
      create: { workspaceId, customerId: customer.id },
      update: {},
    });
  }
  const customerId = record.customerId;
  const openPortal = async () =>
    (
      await client.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      })
    ).url;
  if (plan === "portal") return openPortal();
  const subscribed = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "workspaceId" FROM "Subscription" WHERE "workspaceId"=${workspaceId} FOR UPDATE`;
      const existing = await client.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });
      if (
        existing.data.some(
          (item) => !["canceled", "incomplete_expired"].includes(item.status),
        )
      ) {
        return { portal: true, url: null };
      }
      const open = await client.checkout.sessions.list({
        customer: customerId,
        status: "open",
        limit: 20,
      });
      const reusable = open.data.find(
        (session) =>
          session.mode === "subscription" && session.metadata?.plan === plan,
      );
      if (reusable?.url) return { portal: false, url: reusable.url };
      for (const session of open.data.filter(
        (session) => session.mode === "subscription",
      )) {
        await client.checkout.sessions.expire(session.id);
      }
      const checkout = await client.checkout.sessions.create(
        {
          mode: "subscription",
          customer: customerId,
          line_items: [{ price: prices()[plan]!, quantity: 1 }],
          success_url: returnUrl + "?checkout=received",
          cancel_url: returnUrl,
          subscription_data: { metadata: { workspaceId } },
          metadata: { plan },
          client_reference_id: workspaceId,
        },
        { idempotencyKey: "docflow-checkout-" + randomUUID() },
      );
      return { portal: false, url: checkout.url };
    },
    { timeout: 45000 },
  );
  return subscribed.portal ? openPortal() : subscribed.url;
}
export async function billingHistory(customerId?: string) {
  if (!customerId || !billingEnabled()) return [];
  const invoices = await stripe().invoices.list({
    customer: customerId,
    limit: 8,
  });
  return invoices.data.map((i) => ({
    number: i.number ?? i.id,
    status: i.status,
    amount: i.amount_paid,
    currency: i.currency.toUpperCase(),
    date: new Date(i.created * 1000).toISOString().slice(0, 10),
    url: i.hosted_invoice_url,
  }));
}
export async function webhook(body: string, signature: string | null) {
  if (!signature) throw new ServiceError(400, "Invalid Stripe signature.");
  const client = stripe();
  let event: Stripe.Event;
  try {
    event = client.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    throw new ServiceError(400, "Invalid Stripe signature.");
  }
  if (
    ![
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  )
    return;
  if (await db.billingEvent.findUnique({ where: { id: event.id } })) return;
  const provided = event.data.object as Stripe.Subscription;
  const subscription = await client.subscriptions.retrieve(provided.id);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const price = subscription.items.data[0]?.price.id;
  const priceMap = prices();
  const plan =
    price === priceMap.pro
      ? "pro"
      : price === priceMap.business
        ? "business"
        : "starter";
  await db.$transaction(async (tx) => {
    const count = await tx.billingEvent.createMany({
      data: [{ id: event.id }],
      skipDuplicates: true,
    });
    if (!count.count) return;
    const owned = await tx.subscription.findUnique({ where: { customerId } });
    if (!owned || subscription.metadata.workspaceId !== owned.workspaceId)
      return;
    const subscriptionGuard =
      subscription.status === "canceled" &&
      owned.subscriptionId &&
      owned.subscriptionId !== subscription.id;
    if (subscriptionGuard) return;
    await tx.subscription.updateMany({
      where: { customerId, lastEventAt: { lte: event.created } },
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        plan,
        lastEventAt: event.created,
      },
    });
  });
}
