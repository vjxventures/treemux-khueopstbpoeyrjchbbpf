import { NextResponse } from 'next/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAllDocuments, addCollection, addDocumentToCollection, getAllCollections } from '@/lib/store';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_ALPHA,
});

export async function POST() {
  try {
    const documents = getAllDocuments();

    if (documents.length === 0) {
      return NextResponse.json({ error: 'No documents to organize' }, { status: 400 });
    }

    const existingCollections = getAllCollections();

    const docSummaries = documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      tags: doc.tags,
      contentPreview: doc.content.slice(0, 500),
    }));

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: z.object({
        collections: z.array(z.object({
          name: z.string().describe('Short, descriptive collection name'),
          description: z.string().describe('Brief description of what this collection contains'),
          documentIds: z.array(z.string()).describe('IDs of documents that belong in this collection'),
        })),
      }),
      prompt: `You are organizing a knowledge base. Analyze these documents and group them into logical collections (2-5 collections). Each document should be in exactly one collection.

Existing collections: ${JSON.stringify(existingCollections.map(c => c.name))}

Documents:
${JSON.stringify(docSummaries, null, 2)}

Create meaningful collections that help the user navigate their knowledge base. Use clear, concise names.`,
    });

    const results = [];
    for (const col of object.collections) {
      const collection = addCollection(col.name, col.description);
      for (const docId of col.documentIds) {
        addDocumentToCollection(docId, collection.id);
      }
      results.push({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
        documentCount: col.documentIds.length,
      });
    }

    return NextResponse.json({ collections: results });
  } catch (error) {
    console.error('Organize error:', error);
    return NextResponse.json({ error: 'Organization failed' }, { status: 500 });
  }
}
