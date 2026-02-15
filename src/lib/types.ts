export interface Document {
  id: string;
  name: string;
  type: string; // mime type
  size: number;
  content: string; // extracted text content
  uploadedAt: Date;
  tags: string[];
  collection: string | null;
  summary: string | null;
  embedding: number[] | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  documentIds: string[];
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: DocumentReference[];
}

export interface DocumentReference {
  documentId: string;
  documentName: string;
  relevance: number;
  excerpt: string;
}

export interface KnowledgeStore {
  documents: Map<string, Document>;
  collections: Map<string, Collection>;
  chatHistory: ChatMessage[];
}
