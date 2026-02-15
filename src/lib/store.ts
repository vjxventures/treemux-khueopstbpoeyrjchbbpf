import { v4 as uuidv4 } from 'uuid';
import { Document, Collection, ChatMessage, KnowledgeStore } from './types';

// Global in-memory store (persists across API calls within same server session)
const store: KnowledgeStore = {
  documents: new Map(),
  collections: new Map(),
  chatHistory: [],
};

// Color palette for auto-generated collections
const COLLECTION_COLORS = [
  '#d4a574', '#7c9eb2', '#b5838d', '#6d9775', '#c9a96e',
  '#8b7eb8', '#cb8f6e', '#6b9e9e', '#b87d8e', '#8fa86e',
];

export function getStore(): KnowledgeStore {
  return store;
}

export function addDocument(doc: Omit<Document, 'id' | 'uploadedAt'>): Document {
  const document: Document = {
    ...doc,
    id: uuidv4(),
    uploadedAt: new Date(),
  };
  store.documents.set(document.id, document);
  return document;
}

export function getDocument(id: string): Document | undefined {
  return store.documents.get(id);
}

export function getAllDocuments(): Document[] {
  return Array.from(store.documents.values()).sort(
    (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
  );
}

export function deleteDocument(id: string): boolean {
  const doc = store.documents.get(id);
  if (!doc) return false;
  // Remove from collections
  store.collections.forEach((col) => {
    col.documentIds = col.documentIds.filter((did) => did !== id);
  });
  store.documents.delete(id);
  return true;
}

export function addCollection(name: string, description: string): Collection {
  const collection: Collection = {
    id: uuidv4(),
    name,
    description,
    color: COLLECTION_COLORS[store.collections.size % COLLECTION_COLORS.length],
    documentIds: [],
    createdAt: new Date(),
  };
  store.collections.set(collection.id, collection);
  return collection;
}

export function getAllCollections(): Collection[] {
  return Array.from(store.collections.values());
}

export function addDocumentToCollection(docId: string, collectionId: string): void {
  const collection = store.collections.get(collectionId);
  if (collection && !collection.documentIds.includes(docId)) {
    collection.documentIds.push(docId);
    const doc = store.documents.get(docId);
    if (doc) doc.collection = collectionId;
  }
}

export function addChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
  const msg: ChatMessage = {
    ...message,
    id: uuidv4(),
    timestamp: new Date(),
  };
  store.chatHistory.push(msg);
  return msg;
}

export function getChatHistory(): ChatMessage[] {
  return store.chatHistory;
}

export function clearChatHistory(): void {
  store.chatHistory = [];
}

// Simple cosine similarity for vector search
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find similar documents based on embedding
export function findSimilarDocuments(queryEmbedding: number[], topK: number = 5): { document: Document; similarity: number }[] {
  const results: { document: Document; similarity: number }[] = [];
  store.documents.forEach((doc) => {
    if (doc.embedding) {
      const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({ document: doc, similarity });
    }
  });
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
