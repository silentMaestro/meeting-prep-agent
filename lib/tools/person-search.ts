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
- For URLs: copy them VERBATIM from search results. Never construct a URL from a name or guess what a profile URL might be. If you didn't see the exact URL in a search result, omit that link entirely.

Return a JSON object with these exact fields:
{
  "email": "${attendee.email}",
  "name": "<full name, or best guess from email/meeting title if not found>",
  "bio": "<2-4 sentences: use their LinkedIn 'About' section or profile summary verbatim if found, otherwise synthesize from what you read>",
  "role": "<current title and company, or 'Unknown'>",
  "recentActivity": ["<item 1>", "<item 2>", "<item 3>"],
  "talkingPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "links": [
    { "label": "LinkedIn", "url": "<exact LinkedIn URL from search results — only if you saw it>" },
    { "label": "Company", "url": "<exact company page URL from search results — only if you saw it>" },
    { "label": "<label>", "url": "<any other exact URL you found: GitHub, Twitter, blog, news article>" }
  ]
}

Omit any link object where you do not have the real URL from search results.`;
}
