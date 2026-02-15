import { NextRequest } from 'next/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText, embed } from 'ai';
import { getAllDocuments, findSimilarDocuments, getChatHistory, addChatMessage } from '@/lib/store';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_ALPHA,
});

export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  const userMessage = messages[messages.length - 1]?.content || '';

  // Store user message
  addChatMessage({ role: 'user', content: userMessage });

  // Get all documents for context
  const allDocs = getAllDocuments();

  // Try semantic search if we have embeddings
  let relevantDocs: { name: string; content: string; id: string; similarity: number }[] = [];

  if (allDocs.some(d => d.embedding)) {
    try {
      const { embedding: queryEmbedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: userMessage,
      });

      const similar = findSimilarDocuments(queryEmbedding, 5);
      relevantDocs = similar.map(({ document, similarity }) => ({
        name: document.name,
        content: document.content.slice(0, 6000),
        id: document.id,
        similarity,
      }));
    } catch (e) {
      console.error('Embedding search failed:', e);
    }
  }

  // Fallback: if no embedding results, use all docs (truncated)
  if (relevantDocs.length === 0 && allDocs.length > 0) {
    relevantDocs = allDocs.slice(0, 5).map(doc => ({
      name: doc.name,
      content: doc.content.slice(0, 4000),
      id: doc.id,
      similarity: 1.0,
    }));
  }

  // Build context from relevant documents
  const docContext = relevantDocs.length > 0
    ? relevantDocs.map((doc, i) =>
        `--- Document ${i + 1}: "${doc.name}" (relevance: ${(doc.similarity * 100).toFixed(0)}%) ---\n${doc.content}`
      ).join('\n\n')
    : 'No documents uploaded yet.';

  // Get recent chat history for context
  const recentHistory = getChatHistory().slice(-10);

  const systemPrompt = `You are Nexus, an AI knowledge assistant that helps users understand and work with their document library. You are sharp, insightful, and precise.

Your capabilities:
- Answer questions about uploaded documents with specific citations
- Summarize documents and extract key insights
- Compare and contrast information across multiple documents
- Identify themes, patterns, and connections between documents
- Help users organize and understand their knowledge base

Guidelines:
- Always cite which document(s) your information comes from using the document name
- Be specific and quote relevant passages when possible
- If you don't have enough information to answer, say so clearly
- Use markdown formatting for readability
- Be concise but thorough

The user currently has ${allDocs.length} document(s) in their knowledge base.

${relevantDocs.length > 0 ? `Here are the most relevant documents for the current query:\n\n${docContext}` : 'The user has not uploaded any documents yet. Encourage them to upload documents so you can help them explore their knowledge base.'}`;

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  return result.toUIMessageStreamResponse();
}
