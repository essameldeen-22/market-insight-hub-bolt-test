// Server-only helper: Claude sentiment + topic analysis for competitor reviews.
// Uses Anthropic Messages API with the Haiku model for cost efficiency.

import Anthropic from "@anthropic-ai/sdk";

export interface TopicResult {
  topic: string;
  count: number;
  positive: number;
  negative: number;
  neutral: number;
  lean: "strength" | "pain" | "split" | "neutral";
}

export interface AnalysisResult {
  totalReviews: number;
  sentiment: { positive: number; negative: number; mixed: number; neutral: number };
  topics: TopicResult[];
  pains: { title: string; description: string; opportunity: string }[];
  strengths: { title: string; description: string; how_to_leverage: string }[];
}

const SYSTEM_PROMPT = `You are a senior market-research analyst and product strategist. You will receive a list of product reviews (mixed English and Arabic).
Analyze them and return STRICT JSON matching this TypeScript type — no markdown, no commentary:

{
  "totalReviews": number,
  "sentiment": { "positive": number, "negative": number, "mixed": number, "neutral": number },
  "topics": [
    { "topic": string, "count": number, "positive": number, "negative": number, "neutral": number, "lean": "strength" | "pain" | "split" | "neutral" }
  ],
  "pains": [ { "title": string, "description": string, "opportunity": string } ],
  "strengths": [ { "title": string, "description": string, "how_to_leverage": string } ]
}

Rules:
- Counts in "sentiment" must sum to totalReviews.
- Top 8 topics maximum, ordered by count desc.
- Topic names should be short (1-3 words), in the same language as most reviews for that topic.
- lean = "strength" if positive dominates (>60% of topic mentions); "pain" if negative dominates; "split" if roughly balanced; "neutral" otherwise.
- pains = up to 5 recurring complaints. Each pain has:
  - title: short complaint label (2-4 words)
  - description: 1-sentence summary of what users complain about
  - opportunity: 1-2 sentence actionable recommendation for how a competitor (the reader) can turn this complaint into a concrete differentiation advantage. Be specific — reference the exact gap and suggest what to build or emphasize.
- strengths = up to 5 recurring praises. Each strength has:
  - title: short praise label (2-4 words)
  - description: 1-sentence summary of what users love
  - how_to_leverage: 1-2 sentence actionable recommendation for how the reader can match or neutralize this strength in their own product.
- All text (titles, descriptions, opportunities, how_to_leverage) must match the review language (Arabic reviews → Arabic text; English reviews → English text).
- Return ONLY the JSON object, no code fences.`;

export async function analyzeReviews(productName: string, reviews: string[]): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });

  const userMessage = `Product: ${productName || "(unnamed)"}\n\nReviews (${reviews.length}):\n${reviews.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  // Strip potential code fences even though we ask for none.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(cleaned) as AnalysisResult;
  } catch (e) {
    throw new Error(`Model did not return valid JSON: ${cleaned.slice(0, 200)}`);
  }

  return parsed;
}
