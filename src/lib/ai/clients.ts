import {
  GoogleGenAI,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { z } from "zod";
import Decimal from "decimal.js";
import { db } from "@/lib/db";

type Purpose = "EXTRACTION" | "VALIDATION" | "INSIGHTS";
const defaults: Record<Purpose, string> = {
  EXTRACTION: "gemini-3.1-flash-lite",
  VALIDATION: "gemini-3.1-flash-lite",
  INSIGHTS: "gemini-3.1-flash-lite",
};
export const aiReady = (purpose: Purpose) =>
  Boolean(process.env["GEMINI_" + purpose + "_API_KEY"]?.trim());
export function mockEnabled() {
  return (
    process.env.DOCFLOW_MOCK_AI === "true" &&
    !process.env.RENDER &&
    (process.env.NODE_ENV !== "production" ||
      process.env.DOCFLOW_LOCAL_TEST === "true")
  );
}
export class AiFailure extends Error {
  constructor(
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}

function providerReason(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const { message } = error;
  if (/reported as leaked/i.test(message)) return "API_KEY_REPORTED_LEAKED";
  if (/unrestricted (?:standard )?(?:API )?keys?/i.test(message))
    return "API_KEY_UNRESTRICTED";
  if (/schema.*(?:too complex|too many|too large)/is.test(message))
    return "SCHEMA_TOO_COMPLEX";
  return message.match(
    /\b(?:API_KEY_INVALID|API_KEY_SERVICE_BLOCKED|API_KEY_HTTP_REFERRER_BLOCKED|API_KEY_IP_ADDRESS_BLOCKED|FREE_TIER_VERIFICATION_REQUIRED|SERVICE_DISABLED|PERMISSION_DENIED|RESOURCE_EXHAUSTED|NOT_FOUND|FAILED_PRECONDITION|INVALID_ARGUMENT|UNAVAILABLE)\b/,
  )?.[0];
}

export async function generate<T extends z.ZodType>(
  purpose: Purpose,
  workspaceId: string,
  systemInstruction: string,
  parts: Part[],
  schema: T,
  maxOutputTokens = 3500,
): Promise<z.infer<T>> {
  if (typeof window !== "undefined")
    throw new Error("AI services must run on the server.");
  const apiKey = process.env["GEMINI_" + purpose + "_API_KEY"]?.trim();
  const model =
    process.env["GEMINI_" + purpose + "_MODEL"]?.trim() || defaults[purpose];
  if (!apiKey)
    throw new AiFailure(
      purpose.toLowerCase() + " Gemini credentials are missing.",
    );
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 35000, retryOptions: { attempts: 1 } },
  });
  // Keep strict validation in Zod. Patterns and large array bounds increase
  // the complexity of Gemini's constrained decoder.
  const responseJsonSchema = z.toJSONSchema(schema, {
    override: ({ jsonSchema }) => {
      delete jsonSchema.pattern;
      delete jsonSchema.minLength;
      delete jsonSchema.maxLength;
      delete jsonSchema.maxItems;
    },
  });
  delete responseJsonSchema.$schema;

  let result: GenerateContentResponse | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      result = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction,
          maxOutputTokens,
          responseMimeType: "application/json",
          responseJsonSchema,
          abortSignal: AbortSignal.timeout(36000),
        },
      });
      break;
    } catch (error) {
      const status = Number(Reflect.get(Object(error), "status"));
      const retryable =
        status === 429 ||
        status >= 500 ||
        (error instanceof Error &&
          ["AbortError", "TimeoutError", "TypeError"].includes(error.name));
      if (!retryable || attempt === 1) {
        console.error(
          JSON.stringify({
            event: "gemini_request_failed",
            purpose,
            status: status >= 400 && status <= 599 ? status : undefined,
            reason: providerReason(error),
          }),
        );
        throw new AiFailure(
          retryable
            ? "Gemini is temporarily unavailable."
            : "Gemini could not complete the request.",
          retryable,
        );
      }
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          700 * 2 ** attempt + Math.floor(Math.random() * 350),
        ),
      );
    }
  }
  if (!result) throw new AiFailure("Gemini could not complete the request.");

  const input = result.usageMetadata?.promptTokenCount ?? 0;
  const output =
    (result.usageMetadata?.candidatesTokenCount ?? 0) +
    (result.usageMetadata?.thoughtsTokenCount ?? 0);
  const inRate = process.env["GEMINI_" + purpose + "_INPUT_USD_PER_MILLION"];
  const outRate = process.env["GEMINI_" + purpose + "_OUTPUT_USD_PER_MILLION"];
  const estimate =
    inRate &&
    outRate &&
    /^\d+(\.\d+)?$/.test(inRate) &&
    /^\d+(\.\d+)?$/.test(outRate)
      ? new Decimal(inRate)
          .times(input)
          .plus(new Decimal(outRate).times(output))
          .div(1000000)
          .toFixed(8)
      : null;
  try {
    await db.aiUsage.create({
      data: {
        workspaceId,
        service: purpose,
        model,
        inputTokens: input,
        outputTokens: output,
        estimatedUsd: estimate,
      },
    });
  } catch {
    console.error(
      JSON.stringify({ event: "gemini_usage_write_failed", purpose }),
    );
    throw new AiFailure("Gemini usage could not be recorded.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text ?? "");
  } catch {
    throw new AiFailure("Gemini returned unreadable data.");
  }
  const validated = schema.safeParse(parsed);
  if (!validated.success)
    throw new AiFailure("Gemini returned data outside the expected format.");
  return validated.data;
}
