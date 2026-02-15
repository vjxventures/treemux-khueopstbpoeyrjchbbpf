import { NextRequest, NextResponse } from "next/server";
import { createIncident } from "@/lib/incidents";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const scenarioIndex = body.scenarioIndex;
  const incident = createIncident(scenarioIndex);
  return NextResponse.json(incident, { status: 201 });
}
