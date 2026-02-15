import { NextRequest } from "next/server";
import { getIncident, seedIncidents } from "@/lib/incidents";
import { createInvestigationStream } from "@/lib/agent";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  seedIncidents();
  const { id } = await params;
  const incident = getIncident(id);

  if (!incident) {
    return new Response(JSON.stringify({ error: "Incident not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { message } = body;

  if (!message) {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = createInvestigationStream(incident, message);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text-delta", text: part.text })}\n\n`)
            );
          } else if (part.type === "tool-call") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool-call",
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.input,
                })}\n\n`
              )
            );
          } else if (part.type === "tool-result") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool-result",
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  result: part.output,
                })}\n\n`
              )
            );
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
