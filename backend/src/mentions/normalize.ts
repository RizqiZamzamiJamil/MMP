import type { NormalizedMention, RawMention } from "./types.js";

const SOURCE_ALIASES: Record<string, string> = {
  "the star": "The Star",
  thestar: "The Star",
  "new straits times": "New Straits Times",
  nst: "New Straits Times",
  twitter: "Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
  malaysiakini: "Malaysiakini",
  mkn: "Malaysiakini",
};

// Decodes the small set of entities commonly found in scraped article content.
function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    "&amp;": "&",
    "&apos;": "'",
    "&gt;": ">",
    "&lt;": "<",
    "&nbsp;": " ",
    "&quot;": '"',
  };

  return value
    .replace(
      /&(?:amp|apos|gt|lt|nbsp|quot);/gi,
      (entity) => namedEntities[entity.toLowerCase()] ?? entity,
    )
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    );
}

/** Converts raw HTML or non-string input into safe searchable plain text. */
export function cleanText(value: unknown) {
  if (typeof value !== "string") return "";

  // Strip executable blocks before removing other markup from source content.
  return decodeHtmlEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Maps inconsistent source labels to one canonical label used by filters and stats. */
export function normalizeSource(value: unknown) {
  const source = typeof value === "string" ? value.trim() : "";
  if (!source) return "Unknown";

  const canonical = SOURCE_ALIASES[source.toLowerCase()];
  return canonical ?? source.charAt(0).toUpperCase() + source.slice(1);
}

/** Converts ISO strings, Unix timestamps, and DD/MM/YYYY values into UTC dates. */
export function parsePublishedAt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== "string") return null;
  const dateOnly = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateOnly) {
    const [, day, month, year] = dateOnly;
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    return date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day)
      ? date
      : null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

/** Converts numeric strings such as "1,204" into a non-negative integer. */
export function parseEngagement(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value))
    return Math.max(0, Math.trunc(value));
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

/** Validates required fields and creates the database-ready mention representation. */
export function normalizeMention(input: RawMention): NormalizedMention {
  const externalId =
    typeof input.external_id === "string" ? input.external_id.trim() : "";
  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!externalId || !url) {
    throw new Error("external_id and url are required");
  }

  const content = cleanText(input.content);
  if (!content) throw new Error("content must contain text");

  const title = cleanText(input.title);
  const author =
    typeof input.author === "string" ? input.author.trim() || null : null;
  return {
    externalId,
    source: normalizeSource(input.source),
    title: title || null,
    content,
    url,
    author,
    publishedAt: parsePublishedAt(input.published_at),
    engagement: parseEngagement(input.engagement),
  };
}
