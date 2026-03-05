"use client";

function formatToolData(result: { success: boolean; data?: unknown; error?: string }): string {
  if (result.error) return `: ${result.error}`;
  if (result.data && typeof result.data === "object" && result.data !== null) {
    const d = result.data as Record<string, unknown>;
    if ("title" in d) return `: ${String(d.title)}`;
  }
  return "";
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  toolActions?: Array<{
    name: string;
    result: { success: boolean; data?: unknown; error?: string };
  }>;
}

export function ChatMessage({ role, content, toolActions }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isUser ? "bg-violet/20 text-violet-light" : "bg-emerald/20 text-emerald"
        }`}
      >
        {isUser ? "CK" : "J"}
      </div>

      {/* Message */}
      <div className={`max-w-[80%] space-y-2 ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-md bg-violet/15 text-foreground"
              : "rounded-bl-md bg-surface text-foreground"
          }`}
        >
          {content}
        </div>

        {/* Tool action confirmations */}
        {toolActions &&
          toolActions.map((action, i) => (
            <div
              key={i}
              className={`inline-block rounded-lg border px-3 py-2 text-xs ${
                action.result.success
                  ? "border-emerald/30 bg-emerald/10 text-emerald"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {action.result.success ? "✓" : "✗"}{" "}
              {action.name.replace(/_/g, " ")}
              {formatToolData(action.result)}
            </div>
          ))}
      </div>
    </div>
  );
}
