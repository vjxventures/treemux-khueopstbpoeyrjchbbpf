import { NextRequest, NextResponse } from 'next/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getDocument, getStore } from '@/lib/store';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_ALPHA,
});

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const doc = getDocument(documentId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.summary) {
      return NextResponse.json({ summary: doc.summary });
    }

    const contentPreview = doc.content.slice(0, 8000);

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: `Analyze the following document and provide a concise summary (2-4 sentences) that captures the key points and purpose of the document.

Document name: "${doc.name}"
Document content:
${contentPreview}

Provide ONLY the summary, no preamble or labels.`,
    });

    // Store the summary
    doc.summary = text;

    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error('Summarize error:', error);
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 });
  }
}
