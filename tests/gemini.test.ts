import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { extract } from "@/lib/ai/extraction";
import { clarify } from "@/lib/ai/validation";
import { generate } from "@/lib/ai/clients";
import { blankExtraction } from "@/lib/documents";
import { invoicePdf } from "./fixtures";

const mocks = vi.hoisted(() => ({
  construct: vi.fn(),
  generate: vi.fn(),
  usage: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.generate };
    constructor(options: unknown) {
      mocks.construct(options);
    }
  },
}));
vi.mock("@/lib/db", () => ({ db: { aiUsage: { create: mocks.usage } } }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DOCFLOW_MOCK_AI", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("Gemini purpose isolation", () => {
  it("routes extraction, validation and insights to their assigned keys and tracks usage", async () => {
    vi.stubEnv("GEMINI_EXTRACTION_API_KEY", "fixture-extraction");
    vi.stubEnv("GEMINI_VALIDATION_API_KEY", "fixture-validation");
    vi.stubEnv("GEMINI_INSIGHTS_API_KEY", "fixture-insights");
    vi.stubEnv("GEMINI_EXTRACTION_MODEL", "fixture-model");
    vi.stubEnv("GEMINI_EXTRACTION_INPUT_USD_PER_MILLION", "1");
    vi.stubEnv("GEMINI_EXTRACTION_OUTPUT_USD_PER_MILLION", "2");
    const data = {
      ...blankExtraction,
      total: "162.00",
      vendor: "Northstar Studio",
    };
    mocks.generate.mockResolvedValueOnce({
      text: JSON.stringify(data),
      usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500 },
    });
    const bytes = invoicePdf();
    expect(await extract("workspace", "application/pdf", bytes)).toEqual(data);
    expect(mocks.construct).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ apiKey: "fixture-extraction" }),
    );
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "fixture-model",
        contents: [
          {
            role: "user",
            parts: [
              expect.anything(),
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: bytes.toString("base64"),
                },
              },
            ],
          },
        ],
      }),
    );
    const wireSchema = JSON.stringify(
      mocks.generate.mock.calls[0][0].config.responseJsonSchema,
    );
    expect(wireSchema).not.toMatch(/"(\$schema|pattern|maxItems)":/);
    expect(mocks.usage).toHaveBeenCalledWith({
      data: expect.objectContaining({
        service: "EXTRACTION",
        estimatedUsd: "0.00200000",
        workspaceId: "workspace",
      }),
    });
    mocks.generate.mockResolvedValueOnce({ text: "[]" });
    await expect(
      clarify("workspace", "application/pdf", bytes, data, [
        {
          type: "test",
          severity: "warning",
          field: "total",
          explanation: "Review total.",
          action: null,
          evidence: null,
        },
      ]),
    ).resolves.toEqual([]);
    expect(mocks.construct).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ apiKey: "fixture-validation" }),
    );
    mocks.generate.mockResolvedValueOnce({
      text: '{"note":"Approved values are available."}',
    });
    await expect(
      generate(
        "INSIGHTS",
        "workspace",
        "Explain facts",
        [{ text: "fixture question" }],
        z.object({ note: z.string() }),
      ),
    ).resolves.toHaveProperty("note");
    expect(mocks.construct).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ apiKey: "fixture-insights" }),
    );
  });
  it("rejects invalid model output and a missing purpose key", async () => {
    vi.stubEnv("GEMINI_EXTRACTION_API_KEY", "fixture-extraction");
    vi.stubEnv("GEMINI_INSIGHTS_API_KEY", undefined);
    mocks.generate.mockResolvedValueOnce({ text: '{"total":162}' });
    await expect(
      extract("workspace", "application/pdf", invoicePdf()),
    ).rejects.toThrow("outside the expected format");
    await expect(
      generate(
        "INSIGHTS",
        "workspace",
        "Explain facts",
        [{ text: "fixture" }],
        z.object({ note: z.string() }),
      ),
    ).rejects.toThrow("credentials are missing");
    expect(mocks.construct).toHaveBeenCalledTimes(1);
  });
  it("logs an allowlisted provider reason without logging raw errors", async () => {
    vi.stubEnv("GEMINI_EXTRACTION_API_KEY", "fixture-extraction");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.generate.mockRejectedValueOnce(
        Object.assign(
          new Error("Your API key was reported as leaked: secret fixture"),
          {
            status: 403,
          },
        ),
      );
      await expect(
        extract("workspace", "application/pdf", invoicePdf()),
      ).rejects.toThrow("could not complete");
      expect(log).toHaveBeenCalledExactlyOnceWith(
        JSON.stringify({
          event: "gemini_request_failed",
          purpose: "EXTRACTION",
          status: 403,
          reason: "API_KEY_REPORTED_LEAKED",
        }),
      );
    } finally {
      log.mockRestore();
    }
  });
});
