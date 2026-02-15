import { NextRequest, NextResponse } from 'next/server';
import { getAllDocuments, deleteDocument, getAllCollections } from '@/lib/store';

export async function GET() {
  const documents = getAllDocuments().map((doc) => ({
    id: doc.id,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    tags: doc.tags,
    collection: doc.collection,
    summary: doc.summary,
    uploadedAt: doc.uploadedAt,
    contentPreview: doc.content.slice(0, 200),
    hasEmbedding: !!doc.embedding,
  }));

  const collections = getAllCollections().map((col) => ({
    id: col.id,
    name: col.name,
    description: col.description,
    color: col.color,
    documentCount: col.documentIds.length,
    createdAt: col.createdAt,
  }));

  return NextResponse.json({ documents, collections });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
  }

  const deleted = deleteDocument(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
