import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SCHEDULING_TOOLS, executeToolAction } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { getUserContext } from "@/lib/ai/context";
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from "@/lib/constants";

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const anthropic = getAnthropicClient();
    const serviceClient = getServiceClient();

    // Get user context for system prompt
    const { user, blocks, solAtRisk } = await getUserContext(
      serviceClient,
      authUser.id
    );
    const systemPrompt = buildSystemPrompt(user, blocks, solAtRisk);

    // Multi-turn tool use loop
    let currentMessages = [...messages];
    const allResponses: Array<{ role: string; content: unknown }> = [];
    let maxIterations = 5; // Prevent infinite loops

    while (maxIterations > 0) {
      maxIterations--;

      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        system: systemPrompt,
        tools: SCHEDULING_TOOLS,
        messages: currentMessages,
      });

      // Process content blocks
      const textBlocks: string[] = [];
      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const block of response.content) {
        if (block.type === "text") {
          textBlocks.push(block.text);
        }
        if (block.type === "tool_use") {
          // Execute the tool
          const result = await executeToolAction(
            block.name,
            block.input as Record<string, unknown>,
            authUser.id,
            serviceClient
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // Store the assistant's response
      allResponses.push({
        role: "assistant",
        content: response.content,
      });

      // If there are tool results, send them back for the next turn
      if (toolResults.length > 0) {
        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ];
        // Continue the loop to get Claude's follow-up
        continue;
      }

      // No more tools — we're done
      break;
    }

    // Persist messages to chat_messages table
    const lastResponse = allResponses[allResponses.length - 1];
    if (lastResponse) {
      // Save the user's latest message
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg) {
        await serviceClient.from("chat_messages").insert({
          user_id: authUser.id,
          role: "user",
          content: lastUserMsg.content,
        });
      }

      // Save the assistant's response
      await serviceClient.from("chat_messages").insert({
        user_id: authUser.id,
        role: "assistant",
        content: lastResponse.content,
      });
    }

    return NextResponse.json({
      responses: allResponses,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
