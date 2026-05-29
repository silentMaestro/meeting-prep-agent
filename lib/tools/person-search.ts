import { Attendee } from "@/types";

export const personSearchTool = {
  type: "web_search_20250305" as const,
  name: "web_search",
};

function isPersonalEmail(domain: string): boolean {
  return ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "me.com", "protonmail.com"].includes(domain);
}

function humanizeName(emailUser: string): string {
  // "john.smith" -> "John Smith", "jsmith" -> "Jsmith"
  return emailUser
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function personResearchPrompt(attendee: Attendee): string {
  const domain = attendee.email.split("@")[1];
  const emailUser = attendee.email.split("@")[0];
  const personal = isPersonalEmail(domain);

  const name = attendee.displayName ?? (personal ? humanizeName(emailUser) : humanizeName(emailUser));
  const companyHint = personal ? "" : `Company domain: ${domain}`;

  const searchInstructions = personal
    ? `This person uses a personal email. Search for:
1. "${name}" site:linkedin.com
2. "${name}" professional profile OR portfolio
3. "${name}" github OR twitter OR blog`
    : `Search for:
1. "${name}" site:linkedin.com
2. "${name}" ${domain} — to find their company profile page
3. "${name}" — recent news, articles, or talks`;

  return `Research this person I have an upcoming meeting with:
Name: ${name}
Email: ${attendee.email}
${companyHint}

${searchInstructions}

If you can't find reliable information, be honest and say so — do not invent details.

Return a JSON object with these exact fields:
{
  "email": "${attendee.email}",
  "name": "<full name, or best guess from email if not found>",
  "bio": "<2-3 sentence professional bio, or 'No public profile found' if unavailable>",
  "role": "<current title and company, or 'Unknown'>",
  "recentActivity": ["<item 1>", "<item 2>", "<item 3>"],
  "talkingPoints": ["<point 1>", "<point 2>", "<point 3>"]
}`;
}
