"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { NegotiationMessage, Listing } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NegotiationViewProps {
  listing: Listing;
  buyerName: string;
  buyerBudget: number;
  buyerPriorities: string;
  onClose: () => void;
}

interface DealResult {
  price: number;
  savings: number;
}

export function NegotiationView({
  listing,
  buyerName,
  buyerBudget,
  buyerPriorities,
  onClose,
}: NegotiationViewProps) {
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [deal, setDeal] = useState<DealResult | null>(null);
  const [currentThinking, setCurrentThinking] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const startNegotiation = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setIsNegotiating(true);

    try {
      const response = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          buyerName,
          buyerBudget,
          buyerPriorities,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "message") {
            if (data.message.role === "buyer_agent") {
              setCurrentThinking("buyer");
              await new Promise((r) => setTimeout(r, 600));
            } else if (data.message.role === "seller_agent") {
              setCurrentThinking("seller");
              await new Promise((r) => setTimeout(r, 600));
            }
            setCurrentThinking(null);
            setMessages((prev) => [...prev, data.message]);
          } else if (data.type === "deal") {
            setDeal(data);
          } else if (data.type === "done") {
            setIsComplete(true);
            setIsNegotiating(false);
          }
        }
      }
    } catch {
      setIsNegotiating(false);
      setIsComplete(true);
    }
  }, [listing.id, buyerName, buyerBudget, buyerPriorities]);

  useEffect(() => {
    startNegotiation();
  }, [startNegotiation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentThinking]);

  const getLatestOffers = () => {
    const buyerOffers = messages
      .filter((m) => m.role === "buyer_agent" && m.offer)
      .map((m) => m.offer!);
    const sellerOffers = messages
      .filter((m) => m.role === "seller_agent" && m.offer)
      .map((m) => m.offer!);
    return {
      buyerOffer: buyerOffers[buyerOffers.length - 1] || 0,
      sellerOffer:
        sellerOffers[sellerOffers.length - 1] || listing.askingPrice,
    };
  };

  const { buyerOffer, sellerOffer } = getLatestOffers();
  const gap = sellerOffer - buyerOffer;
  const gapPercent = listing.askingPrice > 0 ? (gap / listing.askingPrice) * 100 : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar with price ticker */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">{listing.title}</h2>
            <p className="text-sm text-muted-foreground">
              {listing.sellerName} vs {buyerName}&apos;s Agent
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Live price tracker */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-md bg-secondary/50 p-3 text-center">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Buyer Offer
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-haggle-green">
              ${buyerOffer || "—"}
            </div>
          </div>
          <div className="rounded-md bg-secondary/50 p-3 text-center">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Gap
            </div>
            <div
              className={`mt-1 font-mono text-xl font-bold ${gapPercent < 10 ? "text-haggle-green" : gapPercent < 25 ? "text-haggle-amber" : "text-haggle-red"}`}
            >
              {gap > 0 ? `$${gap}` : deal ? "DEAL" : "—"}
            </div>
          </div>
          <div className="rounded-md bg-secondary/50 p-3 text-center">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Seller Ask
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-haggle-amber">
              ${sellerOffer}
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} index={i} />
          ))}

          {currentThinking && (
            <div
              className={`flex ${currentThinking === "buyer" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-lg px-4 py-3 ${
                  currentThinking === "buyer"
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-secondary border border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {currentThinking === "buyer"
                      ? `${buyerName}'s agent`
                      : `${listing.sellerName}'s agent`}{" "}
                    thinking
                  </span>
                  <div className="flex gap-1">
                    <div className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <div className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <div className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Deal result banner */}
      {isComplete && deal && (
        <div className="border-t border-primary/30 bg-primary/5 p-6 text-center animate-fade-up">
          <div className="text-4xl mb-2">🤝</div>
          <h3 className="text-2xl font-bold text-primary font-mono">
            DEAL AT ${deal.price}
          </h3>
          <p className="mt-1 text-muted-foreground">
            Saved <span className="text-haggle-green font-semibold">${deal.savings}</span> off the
            asking price
          </p>
          <Button onClick={onClose} className="mt-4" variant="default">
            Back to Listings
          </Button>
        </div>
      )}

      {isComplete && !deal && (
        <div className="border-t border-destructive/30 bg-destructive/5 p-6 text-center animate-fade-up">
          <div className="text-4xl mb-2">💨</div>
          <h3 className="text-xl font-bold text-destructive">No Deal</h3>
          <p className="mt-1 text-muted-foreground">
            The gap was too wide. Try a higher budget or different priorities.
          </p>
          <Button onClick={onClose} className="mt-4" variant="outline">
            Back to Listings
          </Button>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  index,
}: {
  message: NegotiationMessage;
  index: number;
}) {
  if (message.role === "system") {
    return (
      <div
        className="animate-fade-up mx-auto max-w-md text-center"
        style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
      >
        <div className="inline-block rounded-full bg-secondary px-4 py-2 text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const isBuyer = message.role === "buyer_agent";

  return (
    <div
      className={`flex ${isBuyer ? "justify-end animate-slide-right" : "justify-start animate-slide-left"}`}
      style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
    >
      <div className={`max-w-[75%] ${isBuyer ? "items-end" : "items-start"}`}>
        {/* Agent label */}
        <div
          className={`mb-1 flex items-center gap-2 text-xs ${isBuyer ? "justify-end" : "justify-start"}`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${isBuyer ? "bg-haggle-green" : "bg-haggle-amber"}`}
          />
          <span className="font-mono text-muted-foreground">
            {isBuyer ? "Buyer Agent" : "Seller Agent"}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={`rounded-lg px-4 py-3 ${
            isBuyer
              ? "bg-primary/10 border border-primary/20 text-foreground"
              : "bg-secondary border border-border text-foreground"
          }`}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
          {message.offer && (
            <div
              className={`mt-2 flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-sm font-bold ${
                isBuyer
                  ? "bg-haggle-green/10 text-haggle-green"
                  : "bg-haggle-amber/10 text-haggle-amber"
              }`}
            >
              <span className="text-xs opacity-60">
                {isBuyer ? "OFFER" : "COUNTER"}
              </span>
              ${message.offer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
