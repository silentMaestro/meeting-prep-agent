import Anthropic from "@anthropic-ai/sdk";
import { Meeting, AgentEvent, AttendeeResearch, MeetingBrief } from "@/types";
import { personSearchTool, personResearchPrompt } from "./tools/person-search";
import { fetchCompanyNews } from "./tools/company-news";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

async function researchAttendee(
  attendee: { email: string; displayName?: string }
): Promise<AttendeeResearch> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: personResearchPrompt(attendee) },
  ];

  while (true) {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools: [personSearchTool as any],
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as AttendeeResearch;
        } catch {}
      }
      const name = attendee.displayName ?? attendee.email.split("@")[0];
      return {
        email: attendee.email,
        name,
        bio: "Could not retrieve bio.",
        role: "Unknown",
        recentActivity: [],
        talkingPoints: [],
      };
    }

    // Handle tool use
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) break;

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => ({
      type: "tool_result",
      tool_use_id: block.id,
      content: "Search executed. Please synthesize results into the requested JSON format.",
    }));

    messages.push({ role: "user", content: toolResults });
  }

  const name = attendee.displayName ?? attendee.email.split("@")[0];
  return {
    email: attendee.email,
    name,
    bio: "Research unavailable.",
    role: "Unknown",
    recentActivity: [],
    talkingPoints: [],
  };
}

async function synthesizeBrief(
  meeting: Meeting,
  attendees: AttendeeResearch[]
): Promise<string> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Based on this meeting and attendee research, write a concise agenda and 3-5 suggested questions.

Meeting: ${meeting.title}
Description: ${meeting.description ?? "None"}
Attendees: ${attendees.map((a) => `${a.name} (${a.role})`).join(", ")}

Attendee bios:
${attendees.map((a) => `- ${a.name}: ${a.bio}`).join("\n")}

Return JSON: {"agenda": "<2-3 sentence agenda>", "suggestedQuestions": ["q1", "q2", "q3", "q4", "q5"]}`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function* runResearchAgent(
  meeting: Meeting
): AsyncGenerator<AgentEvent> {
  yield { type: "status", message: `Starting research for "${meeting.title}"` };

  const attendeeResults: AttendeeResearch[] = [];

  for (const attendee of meeting.attendees) {
    const name = attendee.displayName ?? attendee.email;
    yield { type: "status", message: `Researching ${name}...` };

    try {
      const result = await researchAttendee(attendee);
      attendeeResults.push(result);
      yield { type: "attendee_done", attendee: result };
    } catch (err: any) {
      yield { type: "status", message: `Could not research ${name}: ${err.message}` };
    }
  }

  // Fetch company news for unique domains
  const domains = [...new Set(meeting.attendees.map((a) => a.email.split("@")[1]))];
  const companyNewsResults = [];

  for (const domain of domains) {
    yield { type: "status", message: `Fetching news for ${domain}...` };
    try {
      const news = await fetchCompanyNews(domain);
      companyNewsResults.push(news);
      yield { type: "news_done", news };
    } catch (err: any) {
      yield { type: "status", message: `Could not fetch news for ${domain}: ${err.message}` };
    }
  }

  // Synthesize brief
  yield { type: "status", message: "Synthesizing meeting brief..." };

  try {
    const synthesisText = await synthesizeBrief(meeting, attendeeResults);
    const match = synthesisText.match(/\{[\s\S]*\}/);
    let agenda = "Review meeting objectives and discuss next steps.";
    let suggestedQuestions: string[] = [];

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        agenda = parsed.agenda ?? agenda;
        suggestedQuestions = parsed.suggestedQuestions ?? [];
      } catch {}
    }

    const brief: MeetingBrief = {
      meetingId: meeting.id,
      title: meeting.title,
      agenda,
      attendees: attendeeResults,
      companyNews: companyNewsResults,
      suggestedQuestions,
      generatedAt: new Date().toISOString(),
    };

    yield { type: "brief_done", brief };
  } catch (err: any) {
    yield { type: "error", message: err.message };
  }
}
