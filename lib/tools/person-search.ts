import { Attendee } from "@/types";

export const personSearchTool = {
  type: "web_search_20250305" as const,
  name: "web_search",
};

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "me.com", "protonmail.com", "live.com",
]);

function isPersonalEmail(domain: string): boolean {
  return PERSONAL_DOMAINS.has(domain);
}

function humanizeName(emailUser: string): string {
  return emailUser
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function extractNameHints(title: string, description: string): string {
  if (!title && !description) return "";
  return `Meeting title: "${title}"${description ? `\nMeeting description: "${description}"` : ""}

Use the meeting title and description as clues — they may contain the person's name, company, or role (e.g. "Call with Jane from Acme", "Intro: Bob Smith - CTO"). Extract any names or companies you find and prioritize searching for those.`;
}

export function personResearchPrompt(
  attendee: Attendee,
  meetingContext: { title: string; description?: string }
): string {
  const domain = attendee.email.split("@")[1];
  const emailUser = attendee.email.split("@")[0];
  const personal = isPersonalEmail(domain);
  const name = attendee.displayName ?? humanizeName(emailUser);
  const companyHint = personal ? "" : `Company domain: ${domain}`;
  const contextHint = extractNameHints(meetingContext.title, meetingContext.description ?? "");

  const searchInstructions = personal
    ? `This person uses a personal email. Search strategies:
1. Use any name or company clues from the meeting title/description first
2. Search "${name}" site:linkedin.com
3. Search "${name}" professional profile OR portfolio OR github`
    : `Search strategies:
1. Use any name or company clues from the meeting title/description first
2. Search "${name}" site:linkedin.com
3. Search "${name}" ${domain} to find their company profile
4. Search "${name}" for recent articles, talks, or news`;

  return `Research this person I have an upcoming meeting with:
Name: ${name}
Email: ${attendee.email}
${companyHint}

${contextHint}

${searchInstructions}

IMPORTANT RULES:
- Do not invent or guess any information — if you can't find it, say so.
- Do NOT try to identify which LinkedIn profile is correct. Return ALL LinkedIn profiles you find and let the user decide.
- For URLs: copy them VERBATIM character-for-character from search results. Never construct or infer a URL. If you didn't see the exact URL in a search result, omit it entirely.

Return a JSON object with these exact fields:
{
  "email": "${attendee.email}",
  "name": "<full name from search results, or best guess from email/meeting title>",
  "bio": "<2-4 sentences from their LinkedIn About section or profile summary verbatim. If nothing found, say so.>",
  "role": "<current title and company from search results, or 'Unknown'>",
  "recentActivity": ["<item 1>", "<item 2>", "<item 3>"],
  "talkingPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "links": [
    { "label": "LinkedIn", "url": "<verbatim LinkedIn URL — add one entry per profile found>" },
    { "label": "Company", "url": "<verbatim company page URL if found>" },
    { "label": "<descriptive label>", "url": "<any other verbatim URL: GitHub, Twitter, personal site, news article>" }
  ]
}

Only include link entries where you have a real verbatim URL from search results. If you found 3 LinkedIn profiles, include 3 separate LinkedIn entries.`;
}
