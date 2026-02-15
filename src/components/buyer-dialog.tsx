"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Listing } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BuyerDialogProps {
  listing: Listing;
  open: boolean;
  onClose: () => void;
  onStartNegotiation: (data: {
    buyerName: string;
    buyerBudget: number;
    buyerPriorities: string;
  }) => void;
}

export function BuyerDialog({
  listing,
  open,
  onClose,
  onStartNegotiation,
}: BuyerDialogProps) {
  const [buyerName, setBuyerName] = useState("");
  const [budget, setBudget] = useState(
    Math.round(listing.askingPrice * 0.85).toString()
  );
  const [priorities, setPriorities] = useState("");

  const handleStart = () => {
    if (!buyerName.trim() || !budget) return;
    onStartNegotiation({
      buyerName,
      buyerBudget: parseInt(budget),
      buyerPriorities: priorities || "Get the best deal possible",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-3xl">{listing.imageEmoji}</span>
            <div>
              <div className="text-lg">{listing.title}</div>
              <div className="text-sm font-normal text-muted-foreground">
                Asking{" "}
                <span className="font-mono text-primary font-semibold">
                  ${listing.askingPrice}
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Your Name
            </label>
            <Input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="e.g. Jordan"
              className="bg-secondary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Your Budget
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-secondary pl-7 font-mono"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Your AI agent won&apos;t go above this amount
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Negotiation Strategy (optional)
            </label>
            <Textarea
              value={priorities}
              onChange={(e) => setPriorities(e.target.value)}
              placeholder="e.g. I need it delivered, willing to pay more for that. Mention I can pick up today for a discount..."
              rows={3}
              className="bg-secondary resize-none"
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleStart}
            disabled={!buyerName.trim() || !budget}
          >
            Let My AI Agent Negotiate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
