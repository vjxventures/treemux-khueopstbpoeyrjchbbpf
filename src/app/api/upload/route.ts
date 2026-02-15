import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { addDocument } from '@/lib/store';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    return await file.text();
  }

  if (name.endsWith('.json')) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  }

  if (name.endsWith('.pdf')) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const data = await pdfParse(buffer);
      return data.text;
    } catch (e) {
      console.error('PDF parse error:', e);
      return `[PDF file: ${file.name} - text extraction failed]`;
    }
  }

  if (name.endsWith('.docx')) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (e) {
      console.error('DOCX parse error:', e);
      return `[DOCX file: ${file.name} - text extraction failed]`;
    }
  }

  // Fallback: try to read as text
  try {
    return await file.text();
  } catch {
    return `[Binary file: ${file.name}]`;
  }
}

function extractTags(content: string, fileName: string): string[] {
  const tags: string[] = [];

  // File extension as tag
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext) tags.push(ext);

  // Simple keyword extraction: find most frequent meaningful words
  const words = content.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4);

  const freq = new Map<string, number>();
  const stopWords = new Set(['about', 'above', 'after', 'again', 'against', 'these', 'those', 'their', 'there', 'other', 'which', 'would', 'could', 'should', 'being', 'doing', 'having', 'where', 'while', 'before', 'between', 'through', 'during', 'under']);

  for (const word of words) {
    if (!stopWords.has(word)) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }

  const topWords = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  tags.push(...topWords);
  return [...new Set(tags)].slice(0, 6);
}

async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate to ~8000 tokens worth of text (~32000 chars)
  const truncated = text.slice(0, 32000);
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: truncated,
    });
    return response.data[0].embedding;
  } catch (e) {
    console.error('Embedding generation failed:', e);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const content = await extractText(file);
      const tags = extractTags(content, file.name);
      const embedding = await generateEmbedding(content);

      const doc = addDocument({
        name: file.name,
        type: file.type || 'text/plain',
        size: file.size,
        content,
        tags,
        collection: null,
        summary: null,
        embedding: embedding.length > 0 ? embedding : null,
      });

      results.push({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        tags: doc.tags,
        uploadedAt: doc.uploadedAt,
        contentLength: doc.content.length,
        hasEmbedding: !!doc.embedding,
      });
    }

    return NextResponse.json({ documents: results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
