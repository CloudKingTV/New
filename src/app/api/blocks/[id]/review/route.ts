import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { awardQualityXP } from "@/lib/xp";
import { CLAUDE_MODEL } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: blockId } = await params;
    const { submissionText } = await request.json();

    if (!submissionText) {
      return NextResponse.json({ error: "Submission text required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch block
    const { data: block } = await supabase
      .from("blocks")
      .select("*")
      .eq("id", blockId)
      .eq("user_id", user.id)
      .single();

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    // Score is final — no re-grading
    if (block.quality_score !== null) {
      return NextResponse.json(
        { error: "Already reviewed. Score is final." },
        { status: 400 }
      );
    }

    // Grade with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      system: `You are a task quality reviewer. Grade the submission on a 0-100 scale using this rubric:
90-100: Exceptional — complete, high quality, exceeds requirements
75-89: Good — complete, meets requirements
50-74: Acceptable — mostly complete, some gaps
25-49: Incomplete — significant missing pieces
0-24: Failed — does not meet task requirements

Respond with JSON only: {"score": number, "feedback": "brief feedback"}`,
      messages: [
        {
          role: "user",
          content: `Task: "${block.title}"${block.description ? `\nDescription: ${block.description}` : ""}\n\nSubmission:\n${submissionText}`,
        },
      ],
    });

    // Parse the response
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let score = 50;
    let feedback = "Review completed.";

    try {
      const parsed = JSON.parse(text);
      score = Math.min(100, Math.max(0, parsed.score));
      feedback = parsed.feedback || feedback;
    } catch {
      // If parsing fails, try to extract score from text
      const match = text.match(/(\d+)/);
      if (match) score = Math.min(100, Math.max(0, parseInt(match[1])));
    }

    // Store review
    await supabase
      .from("blocks")
      .update({
        review_submission_text: submissionText,
        quality_score: score,
        quality_feedback: feedback,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", blockId);

    // Award quality XP
    const bonusXP = await awardQualityXP(supabase, user.id, blockId, score);

    return NextResponse.json({ score, feedback, bonusXP });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
