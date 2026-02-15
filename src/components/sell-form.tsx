"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Listing } from "@/lib/types";

interface SellFormProps {
  onListingCreated: (listing: Listing) => void;
  onCancel: () => void;
}

export function SellForm({ onListingCreated, onCancel }: SellFormProps) {
  const [description, setDescription] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [location, setLocation] = useState("Bay Area, CA");
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<Listing | null>(null);

  const handleGenerate = async () => {
    if (!description.trim() || !sellerName.trim()) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, sellerName, location }),
      });
      const listing = await response.json();
      setPreview(listing);
    } catch {
      // Handle error silently
    } finally {
      setIsGenerating(false);
    }
  };

  if (preview) {
    return (
      <div className="animate-fade-up space-y-6">
        <div className="text-center">
          <span className="text-5xl">{preview.imageEmoji}</span>
          <h3 className="mt-3 text-xl font-semibold">{preview.title}</h3>
          <p className="mt-1 text-muted-foreground">{preview.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Price
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-primary">
              ${preview.askingPrice}
            </div>
          </div>
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Category
            </div>
            <div className="mt-1 font-semibold">{preview.category}</div>
          </div>
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Condition
            </div>
            <div className="mt-1 font-semibold">{preview.condition}</div>
          </div>
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Location
            </div>
            <div className="mt-1 font-semibold text-sm">{preview.location}</div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs font-mono text-muted-foreground mb-1">
            AI Negotiation Personality
          </div>
          <p className="text-sm">{preview.sellerPersonality}</p>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1"
            variant="default"
            onClick={() => onListingCreated(preview)}
          >
            Publish Listing
          </Button>
          <Button
            variant="outline"
            onClick={() => setPreview(null)}
          >
            Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium">Your Name</label>
        <Input
          value={sellerName}
          onChange={(e) => setSellerName(e.target.value)}
          placeholder="e.g. Alex"
          className="bg-secondary"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Describe what you&apos;re selling
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. My 2-year-old MacBook Pro M2, still in great shape, comes with charger. Some scratches on the bottom but runs perfectly..."
          rows={4}
          className="bg-secondary resize-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Be descriptive — our AI will generate the perfect listing from your
          description.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Location</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. San Francisco, CA"
          className="bg-secondary"
        />
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1"
          onClick={handleGenerate}
          disabled={!description.trim() || !sellerName.trim() || isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              AI is generating your listing...
            </span>
          ) : (
            "Generate Listing with AI"
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
