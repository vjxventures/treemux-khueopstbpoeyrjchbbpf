export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  askingPrice: number;
  minPrice: number;
  condition: string;
  location: string;
  sellerName: string;
  sellerPersonality: string;
  createdAt: string;
  imageEmoji: string;
  status: "active" | "sold" | "negotiating";
}

export interface NegotiationMessage {
  role: "buyer_agent" | "seller_agent" | "system";
  content: string;
  offer?: number;
  timestamp: string;
}

export interface Negotiation {
  id: string;
  listingId: string;
  buyerName: string;
  buyerBudget: number;
  buyerPriorities: string;
  messages: NegotiationMessage[];
  status: "active" | "deal" | "no_deal";
  finalPrice?: number;
  createdAt: string;
}

export interface BuyerPreferences {
  query: string;
  maxBudget: number;
  priorities: string;
  buyerName: string;
}
