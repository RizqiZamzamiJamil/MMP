export type RawMention = {
  external_id?: unknown;
  source?: unknown;
  title?: unknown;
  content?: unknown;
  url?: unknown;
  author?: unknown;
  published_at?: unknown;
  engagement?: unknown;
};

export type NormalizedMention = {
  externalId: string;
  source: string;
  title: string | null;
  content: string;
  url: string;
  author: string | null;
  publishedAt: Date | null;
  engagement: number;
};

export type MentionRecord = NormalizedMention & { id: string; createdAt: Date };
