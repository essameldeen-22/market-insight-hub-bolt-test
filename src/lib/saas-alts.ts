// Extracted from the original market_intelligence_suite.html reference.
// SaaS alternatives database: paid tool → open-source / cheaper alternative
// with a typical savings percentage and migration difficulty.

export interface SaasAlternative {
  from: string;
  to: string;
  save: number; // 0-1 fraction
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

export const SAAS_CATEGORIES = [
  "CRM",
  "Communication",
  "Design",
  "Analytics",
  "Project Management",
  "Development",
  "Marketing",
  "Support",
  "Storage",
  "Other",
];

export const SAAS_ALTS: SaasAlternative[] = [
  { from: "salesforce", to: "SuiteCRM", save: 0.85, difficulty: "hard", category: "CRM" },
  { from: "hubspot", to: "EspoCRM", save: 0.80, difficulty: "medium", category: "CRM" },
  { from: "zoho crm", to: "SuiteCRM", save: 0.75, difficulty: "medium", category: "CRM" },
  { from: "pipedrive", to: "EspoCRM", save: 0.70, difficulty: "medium", category: "CRM" },
  { from: "slack", to: "Rocket.Chat", save: 0.90, difficulty: "medium", category: "Communication" },
  { from: "microsoft teams", to: "Mattermost", save: 0.85, difficulty: "medium", category: "Communication" },
  { from: "discord", to: "Element (Matrix)", save: 0.95, difficulty: "easy", category: "Communication" },
  { from: "zoom", to: "Jitsi Meet", save: 0.95, difficulty: "easy", category: "Communication" },
  { from: "figma", to: "Penpot", save: 0.90, difficulty: "easy", category: "Design" },
  { from: "adobe xd", to: "Penpot", save: 0.90, difficulty: "medium", category: "Design" },
  { from: "sketch", to: "Penpot", save: 0.85, difficulty: "medium", category: "Design" },
  { from: "canva", to: "GIMP + Inkscape", save: 0.95, difficulty: "hard", category: "Design" },
  { from: "google analytics", to: "Plausible / Umami", save: 0.60, difficulty: "easy", category: "Analytics" },
  { from: "mixpanel", to: "PostHog", save: 0.70, difficulty: "medium", category: "Analytics" },
  { from: "amplitude", to: "PostHog", save: 0.70, difficulty: "medium", category: "Analytics" },
  { from: "hotjar", to: "PostHog", save: 0.65, difficulty: "medium", category: "Analytics" },
  { from: "asana", to: "OpenProject", save: 0.85, difficulty: "medium", category: "Project Management" },
  { from: "monday", to: "Focalboard", save: 0.90, difficulty: "medium", category: "Project Management" },
  { from: "jira", to: "OpenProject / Redmine", save: 0.80, difficulty: "hard", category: "Project Management" },
  { from: "trello", to: "Focalboard / WeKan", save: 0.95, difficulty: "easy", category: "Project Management" },
  { from: "clickup", to: "Focalboard", save: 0.85, difficulty: "medium", category: "Project Management" },
  { from: "notion", to: "AppFlowy / Outline", save: 0.90, difficulty: "medium", category: "Project Management" },
  { from: "github", to: "Gitea / GitLab CE", save: 0.80, difficulty: "medium", category: "Development" },
  { from: "bitbucket", to: "Gitea", save: 0.85, difficulty: "medium", category: "Development" },
  { from: "mailchimp", to: "Listmonk / Mautic", save: 0.85, difficulty: "medium", category: "Marketing" },
  { from: "sendgrid", to: "Postal", save: 0.80, difficulty: "hard", category: "Marketing" },
  { from: "convertkit", to: "Mautic", save: 0.85, difficulty: "medium", category: "Marketing" },
  { from: "intercom", to: "Chatwoot", save: 0.90, difficulty: "medium", category: "Support" },
  { from: "zendesk", to: "FreeScout / UVdesk", save: 0.85, difficulty: "medium", category: "Support" },
  { from: "freshdesk", to: "FreeScout", save: 0.80, difficulty: "medium", category: "Support" },
  { from: "dropbox", to: "Nextcloud", save: 0.75, difficulty: "medium", category: "Storage" },
  { from: "google drive", to: "Nextcloud", save: 0.70, difficulty: "medium", category: "Storage" },
  { from: "onedrive", to: "Nextcloud", save: 0.75, difficulty: "medium", category: "Storage" },
  { from: "box", to: "Nextcloud", save: 0.80, difficulty: "medium", category: "Storage" },
  { from: "loom", to: "Cap / OBS Studio", save: 0.90, difficulty: "easy", category: "Communication" },
  { from: "calendly", to: "Cal.com (self-hosted)", save: 0.85, difficulty: "easy", category: "Other" },
  { from: "typeform", to: "Formbricks / OhMyForm", save: 0.85, difficulty: "easy", category: "Marketing" },
  { from: "airtable", to: "NocoDB / Baserow", save: 0.90, difficulty: "medium", category: "Project Management" },
];

export function findAlternative(toolName: string): SaasAlternative | undefined {
  const name = toolName.trim().toLowerCase();
  if (!name) return undefined;
  // Exact match first, then substring
  return SAAS_ALTS.find((a) => a.from === name) ?? SAAS_ALTS.find((a) => name.includes(a.from));
}
