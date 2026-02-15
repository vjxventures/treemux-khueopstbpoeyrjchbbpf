"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  Loader2,
  Wrench,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "result";
  result?: unknown;
}

interface StreamMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolInvocations?: ToolInvocation[];
}

const toolDisplayNames: Record<string, string> = {
  analyzeLogPatterns: "Analyzing Log Patterns",
  checkServiceHealth: "Checking Service Health",
  queryMetrics: "Querying Metrics",
  checkRecentDeployments: "Checking Deployments",
  executeRemediation: "Executing Remediation",
  correlateIncidents: "Correlating Past Incidents",
};

function ToolCallDisplay({ invocation }: { invocation: ToolInvocation }) {
  const [expanded, setExpanded] = useState(false);
  const displayName = toolDisplayNames[invocation.toolName] || invocation.toolName;
  const isComplete = invocation.state === "result";

  return (
    <div className="my-2 rounded-lg border border-border/50 bg-surface-0/80 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-1 transition-colors"
      >
        {isComplete ? (
          <Wrench className="w-3.5 h-3.5 text-primary shrink-0" />
        ) : (
          <Loader2 className="w-3.5 h-3.5 text-info animate-spin shrink-0" />
        )}
        <span className="text-xs font-mono text-foreground/80 flex-1">
          {displayName}
        </span>
        {isComplete && (
          expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )
        )}
      </button>
      {expanded && invocation.result != null ? (
        <div className="px-3 pb-2 border-t border-border/30">
          <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto mt-2 leading-relaxed max-h-[200px] overflow-y-auto">
            {JSON.stringify(invocation.result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\n)/);
  const elements: React.ReactNode[] = [];
  let i = 0;

  for (const part of parts) {
    if (part === "\n") {
      elements.push(<br key={`br-${i}`} />);
    } else if (part.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="text-sm font-display font-bold text-foreground mt-3 mb-1">
          {part.slice(2)}
        </h2>
      );
    } else if (part.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-xs font-display font-semibold text-foreground/90 mt-2 mb-1">
          {part.slice(3)}
        </h3>
      );
    } else if (part.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="text-xs font-display font-medium text-muted-foreground mt-2 mb-1">
          {part.slice(4)}
        </h4>
      );
    } else if (part.startsWith("- ") || part.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-primary/60 shrink-0">-</span>
          <span>{renderInlineFormatting(part.slice(2))}</span>
        </div>
      );
    } else if (part.match(/^\d+\. /)) {
      const dotIndex = part.indexOf(". ");
      elements.push(
        <div key={i} className="flex gap-2 ml-2">
          <span className="text-primary/60 shrink-0 tabular-nums">{part.slice(0, dotIndex + 1)}</span>
          <span>{renderInlineFormatting(part.slice(dotIndex + 2))}</span>
        </div>
      );
    } else if (part.startsWith("> ")) {
      elements.push(
        <div key={i} className="border-l-2 border-primary/40 pl-3 ml-1 text-muted-foreground italic">
          {part.slice(2)}
        </div>
      );
    } else if (part.trim()) {
      elements.push(<span key={i}>{renderInlineFormatting(part)}</span>);
    }
    i++;
  }

  return <div className="agent-markdown text-sm leading-relaxed">{elements}</div>;
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((cp, j) => {
      if (cp.startsWith("`") && cp.endsWith("`")) {
        return (
          <code
            key={`${i}-${j}`}
            className="font-mono text-[11px] bg-surface-2 text-primary px-1 py-0.5 rounded"
          >
            {cp.slice(1, -1)}
          </code>
        );
      }
      return cp;
    });
  });
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <Bot className="w-3.5 h-3.5 text-primary mr-1" />
      <div className="flex gap-1">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/60" />
      </div>
    </div>
  );
}

async function processSSEStream(
  response: Response,
  msgId: string,
  setMessages: React.Dispatch<React.SetStateAction<StreamMessage[]>>
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let accumulatedText = "";
  let currentToolCalls: ToolInvocation[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      try {
        const data = JSON.parse(trimmed.slice(6));

        if (data.type === "text-delta") {
          accumulatedText += data.text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, content: accumulatedText } : m
            )
          );
        } else if (data.type === "tool-call") {
          const toolInvocation: ToolInvocation = {
            toolCallId: data.toolCallId,
            toolName: data.toolName,
            args: data.args || {},
            state: "call",
          };
          currentToolCalls = [...currentToolCalls, toolInvocation];
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, toolInvocations: [...currentToolCalls] }
                : m
            )
          );
        } else if (data.type === "tool-result") {
          currentToolCalls = currentToolCalls.map((tc) =>
            tc.toolCallId === data.toolCallId
              ? { ...tc, state: "result" as const, result: data.result }
              : tc
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, toolInvocations: [...currentToolCalls] }
                : m
            )
          );
        }
      } catch {
        // Ignore parse errors from partial chunks
      }
    }
  }
}

export function AgentChat({
  incidentId,
  onInvestigate,
}: {
  incidentId: string;
  onInvestigate: () => void;
}) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const startInvestigation = async () => {
    setHasStarted(true);
    setIsLoading(true);
    onInvestigate();

    const msgId = `msg-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: msgId, role: "assistant", content: "", toolInvocations: [] },
    ]);

    try {
      const response = await fetch(`/api/incidents/${incidentId}/investigate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to start investigation");
      await processSSEStream(response, msgId, setMessages);
    } catch (error) {
      console.error("Investigation error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Investigation encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      // Refresh incident data after investigation
      setTimeout(onInvestigate, 1000);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: userMessage },
    ]);

    const msgId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: msgId, role: "assistant", content: "", toolInvocations: [] },
    ]);

    try {
      const response = await fetch(`/api/incidents/${incidentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      if (!response.ok) throw new Error("Chat failed");
      await processSSEStream(response, msgId, setMessages);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
      setTimeout(onInvestigate, 1000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-surface-0/50 flex items-center gap-2">
        <div className="relative">
          <Bot className="w-4 h-4 text-primary" />
          {isLoading && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary status-pulse" />
          )}
        </div>
        <span className="text-xs font-display font-semibold text-foreground">
          Sentinel Agent
        </span>
        {isLoading && (
          <span className="text-[10px] font-mono text-primary/70 ml-auto">
            analyzing...
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasStarted && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-display font-medium text-foreground mb-1">
                Ready to Investigate
              </p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Sentinel will autonomously analyze logs, metrics, and service
                dependencies to diagnose this incident.
              </p>
            </div>
            <button
              onClick={startInvestigation}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold hover:bg-primary-dim transition-colors glow-green"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" />
                Start Investigation
              </div>
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "fade-in",
              msg.role === "user" ? "flex justify-end" : ""
            )}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                <p className="text-sm text-foreground">{msg.content}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {msg.toolInvocations?.map((invocation) => (
                  <ToolCallDisplay
                    key={invocation.toolCallId}
                    invocation={invocation}
                  />
                ))}
                {msg.content && <MessageContent content={msg.content} />}
              </div>
            )}
          </div>
        ))}

        {isLoading && (messages.length === 0 || messages[messages.length - 1]?.content === "") && !messages[messages.length - 1]?.toolInvocations?.length && (
          <TypingIndicator />
        )}
      </div>

      {/* Input */}
      {hasStarted && (
        <div className="p-3 border-t border-border/50 bg-surface-0/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask about this incident..."
              className="flex-1 bg-surface-1 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all font-sans"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                input.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary-dim"
                  : "bg-surface-2 text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
