import { GoogleGenAI, type Part } from "@google/genai";
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
  Boolean(process.env["GEMINI_" + purpose + "_API_KEY"]);
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
  const apiKey = process.env["GEMINI_" + purpose + "_API_KEY"];
  const model =
    process.env["GEMINI_" + purpose + "_MODEL"] || defaults[purpose];
  if (!apiKey)
    throw new AiFailure(
      purpose.toLowerCase() + " Gemini credentials are missing.",
    );
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 35000, retryOptions: { attempts: 1 } },
  });
  const responseJsonSchema = z.toJSONSchema(schema);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await client.models.generateContent({
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
      const input = result.usageMetadata?.promptTokenCount ?? 0;
      const output =
        (result.usageMetadata?.candidatesTokenCount ?? 0) +
        (result.usageMetadata?.thoughtsTokenCount ?? 0);
      const inRate =
        process.env["GEMINI_" + purpose + "_INPUT_USD_PER_MILLION"];
      const outRate =
        process.env["GEMINI_" + purpose + "_OUTPUT_USD_PER_MILLION"];
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
      let parsed: unknown;
      try {
        parsed = JSON.parse(result.text ?? "");
      } catch {
        throw new AiFailure("Gemini returned unreadable data.");
      }
      const validated = schema.safeParse(parsed);
      if (!validated.success)
        throw new AiFailure(
          "Gemini returned data outside the expected format.",
        );
      return validated.data;
    } catch (error) {
      if (error instanceof AiFailure) throw error;
      const status = Number(Reflect.get(Object(error), "status"));
      const retryable =
        status === 429 ||
        status >= 500 ||
        (error instanceof Error &&
          ["AbortError", "TimeoutError", "TypeError"].includes(error.name));
      if (!retryable || attempt === 1)
        throw new AiFailure(
          retryable
            ? "Gemini is temporarily unavailable."
            : "Gemini could not complete the request.",
          retryable,
        );
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          700 * 2 ** attempt + Math.floor(Math.random() * 350),
        ),
      );
    }
  }
  throw new AiFailure("Gemini could not complete the request.");
}
