import type {
  DashboardData,
  MentionFilters,
  SearchResponse,
  StatsRow,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function requestJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new Error(
      `Unable to reach the API at ${API_BASE_URL}. Make sure the backend is running on port 4000.`,
    );
  }
  if (!response.ok)
    throw new Error(`Request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchDashboardData(
  filters: MentionFilters,
  page: number,
): Promise<DashboardData> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "8",
    sort: "published_at",
    order: "DESC",
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const [search, source] = await Promise.all([
    requestJson<SearchResponse>(`/mentions?${params.toString()}`),
    requestJson<{ stats: StatsRow[] }>("/mentions/stats?group_by=source"),
  ]);
  return {
    mentions: search.data,
    sourceStats: source.stats,
    total: search.pagination.total,
    totalPages: search.pagination.totalPages,
  };
}
