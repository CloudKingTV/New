import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BLOCK_BUFFER_MINUTES, WORKING_HOURS, PRIORITY_ORDER } from "@/lib/constants";

// Claude API tool definitions
export const SCHEDULING_TOOLS: Tool[] = [
  {
    name: "schedule_block",
    description:
      "Create a new block on CloudKing's calendar. Always check for conflicts with existing blocks first.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Block title" },
        type: {
          type: "string",
          enum: ["task", "event", "call", "reminder", "meeting"],
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
        },
        start_time: { type: "string", description: "ISO8601 datetime" },
        end_time: { type: "string", description: "ISO8601 datetime" },
        description: { type: "string", description: "Task description or notes" },
        ai_executable: {
          type: "boolean",
          description: "Whether AI can execute this task autonomously",
        },
        suggested_stake: {
          type: "number",
          description: "Suggested SOL stake amount. Use 0 for no stake.",
        },
      },
      required: ["title", "type", "priority", "start_time", "end_time"],
    },
  },
  {
    name: "reschedule_block",
    description:
      "Move an existing block to a new time. Always explain what moved and why in the conversational response.",
    input_schema: {
      type: "object" as const,
      properties: {
        block_id: { type: "string", description: "UUID of the block to move" },
        new_start_time: {
          type: "string",
          description: "New ISO8601 start time",
        },
        new_end_time: { type: "string", description: "New ISO8601 end time" },
        reason: {
          type: "string",
          description: "Why this block was rescheduled",
        },
      },
      required: ["block_id", "new_start_time", "new_end_time", "reason"],
    },
  },
  {
    name: "complete_block",
    description: "Mark a block as completed.",
    input_schema: {
      type: "object" as const,
      properties: {
        block_id: {
          type: "string",
          description: "UUID of the block to complete",
        },
      },
      required: ["block_id"],
    },
  },
  {
    name: "present_options",
    description:
      "Present 2-3 scheduling alternatives for the user to choose from.",
    input_schema: {
      type: "object" as const,
      properties: {
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "Short label like 'Option A: Morning slot'",
              },
              start_time: { type: "string" },
              end_time: { type: "string" },
              tradeoff: {
                type: "string",
                description: "What this option costs or moves",
              },
            },
            required: ["label", "start_time", "end_time", "tradeoff"],
          },
        },
      },
      required: ["options"],
    },
  },
];

// Tool execution handlers
export async function executeToolAction(
  toolName: string,
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  switch (toolName) {
    case "schedule_block":
      return handleScheduleBlock(input, userId, supabase);
    case "reschedule_block":
      return handleRescheduleBlock(input, userId, supabase);
    case "complete_block":
      return handleCompleteBlock(input, userId, supabase);
    case "present_options":
      return { success: true, data: input };
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

async function handleScheduleBlock(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
) {
  const startTime = new Date(input.start_time as string);
  const endTime = new Date(input.end_time as string);

  // Validate working hours
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();
  if (startHour < WORKING_HOURS.start || endHour > WORKING_HOURS.end) {
    return {
      success: false,
      error: `Cannot schedule outside working hours (${WORKING_HOURS.start}am–${WORKING_HOURS.end === 24 ? "midnight" : WORKING_HOURS.end + "pm"}). Ask user for permission to override.`,
    };
  }

  // Check for conflicts
  const conflicts = await findConflicts(
    supabase,
    userId,
    startTime,
    endTime,
    BLOCK_BUFFER_MINUTES
  );

  if (conflicts.length > 0) {
    const conflictNames = conflicts.map((c) => `"${c.title}" (${c.priority})`).join(", ");
    const newPriority = PRIORITY_ORDER[input.priority as keyof typeof PRIORITY_ORDER] || 2;
    const hasImmovable = conflicts.some((c) => c.gcal_event_id || c.type === "call" || c.type === "meeting");

    if (hasImmovable) {
      return {
        success: false,
        error: `Conflict with immovable block(s): ${conflictNames}. These cannot be moved. Suggest a different time.`,
      };
    }

    const allLowerPriority = conflicts.every(
      (c) => (PRIORITY_ORDER[c.priority as keyof typeof PRIORITY_ORDER] || 2) < newPriority
    );

    if (!allLowerPriority) {
      return {
        success: false,
        error: `Conflict with equal/higher priority block(s): ${conflictNames}. Use present_options to give alternatives, or reschedule_block to move the lower-priority ones.`,
      };
    }
  }

  // Insert the block
  const { data, error } = await supabase
    .from("blocks")
    .insert({
      user_id: userId,
      title: input.title,
      type: input.type,
      priority: input.priority,
      start_time: input.start_time,
      end_time: input.end_time,
      description: input.description || null,
      ai_executable: input.ai_executable || false,
      sol_stake_amount: input.suggested_stake || 0,
      scheduled_by: "ai",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification
  await supabase.from("jarvis_notifications").insert({
    user_id: userId,
    message: `Scheduled: ${input.title}`,
    type: "schedule",
    related_block_id: data.id,
  });

  return { success: true, data: { block_id: data.id, title: input.title } };
}

async function handleRescheduleBlock(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
) {
  const blockId = input.block_id as string;

  // Fetch the block
  const { data: block } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", blockId)
    .eq("user_id", userId)
    .single();

  if (!block) {
    return { success: false, error: "Block not found" };
  }

  // Cannot reschedule GCal-synced or call/meeting blocks
  if (block.gcal_event_id) {
    return {
      success: false,
      error: "Cannot reschedule GCal-synced event. It's an immovable external commitment.",
    };
  }

  // Log the reschedule
  await supabase.from("reschedule_log").insert({
    user_id: userId,
    block_id: blockId,
    old_start_time: block.start_time,
    new_start_time: input.new_start_time,
    reason: input.reason,
  });

  // Update the block
  const { error } = await supabase
    .from("blocks")
    .update({
      start_time: input.new_start_time,
      end_time: input.new_end_time,
      rescheduled_from: block.start_time,
      reschedule_reason: input.reason as string,
    })
    .eq("id", blockId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification
  await supabase.from("jarvis_notifications").insert({
    user_id: userId,
    message: `Rescheduled: ${block.title} — ${input.reason}`,
    type: "reschedule",
    related_block_id: blockId,
  });

  return { success: true, data: { block_id: blockId, title: block.title } };
}

async function handleCompleteBlock(
  input: Record<string, unknown>,
  userId: string,
  supabase: SupabaseClient
) {
  const blockId = input.block_id as string;

  const { data: block } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", blockId)
    .eq("user_id", userId)
    .single();

  if (!block) {
    return { success: false, error: "Block not found" };
  }

  const { error } = await supabase
    .from("blocks")
    .update({ status: "completed" })
    .eq("id", blockId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Create notification
  await supabase.from("jarvis_notifications").insert({
    user_id: userId,
    message: `Completed: ${block.title}`,
    type: "complete",
    related_block_id: blockId,
  });

  return { success: true, data: { block_id: blockId, title: block.title } };
}

async function findConflicts(
  supabase: SupabaseClient,
  userId: string,
  startTime: Date,
  endTime: Date,
  bufferMinutes: number
) {
  const bufferedStart = new Date(startTime.getTime() - bufferMinutes * 60000);
  const bufferedEnd = new Date(endTime.getTime() + bufferMinutes * 60000);

  const { data: conflicts } = await supabase
    .from("blocks")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "completed")
    .neq("status", "missed")
    .lt("start_time", bufferedEnd.toISOString())
    .gt("end_time", bufferedStart.toISOString());

  return conflicts || [];
}
