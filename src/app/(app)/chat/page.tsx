"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { QuickChips } from "@/components/chat/QuickChips";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolActions?: Array<{
    name: string;
    result: { success: boolean; data?: unknown; error?: string };
  }>;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(text: string) {
    // Add user message to display
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);

    // Build conversation for API
    const newHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: "user", content: text },
    ];
    setConversationHistory(newHistory);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();
      const { responses } = data;

      // Process all responses
      for (const resp of responses) {
        const contentBlocks = Array.isArray(resp.content)
          ? resp.content
          : [{ type: "text", text: resp.content }];

        // Extract text and tool actions
        const textParts: string[] = [];
        const toolActions: Message["toolActions"] = [];

        for (const block of contentBlocks) {
          if (block.type === "text" && block.text) {
            textParts.push(block.text);
          }
          if (block.type === "tool_use") {
            toolActions.push({
              name: block.name,
              result: { success: true, data: block.input },
            });
          }
        }

        if (textParts.length > 0 || toolActions.length > 0) {
          const assistantMessage: Message = {
            role: "assistant",
            content: textParts.join("\n\n") || "Action completed.",
            toolActions: toolActions.length > 0 ? toolActions : undefined,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }

      // Update conversation history with the final assistant response
      const lastResp = responses[responses.length - 1];
      if (lastResp) {
        setConversationHistory((prev) => [
          ...prev,
          { role: "assistant", content: lastResp.content },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h1
          className="text-lg font-bold text-foreground"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          <span className="text-emerald">Jarvis</span>
          <span className="ml-2 text-xs font-normal text-muted">
            AI Command Center
          </span>
        </h1>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
              <span className="text-2xl font-bold text-emerald">J</span>
            </div>
            <p className="text-sm text-foreground">
              What do you need, CloudKing?
            </p>
            <p className="mt-1 text-xs text-muted">
              Schedule tasks, plan your day, or ask me anything.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            toolActions={msg.toolActions}
          />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald/20 text-xs font-bold text-emerald">
              J
            </div>
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3">
              <div className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:0ms]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Quick chips + Input */}
      <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
        {messages.length === 0 && (
          <QuickChips onSelect={sendMessage} disabled={loading} />
        )}
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  );
}
