export type Mention = {
  id: string;
  source: string;
  title: string | null;
  content: string;
  url: string;
  author: string | null;
  publishedAt: string | null;
  engagement: number;
};

export type StatsRow = {
  label: string;
  count: number;
  total_engagement: number;
};
export type SearchResponse = {
  data: Mention[];
  pagination: { total: number; totalPages: number };
};
export type MentionFilters = {
  q: string;
  source: string;
  from: string;
  to: string;
};
export type DashboardData = {
  mentions: Mention[];
  sourceStats: StatsRow[];
  total: number;
  totalPages: number;
};
