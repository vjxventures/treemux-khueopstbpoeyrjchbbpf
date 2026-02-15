import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getAllListings } from "@/lib/store";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_ALPHA,
});

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  const allListings = getAllListings();

  if (!query || query.trim() === "") {
    return NextResponse.json(allListings);
  }

  const listingSummaries = allListings.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    category: l.category,
    price: l.askingPrice,
    condition: l.condition,
  }));

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt: `You are a smart marketplace search engine. A buyer is looking for: "${query}"

Here are the available listings:
${JSON.stringify(listingSummaries, null, 2)}

Return ONLY a JSON array of listing IDs that match the buyer's query, ordered by relevance (most relevant first). Consider semantic meaning, not just keyword matching. If nothing matches well, return an empty array.

Example: ["id1", "id2"]`,
  });

  let matchedIds: string[];
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    matchedIds = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(allListings);
  }

  const results = matchedIds
    .map((id) => allListings.find((l) => l.id === id))
    .filter(Boolean);

  return NextResponse.json(results);
}
