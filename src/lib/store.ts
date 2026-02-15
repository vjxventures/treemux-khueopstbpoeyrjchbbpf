import { Listing, Negotiation } from "./types";
import { v4 as uuidv4 } from "uuid";

const listings: Map<string, Listing> = new Map();
const negotiations: Map<string, Negotiation> = new Map();

// Seed some sample listings
const seedListings: Omit<Listing, "id" | "createdAt">[] = [
  {
    title: "Vintage Herman Miller Aeron Chair",
    description:
      "Classic size B Aeron chair in graphite. Some wear on the mesh but fully functional. All adjustments work perfectly. Lumbar support included.",
    category: "Furniture",
    askingPrice: 450,
    minPrice: 300,
    condition: "Good",
    location: "Palo Alto, CA",
    sellerName: "Marcus",
    sellerPersonality: "Firm but fair. Knows the value of what they're selling. Will negotiate but won't go below market value.",
    imageEmoji: "🪑",
    status: "active",
  },
  {
    title: 'MacBook Pro 14" M3 Pro - 18GB RAM',
    description:
      "Late 2023 MacBook Pro, Space Black. 18GB unified memory, 512GB SSD. Battery health at 94%. Includes original charger and box. Minor scuff on bottom.",
    category: "Electronics",
    askingPrice: 1400,
    minPrice: 1100,
    condition: "Excellent",
    location: "San Francisco, CA",
    sellerName: "Priya",
    sellerPersonality: "Tech-savvy and direct. Prices based on research. Will share benchmarks and specs to justify price. Slightly impatient with lowballers.",
    imageEmoji: "💻",
    status: "active",
  },
  {
    title: "Trek Domane AL 2 Road Bike - 56cm",
    description:
      "2022 model, Shimano Claris groupset. ~800 miles. New chain and brake pads. Great starter road bike. Includes bottle cage and saddle bag.",
    category: "Sports",
    askingPrice: 650,
    minPrice: 480,
    condition: "Very Good",
    location: "Mountain View, CA",
    sellerName: "Jake",
    sellerPersonality: "Chill surfer-bro energy. Flexible on price, especially if buyer seems enthusiastic about cycling. Will throw in extras for a good deal.",
    imageEmoji: "🚲",
    status: "active",
  },
  {
    title: "Sony A7III with 28-70mm Kit Lens",
    description:
      "Full-frame mirrorless camera body with kit lens. 42k shutter count. Sensor is clean, no issues. Two batteries, charger, and a camera bag included.",
    category: "Electronics",
    askingPrice: 1100,
    minPrice: 850,
    condition: "Good",
    location: "Stanford, CA",
    sellerName: "Elena",
    sellerPersonality: "Passionate photographer upgrading. Loves talking about photography and the camera's capabilities. Emotionally attached but practical about selling.",
    imageEmoji: "📷",
    status: "active",
  },
  {
    title: "IKEA KALLAX Shelf Unit 4x4 - White",
    description:
      "Large 4x4 KALLAX shelf, assembled. Some minor scratches. Must pick up, cannot deliver. Great for vinyl records or books.",
    category: "Furniture",
    askingPrice: 80,
    minPrice: 40,
    condition: "Fair",
    location: "Sunnyvale, CA",
    sellerName: "Tom",
    sellerPersonality: "Just wants it gone before moving. Very flexible on price. Quick to agree if buyer can pick up soon.",
    imageEmoji: "📚",
    status: "active",
  },
  {
    title: "Nintendo Switch OLED + 5 Games Bundle",
    description:
      "White OLED Switch with Zelda TOTK, Mario Odyssey, Smash Bros, Animal Crossing, and Mario Kart 8. Includes pro controller and carrying case.",
    category: "Gaming",
    askingPrice: 350,
    minPrice: 270,
    condition: "Excellent",
    location: "San Jose, CA",
    sellerName: "Mia",
    sellerPersonality: "College student clearing out. Friendly and chatty. Will consider creative trade offers. Responds well to humor.",
    imageEmoji: "🎮",
    status: "active",
  },
  {
    title: "Le Creuset 5.5 Qt Dutch Oven - Flame",
    description:
      "Iconic orange/flame color. Used about 20 times. Enamel interior in great shape, no chips or cracks. Knob replaced with stainless steel.",
    category: "Kitchen",
    askingPrice: 200,
    minPrice: 150,
    condition: "Very Good",
    location: "Menlo Park, CA",
    sellerName: "Chef Diana",
    sellerPersonality: "Home cooking enthusiast. Will gush about recipes you can make with it. Wants it to go to someone who will use it, not just resell.",
    imageEmoji: "🍳",
    status: "active",
  },
  {
    title: "Pair of Sonos One Speakers - Black",
    description:
      "Two Sonos One (Gen 2) speakers, perfect for stereo pair. Both work flawlessly with AirPlay 2 and Alexa. Factory reset and ready to go.",
    category: "Electronics",
    askingPrice: 250,
    minPrice: 180,
    condition: "Excellent",
    location: "Redwood City, CA",
    sellerName: "DJ Kev",
    sellerPersonality: "Audiophile upgrading to Sonos Era. Passionate about sound quality. Will demo the speakers if buyer comes to pick up.",
    imageEmoji: "🔊",
    status: "active",
  },
];

// Initialize seed data
seedListings.forEach((listing) => {
  const id = uuidv4();
  listings.set(id, {
    ...listing,
    id,
    createdAt: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });
});

export function getAllListings(): Listing[] {
  return Array.from(listings.values())
    .filter((l) => l.status === "active")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getListing(id: string): Listing | undefined {
  return listings.get(id);
}

export function addListing(listing: Listing): void {
  listings.set(listing.id, listing);
}

export function updateListing(id: string, updates: Partial<Listing>): void {
  const listing = listings.get(id);
  if (listing) {
    listings.set(id, { ...listing, ...updates });
  }
}

export function getNegotiation(id: string): Negotiation | undefined {
  return negotiations.get(id);
}

export function addNegotiation(negotiation: Negotiation): void {
  negotiations.set(negotiation.id, negotiation);
}

export function updateNegotiation(
  id: string,
  updates: Partial<Negotiation>
): void {
  const negotiation = negotiations.get(id);
  if (negotiation) {
    negotiations.set(id, { ...negotiation, ...updates });
  }
}

export function addNegotiationMessage(
  id: string,
  message: Negotiation["messages"][0]
): void {
  const negotiation = negotiations.get(id);
  if (negotiation) {
    negotiation.messages.push(message);
  }
}
