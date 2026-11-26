export const plans = {
  starter: {
    name: "Starter",
    price: 0,
    documents: 30,
    insights: 8,
    retries: 10,
    seats: 1,
  },
  pro: {
    name: "Pro",
    price: 29,
    documents: 300,
    insights: 100,
    retries: 100,
    seats: 1,
  },
  business: {
    name: "Business",
    price: 79,
    documents: 1500,
    insights: 400,
    retries: 300,
    seats: 15,
  },
} as const;
export type PlanCode = keyof typeof plans;
export function planCode(plan?: string, status?: string): PlanCode {
  return (status === "active" || status === "trialing") &&
    (plan === "pro" || plan === "business")
    ? plan
    : "starter";
}
