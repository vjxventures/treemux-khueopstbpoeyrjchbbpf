import { NextResponse } from "next/server";
import { getAllIncidents, seedIncidents } from "@/lib/incidents";

export async function GET() {
  seedIncidents();
  const incidents = getAllIncidents();
  return NextResponse.json(incidents);
}
