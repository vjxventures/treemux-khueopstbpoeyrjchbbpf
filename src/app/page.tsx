"use client";

import { useCallback, useEffect, useState } from "react";
import { Listing } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/listing-card";
import { NegotiationView } from "@/components/negotiation-view";
import { SellForm } from "@/components/sell-form";
import { BuyerDialog } from "@/components/buyer-dialog";

type View = "browse" | "sell" | "negotiate";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showBuyerDialog, setShowBuyerDialog] = useState(false);
  const [view, setView] = useState<View>("browse");
  const [negotiationData, setNegotiationData] = useState<{
    listing: Listing;
    buyerName: string;
    buyerBudget: number;
    buyerPriorities: string;
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const fetchListings = useCallback(async () => {
    const res = await fetch("/api/listings");
    const data = await res.json();
    setListings(data);
    setFilteredListings(data);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredListings(listings);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setFilteredListings(data);
    } catch {
      setFilteredListings(listings);
    } finally {
      setIsSearching(false);
    }
  };

  const categories = [
    "All",
    ...Array.from(new Set(listings.map((l) => l.category))),
  ];

  const displayedListings =
    activeCategory === "All"
      ? filteredListings
      : filteredListings.filter((l) => l.category === activeCategory);

  const handleStartNegotiation = (data: {
    buyerName: string;
    buyerBudget: number;
    buyerPriorities: string;
  }) => {
    if (!selectedListing) return;
    setNegotiationData({
      listing: selectedListing,
      ...data,
    });
    setShowBuyerDialog(false);
    setView("negotiate");
  };

  if (view === "negotiate" && negotiationData) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <NegotiationView
          listing={negotiationData.listing}
          buyerName={negotiationData.buyerName}
          buyerBudget={negotiationData.buyerBudget}
          buyerPriorities={negotiationData.buyerPriorities}
          onClose={() => {
            setView("browse");
            setNegotiationData(null);
            fetchListings();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Hero / Header */}
      <header className="relative overflow-hidden border-b border-border">
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight">
                  <span className="text-primary">H</span>aggle
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-xs border-primary/30 text-primary"
                >
                  AI-NATIVE
                </Badge>
              </div>
              <p className="mt-2 max-w-lg text-muted-foreground">
                The marketplace where AI agents negotiate for you. Describe what
                you want to sell or buy, and let our agents handle the rest.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Active Listings
              </div>
              <div className="font-mono text-3xl font-bold text-primary">
                {listings.length}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-6">
        <Tabs
          value={view === "sell" ? "sell" : "browse"}
          onValueChange={(v) => setView(v as View)}
        >
          <div className="flex items-center justify-between gap-4 mb-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="browse" className="font-medium">
                Browse & Buy
              </TabsTrigger>
              <TabsTrigger value="sell" className="font-medium">
                Sell
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browse" className="space-y-6">
            {/* Search bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) {
                      setFilteredListings(listings);
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder='Search with AI... try "something to game on" or "furniture for my apartment"'
                  className="bg-secondary h-12 pl-4 pr-4 text-base"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="h-12 px-6"
              >
                {isSearching ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1 text-sm transition-all ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Listings grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {displayedListings.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  index={i}
                  onClick={() => {
                    setSelectedListing(listing);
                    setShowBuyerDialog(true);
                  }}
                />
              ))}
            </div>

            {displayedListings.length === 0 && (
              <div className="py-20 text-center text-muted-foreground">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-lg">No listings found.</p>
                <p className="text-sm mt-1">
                  Try a different search or browse all categories.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sell">
            <div className="mx-auto max-w-lg">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Create a Listing</h2>
                <p className="text-muted-foreground mt-1">
                  Describe your item and AI will generate the perfect listing
                  with smart pricing.
                </p>
              </div>
              <SellForm
                onListingCreated={() => {
                  setView("browse");
                  fetchListings();
                }}
                onCancel={() => setView("browse")}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Buyer Dialog */}
      {selectedListing && (
        <BuyerDialog
          listing={selectedListing}
          open={showBuyerDialog}
          onClose={() => {
            setShowBuyerDialog(false);
            setSelectedListing(null);
          }}
          onStartNegotiation={handleStartNegotiation}
        />
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-border mt-16">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between">
          <div className="font-mono text-xs text-muted-foreground">
            HAGGLE &copy; 2026 &mdash; AI-NATIVE MARKETPLACE
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            CRAIGSLIST REIMAGINED FOR THE AI ERA
          </div>
        </div>
      </footer>
    </div>
  );
}
