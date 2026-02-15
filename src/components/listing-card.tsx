"use client";

import { Listing } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function ListingCard({
  listing,
  onClick,
  index = 0,
}: {
  listing: Listing;
  onClick: () => void;
  index?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="animate-fade-up group relative w-full text-left"
      style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
    >
      <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:bg-secondary/50">
        {/* Emoji + Content */}
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-secondary text-3xl">
            {listing.imageEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
              {listing.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {listing.description}
            </p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-xs font-mono"
            >
              {listing.category}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {listing.condition}
            </Badge>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold text-primary">
              ${listing.askingPrice}
            </span>
          </div>
        </div>

        {/* Seller info */}
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-haggle-green" />
          {listing.sellerName} &middot; {listing.location}
        </div>

        {/* Hover glow line */}
        <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-primary to-primary/0 transition-all duration-300 group-hover:w-full" />
      </div>
    </button>
  );
}
