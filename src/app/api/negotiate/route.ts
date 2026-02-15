import { NextRequest } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getListing, addNegotiation, getNegotiation, updateNegotiation } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";
import { NegotiationMessage } from "@/lib/types";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_ALPHA,
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { listingId, buyerName, buyerBudget, buyerPriorities } = body;

  const listing = getListing(listingId);
  if (!listing) {
    return new Response(JSON.stringify({ error: "Listing not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const negotiationId = uuidv4();
  addNegotiation({
    id: negotiationId,
    listingId,
    buyerName,
    buyerBudget,
    buyerPriorities,
    messages: [],
    status: "active",
    createdAt: new Date().toISOString(),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({
          type: "negotiation_start",
          negotiationId,
          listing: {
            title: listing.title,
            askingPrice: listing.askingPrice,
            sellerName: listing.sellerName,
          },
          buyer: { name: buyerName, budget: buyerBudget },
        });

        const messages: NegotiationMessage[] = [];
        let currentOffer = listing.askingPrice;
        let buyerOffer = Math.round(buyerBudget * 0.7);
        let round = 0;
        const maxRounds = 5;
        let dealReached = false;
        let finalPrice = 0;

        // System message
        const systemMsg: NegotiationMessage = {
          role: "system",
          content: `Negotiation started for "${listing.title}". ${listing.sellerName} is asking $${listing.askingPrice}. ${buyerName}'s agent will negotiate on their behalf.`,
          timestamp: new Date().toISOString(),
        };
        messages.push(systemMsg);
        send({ type: "message", message: systemMsg });

        while (round < maxRounds && !dealReached) {
          round++;

          // --- BUYER AGENT TURN ---
          const buyerPrompt = `You are an AI negotiation agent representing ${buyerName}, who wants to buy "${listing.title}".

Your buyer's maximum budget: $${buyerBudget}
Your buyer's priorities: ${buyerPriorities || "Get the best deal possible"}
Current asking price: $${currentOffer}
Listing condition: ${listing.condition}
Listing description: ${listing.description}

Negotiation history:
${messages.map((m) => `[${m.role}]: ${m.content}${m.offer ? ` (Offer: $${m.offer})` : ""}`).join("\n")}

This is round ${round} of ${maxRounds}. ${round === maxRounds ? "THIS IS THE FINAL ROUND - you must make your best and final offer or walk away." : ""}

Strategy guidelines:
- Round 1: Start with a reasonable but low offer (around 60-70% of asking price, but within budget)
- Middle rounds: Gradually increase your offer, making concessions while pointing out value considerations
- Final round: Make your best offer within budget

Respond with ONLY a JSON object:
{
  "message": "Your negotiation message to the seller (be conversational, persuasive, and characterful - 2-3 sentences max)",
  "offer": <your offer as a number, must be <= ${buyerBudget}>
}`;

          const buyerResponse = await generateText({
            model: anthropic("claude-sonnet-4-20250514"),
            prompt: buyerPrompt,
          });

          let buyerAction;
          try {
            const cleaned = buyerResponse.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            buyerAction = JSON.parse(cleaned);
          } catch {
            buyerAction = {
              message: `I'd like to offer $${buyerOffer} for this ${listing.title}.`,
              offer: buyerOffer,
            };
          }

          buyerOffer = Math.min(buyerAction.offer || buyerOffer, buyerBudget);
          const buyerMsg: NegotiationMessage = {
            role: "buyer_agent",
            content: buyerAction.message,
            offer: buyerOffer,
            timestamp: new Date().toISOString(),
          };
          messages.push(buyerMsg);
          send({ type: "message", message: buyerMsg });

          // Small delay for UX
          await new Promise((r) => setTimeout(r, 800));

          // --- SELLER AGENT TURN ---
          const sellerPrompt = `You are an AI negotiation agent representing ${listing.sellerName}, who is selling "${listing.title}".

Seller's personality: ${listing.sellerPersonality}
Asking price: $${listing.askingPrice}
Minimum acceptable price: $${listing.minPrice}
Item condition: ${listing.condition}
Item description: ${listing.description}

The buyer just offered: $${buyerOffer}

Negotiation history:
${messages.map((m) => `[${m.role}]: ${m.content}${m.offer ? ` (Offer: $${m.offer})` : ""}`).join("\n")}

This is round ${round} of ${maxRounds}. ${round === maxRounds ? "THIS IS THE FINAL ROUND - you must accept the offer if it's at or above your minimum price, or make a final counter-offer." : ""}

Strategy guidelines:
- If the offer is at or above your minimum price ($${listing.minPrice}), you can accept (especially in later rounds)
- If the offer is way below minimum, counter firmly but stay friendly
- Gradually come down in price across rounds, but never below minimum ($${listing.minPrice})
- Match the seller's personality in your tone

Respond with ONLY a JSON object:
{
  "message": "Your response to the buyer (be conversational, match the seller's personality - 2-3 sentences max)",
  "counterOffer": <your counter-offer as a number, or null if accepting>,
  "accept": <true if you accept the buyer's offer, false otherwise>
}`;

          const sellerResponse = await generateText({
            model: anthropic("claude-sonnet-4-20250514"),
            prompt: sellerPrompt,
          });

          let sellerAction;
          try {
            const cleaned = sellerResponse.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            sellerAction = JSON.parse(cleaned);
          } catch {
            sellerAction = {
              message: `I appreciate the offer, but I can't go below $${listing.minPrice}.`,
              counterOffer: Math.round(
                (listing.askingPrice + listing.minPrice) / 2
              ),
              accept: false,
            };
          }

          if (sellerAction.accept || buyerOffer >= listing.askingPrice) {
            dealReached = true;
            finalPrice = buyerOffer;

            const sellerMsg: NegotiationMessage = {
              role: "seller_agent",
              content: sellerAction.message || `Deal! $${buyerOffer} works for me.`,
              offer: buyerOffer,
              timestamp: new Date().toISOString(),
            };
            messages.push(sellerMsg);
            send({ type: "message", message: sellerMsg });
          } else {
            currentOffer = sellerAction.counterOffer || currentOffer;
            const sellerMsg: NegotiationMessage = {
              role: "seller_agent",
              content: sellerAction.message,
              offer: currentOffer,
              timestamp: new Date().toISOString(),
            };
            messages.push(sellerMsg);
            send({ type: "message", message: sellerMsg });

            // Check if buyer can meet the counter
            if (currentOffer <= buyerBudget && round >= maxRounds - 1) {
              // Auto-accept in final rounds if within budget
              dealReached = true;
              finalPrice = currentOffer;
            }
          }

          await new Promise((r) => setTimeout(r, 800));
        }

        // Final result
        if (dealReached) {
          const dealMsg: NegotiationMessage = {
            role: "system",
            content: `🤝 Deal reached at $${finalPrice}! ${buyerName} saved $${listing.askingPrice - finalPrice} off the asking price (${Math.round(((listing.askingPrice - finalPrice) / listing.askingPrice) * 100)}% discount).`,
            timestamp: new Date().toISOString(),
          };
          messages.push(dealMsg);
          send({ type: "message", message: dealMsg });
          send({ type: "deal", price: finalPrice, savings: listing.askingPrice - finalPrice });

          updateNegotiation(negotiationId, {
            messages,
            status: "deal",
            finalPrice,
          });
        } else {
          const noDealMsg: NegotiationMessage = {
            role: "system",
            content: `Negotiation ended without a deal. The gap between buyer and seller was too wide. ${buyerName} can try again with a different budget or look for other listings.`,
            timestamp: new Date().toISOString(),
          };
          messages.push(noDealMsg);
          send({ type: "message", message: noDealMsg });
          send({ type: "no_deal" });

          updateNegotiation(negotiationId, { messages, status: "no_deal" });
        }

        send({ type: "done" });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Negotiation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
