import { NextRequest, NextResponse } from "next/server";
import { getIncident, seedIncidents } from "@/lib/incidents";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  seedIncidents();
  const { id } = await params;
  const incident = getIncident(id);
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }
  return NextResponse.json(incident);
}
