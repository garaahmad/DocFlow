import { outcome } from "@/lib/access";
import { webhook } from "@/lib/billing";
import { readBytes } from "@/lib/request-body";
export async function POST(request: Request) {
  try {
    await webhook(
      (await readBytes(request, 1048576)).toString("utf8"),
      request.headers.get("stripe-signature"),
    );
    return Response.json({ received: true });
  } catch (error) {
    return outcome(error);
  }
}
