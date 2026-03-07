import type { ProviderType } from "../../../shared/types";
import {
  buildProviderSyncUrl,
  buildProviderHeaders,
  buildProviderRequestBody,
  parseNonStreamingResponse,
} from "./providers";

/**
 * Truncate message text for classification.
 * If under 500 chars, trim to end of last sentence.
 * If 500+, take first 250 + last 250 chars.
 */
export function truncateForClassification(text: string): string {
  // Strip markdown formatting, asterisks, quotes
  const cleaned = text.replace(/[*"`]/g, "").trim();
  if (cleaned.length <= 500) return cleaned;
  const first = cleaned.slice(0, 250);
  const last = cleaned.slice(-250);
  return `${first} ... ${last}`;
}

/**
 * Classify the emotion of a message using an LLM call.
 * Returns one of the available expressions, or "neutral" as fallback.
 */
export async function classifyExpression(
  content: string,
  availableExpressions: string[],
  providerType: ProviderType,
  endpoint: string,
  apiKey: string | null,
  model: string,
): Promise<string> {
  if (availableExpressions.length === 0) return "neutral";

  const truncated = truncateForClassification(content);
  const labels = availableExpressions.join(", ");

  const messages = [
    {
      role: "user" as const,
      content: `Classify the emotion of the following message into exactly one word from this list: ${labels}\n\nMessage: "${truncated}"\n\nRespond with ONLY the emotion word, nothing else.`,
    },
  ];

  const url = buildProviderSyncUrl(providerType, endpoint, model);
  const headers = buildProviderHeaders(providerType, apiKey);
  const body = buildProviderRequestBody(providerType, model, messages, null, false);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[expression] Classification request failed: ${response.status}`);
      return "neutral";
    }

    const responseBody = await response.json();
    const text = parseNonStreamingResponse(providerType, responseBody);

    if (!text) return "neutral";

    // Clean and match against available expressions
    const cleaned = text.toLowerCase().replace(/[^a-z]/g, "");
    const match = availableExpressions.find((e) => cleaned === e || cleaned.includes(e));
    return match || "neutral";
  } catch (err) {
    console.error("[expression] Classification failed:", err);
    return "neutral";
  }
}
