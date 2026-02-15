import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getAllListings, addListing } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_ALPHA,
});

export async function GET() {
  const listings = getAllListings();
  return NextResponse.json(listings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, sellerName } = body;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt: `You are an expert marketplace listing creator. Based on the seller's description, generate a compelling listing.

Seller's description: "${description}"
Seller's name: ${sellerName}

Respond with ONLY a JSON object (no markdown, no code blocks) with these fields:
- title: A catchy, specific title (max 60 chars)
- description: A detailed 2-3 sentence description highlighting key features and condition
- category: One of: Electronics, Furniture, Sports, Gaming, Kitchen, Clothing, Books, Automotive, Other
- askingPrice: A fair market price in USD (number only)
- minPrice: The lowest reasonable price the seller might accept (about 65-75% of asking price, number only)
- condition: One of: Like New, Excellent, Very Good, Good, Fair
- imageEmoji: A single emoji that best represents this item
- sellerPersonality: A brief 1-2 sentence personality description for the seller's AI negotiation agent (e.g., "Firm but fair, knows market value" or "Casual and flexible, just wants it gone")`,
  });

  let parsed;
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response" },
      { status: 500 }
    );
  }

  const listing = {
    id: uuidv4(),
    title: parsed.title,
    description: parsed.description,
    category: parsed.category,
    askingPrice: parsed.askingPrice,
    minPrice: parsed.minPrice,
    condition: parsed.condition,
    location: body.location || "Bay Area, CA",
    sellerName,
    sellerPersonality: parsed.sellerPersonality,
    imageEmoji: parsed.imageEmoji,
    status: "active" as const,
    createdAt: new Date().toISOString(),
  };

  addListing(listing);
  return NextResponse.json(listing);
}
