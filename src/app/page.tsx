"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  Upload,
  MessageSquare,
  FileText,
  Sparkles,
  FolderOpen,
  Send,
  Trash2,
  Bot,
  User,
  Plus,
  Layers,
  Search,
  X,
  ChevronRight,
  Zap,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  tags: string[];
  collection: string | null;
  summary: string | null;
  uploadedAt: string;
  contentPreview: string;
  hasEmbedding: boolean;
}

interface CollectionInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  documentCount: number;
}

type ActiveView = "chat" | "documents";

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export default function Home() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("chat");
  const [uploading, setUploading] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat();

  const isLoading = status === "submitted" || status === "streaming";

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
      setCollections(data.collections || []);
    } catch (e) {
      console.error("Failed to fetch documents:", e);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      await fetchDocuments();
      if (selectedDoc === id) setSelectedDoc(null);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleSummarize = async (id: string) => {
    setSummarizing(id);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (e) {
      console.error("Summarize failed:", e);
    } finally {
      setSummarizing(null);
    }
  };

  const handleOrganize = async () => {
    setOrganizing(true);
    try {
      const res = await fetch("/api/organize", { method: "POST" });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (e) {
      console.error("Organize failed:", e);
    } finally {
      setOrganizing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) {
        handleUpload(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredDocs = documents.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText className="w-4 h-4 text-red-400" />;
      case "md":
        return <BookOpen className="w-4 h-4 text-blue-400" />;
      case "json":
        return <Zap className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileText className="w-4 h-4 text-[var(--color-amber)]" />;
    }
  };

  const selectedDocument = documents.find((d) => d.id === selectedDoc);

  return (
    <div
      className="h-screen flex flex-col noise-bg gradient-mesh overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="border-2 border-dashed border-[var(--color-amber)] rounded-2xl p-16 text-center animate-fade-in">
            <Upload className="w-16 h-16 text-[var(--color-amber)] mx-auto mb-4" />
            <p className="text-2xl font-[family-name:var(--font-serif)] text-[var(--color-amber)]">
              Drop files to add to your knowledge base
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              PDF, TXT, MD, DOCX, JSON, CSV supported
            </p>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-md bg-background/50 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-amber)]/20 flex items-center justify-center">
            <Layers className="w-4 h-4 text-[var(--color-amber)]" />
          </div>
          <h1 className="text-xl font-[family-name:var(--font-serif)] tracking-tight">
            Nexus
          </h1>
          <span className="text-xs text-muted-foreground font-mono tracking-widest uppercase">
            Knowledge OS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-secondary/50 rounded-lg p-0.5">
            <button
              onClick={() => setActiveView("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === "chat"
                  ? "bg-[var(--color-amber)]/20 text-[var(--color-amber)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveView("documents")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeView === "documents"
                  ? "bg-[var(--color-amber)]/20 text-[var(--color-amber)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Library
              {documents.length > 0 && (
                <span className="ml-1 text-[10px] bg-[var(--color-amber)]/20 text-[var(--color-amber)] px-1.5 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Button
            variant="outline"
            size="sm"
            className="text-xs border-border/50 hover:border-[var(--color-amber)]/50 hover:text-[var(--color-amber)]"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf,.json,.csv,.docx"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 border-r border-border/50 flex flex-col bg-card/30">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/50 border border-border/50 rounded-lg pl-8 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-[var(--color-amber)]/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2.5"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {collections.length > 0 && (
            <div className="px-3 pb-2">
              <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1.5 px-1">
                Collections
              </p>
              <div className="flex flex-wrap gap-1">
                {collections.map((col) => (
                  <Badge
                    key={col.id}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-secondary/50 transition-colors"
                    style={{ borderColor: col.color + "40", color: col.color }}
                  >
                    {col.name}
                    <span className="ml-1 opacity-50">{col.documentCount}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator className="opacity-50" />

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? "No matching documents" : "No documents yet"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {searchQuery
                      ? "Try a different search"
                      : "Upload files to get started"}
                  </p>
                </div>
              ) : (
                filteredDocs.map((doc, i) => (
                  <button
                    key={doc.id}
                    onClick={() =>
                      setSelectedDoc(selectedDoc === doc.id ? null : doc.id)
                    }
                    className={`w-full text-left p-2.5 rounded-lg transition-all group animate-fade-in ${
                      selectedDoc === doc.id
                        ? "bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/20"
                        : "hover:bg-secondary/50 border border-transparent"
                    }`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="flex items-start gap-2">
                      {getFileIcon(doc.name)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatSize(doc.size)} &middot;{" "}
                          {formatDate(doc.uploadedAt)}
                        </p>
                        {doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {doc.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] bg-secondary/80 text-muted-foreground px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                          className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {documents.length > 1 && (
            <div className="p-3 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-border/50 hover:border-[var(--color-amber)]/50 hover:text-[var(--color-amber)]"
                onClick={handleOrganize}
                disabled={organizing}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {organizing ? "Organizing..." : "Auto-Organize"}
              </Button>
            </div>
          )}
        </aside>

        <main className="flex-1 flex overflow-hidden">
          {activeView === "chat" ? (
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--color-amber)]/10 flex items-center justify-center mb-6 animate-fade-in-up">
                        <Bot className="w-8 h-8 text-[var(--color-amber)]" />
                      </div>
                      <h2
                        className="text-3xl font-[family-name:var(--font-serif)] mb-2 animate-fade-in-up"
                        style={{ animationDelay: "100ms" }}
                      >
                        Ask anything about your documents
                      </h2>
                      <p
                        className="text-sm text-muted-foreground text-center max-w-md animate-fade-in-up"
                        style={{ animationDelay: "200ms" }}
                      >
                        Upload files to your knowledge base, then ask questions.
                        Nexus will search across all your documents to find
                        answers.
                      </p>

                      {documents.length > 0 && (
                        <div
                          className="mt-8 flex flex-wrap gap-2 justify-center animate-fade-in-up"
                          style={{ animationDelay: "300ms" }}
                        >
                          {[
                            "Summarize all my documents",
                            "What are the key themes?",
                            "Find connections between docs",
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setInput(suggestion)}
                              className="px-4 py-2 rounded-full border border-border/50 text-xs text-muted-foreground hover:border-[var(--color-amber)]/50 hover:text-[var(--color-amber)] transition-all hover:bg-[var(--color-amber)]/5"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}

                      {documents.length === 0 && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-8 px-6 py-3 rounded-xl border-2 border-dashed border-border/50 text-sm text-muted-foreground hover:border-[var(--color-amber)]/50 hover:text-[var(--color-amber)] transition-all animate-fade-in-up flex items-center gap-2"
                          style={{ animationDelay: "300ms" }}
                        >
                          <Upload className="w-4 h-4" />
                          Upload your first document
                        </button>
                      )}
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const text = getMessageText(msg);
                      if (!text) return null;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 animate-fade-in-up ${
                            msg.role === "user" ? "justify-end" : ""
                          }`}
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-7 h-7 rounded-lg bg-[var(--color-amber)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Bot className="w-3.5 h-3.5 text-[var(--color-amber)]" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              msg.role === "user"
                                ? "bg-[var(--color-amber)]/15 text-foreground ml-auto rounded-br-md"
                                : "bg-card/80 border border-border/30 rounded-bl-md"
                            }`}
                          >
                            <div className="chat-prose whitespace-pre-wrap">
                              {text}
                            </div>
                          </div>
                          {msg.role === "user" && (
                            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {isLoading &&
                    messages.length > 0 &&
                    messages[messages.length - 1]?.role === "user" && (
                      <div className="flex gap-3 animate-fade-in">
                        <div className="w-7 h-7 rounded-lg bg-[var(--color-amber)]/15 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-[var(--color-amber)]" />
                        </div>
                        <div className="bg-card/80 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-amber)] typing-dot" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-amber)] typing-dot" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-amber)] typing-dot" />
                          </div>
                        </div>
                      </div>
                    )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-md">
                <form
                  onSubmit={handleSendMessage}
                  className="max-w-3xl mx-auto flex gap-2 items-end"
                >
                  <div className="flex-1 relative">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        documents.length > 0
                          ? "Ask about your documents..."
                          : "Upload documents first, then ask questions..."
                      }
                      className="min-h-[44px] max-h-[120px] resize-none bg-secondary/50 border-border/50 rounded-xl text-sm pr-10 focus:border-[var(--color-amber)]/50 placeholder:text-muted-foreground/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || isLoading}
                    className="bg-[var(--color-amber)] hover:bg-[var(--color-amber-light)] text-background rounded-xl h-[44px] w-[44px] p-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <div className="max-w-3xl mx-auto mt-2 flex items-center justify-center gap-2">
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {documents.length} docs indexed
                  </span>
                  <span className="text-[10px] text-muted-foreground/30">
                    &middot;
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    powered by claude
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-[family-name:var(--font-serif)]">
                        Knowledge Library
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {documents.length} document
                        {documents.length !== 1 ? "s" : ""} in your knowledge
                        base
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {documents.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={handleOrganize}
                          disabled={organizing}
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          {organizing ? "Organizing..." : "Auto-Organize"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="text-xs bg-[var(--color-amber)] hover:bg-[var(--color-amber-light)] text-background"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        {uploading ? "Uploading..." : "Upload Files"}
                      </Button>
                    </div>
                  </div>

                  {collections.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
                        Collections
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {collections.map((col, i) => (
                          <div
                            key={col.id}
                            className="p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all cursor-pointer animate-fade-in-up"
                            style={{
                              animationDelay: `${i * 50}ms`,
                              borderLeftColor: col.color,
                              borderLeftWidth: "3px",
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <FolderOpen
                                className="w-4 h-4"
                                style={{ color: col.color }}
                              />
                              <span className="text-sm font-medium">
                                {col.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2">
                              {col.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">
                              {col.documentCount} doc
                              {col.documentCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mb-6">
                        <Upload className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <h3 className="text-lg font-[family-name:var(--font-serif)] mb-2">
                        Your knowledge base is empty
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm">
                        Drag and drop files here or click upload to add
                        documents. Nexus supports PDF, TXT, Markdown, DOCX,
                        JSON, and CSV.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
                        All Documents
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredDocs.map((doc, i) => (
                          <div
                            key={doc.id}
                            className="p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all group animate-fade-in-up"
                            style={{ animationDelay: `${i * 40}ms` }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-secondary/80 flex items-center justify-center flex-shrink-0">
                                  {getFileIcon(doc.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">
                                    {doc.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                    {formatSize(doc.size)} &middot;{" "}
                                    {formatDate(doc.uploadedAt)}
                                    {doc.hasEmbedding && (
                                      <span className="ml-2 text-[var(--color-amber)]">
                                        &bull; indexed
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleSummarize(doc.id)}
                                  disabled={summarizing === doc.id}
                                  className="p-1.5 rounded-lg hover:bg-[var(--color-amber)]/10 text-muted-foreground hover:text-[var(--color-amber)] transition-colors"
                                  title="Generate summary"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setInput(
                                      `Tell me about the document "${doc.name}"`
                                    );
                                    setActiveView("chat");
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-[var(--color-amber)]/10 text-muted-foreground hover:text-[var(--color-amber)] transition-colors"
                                  title="Ask about this document"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(doc.id)}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Delete document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {doc.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[9px] py-0 border-border/50"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {doc.summary && (
                              <div className="mt-3 p-3 rounded-lg bg-[var(--color-amber)]/5 border border-[var(--color-amber)]/10">
                                <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--color-amber)] mb-1">
                                  AI Summary
                                </p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {doc.summary}
                                </p>
                              </div>
                            )}

                            {summarizing === doc.id && (
                              <div className="mt-3 animate-shimmer rounded-lg h-16" />
                            )}

                            {doc.contentPreview && !doc.summary && (
                              <p className="text-[11px] text-muted-foreground/60 mt-3 line-clamp-2 leading-relaxed">
                                {doc.contentPreview}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedDocument && (
                <div className="w-80 border-l border-border/50 bg-card/30 p-4 overflow-auto animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium truncate flex-1">
                      {selectedDocument.name}
                    </h3>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                        Details
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Size: {formatSize(selectedDocument.size)}</p>
                        <p>Type: {selectedDocument.type}</p>
                        <p>
                          Uploaded: {formatDate(selectedDocument.uploadedAt)}
                        </p>
                        <p>
                          Indexed:{" "}
                          {selectedDocument.hasEmbedding ? (
                            <span className="text-[var(--color-amber)]">
                              Yes
                            </span>
                          ) : (
                            "No"
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedDocument.tags.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedDocument.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[9px] py-0"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDocument.summary && (
                      <div>
                        <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                          Summary
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {selectedDocument.summary}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1">
                        Preview
                      </p>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">
                        {selectedDocument.contentPreview}...
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleSummarize(selectedDocument.id)}
                        disabled={summarizing === selectedDocument.id}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {summarizing === selectedDocument.id
                          ? "..."
                          : selectedDocument.summary
                            ? "Re-summarize"
                            : "Summarize"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          setInput(
                            `Tell me about "${selectedDocument.name}"`
                          );
                          setActiveView("chat");
                        }}
                      >
                        <ChevronRight className="w-3 h-3 mr-1" />
                        Ask AI
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
