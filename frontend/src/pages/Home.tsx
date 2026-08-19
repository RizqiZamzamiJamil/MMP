import { FormEvent, useCallback, useEffect, useState } from "react";
import Card from "../components/Card";
import InputField from "../components/InputField";
import { fetchDashboardData } from "../features/api";
import { formatDate, formatNumber } from "../features/formatter";
import type { DashboardData, MentionFilters } from "../features/types";

const emptyFilters: MentionFilters = { q: "", source: "", from: "", to: "" };
const emptyData: DashboardData = {
  mentions: [],
  sourceStats: [],
  total: 0,
  totalPages: 0,
};

function Home() {
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [data, setData] = useState(emptyData);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDashboardData(filters, page));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters(draftFilters);
  }

  function updateFilter(key: keyof MentionFilters, value: string) {
    setDraftFilters({ ...draftFilters, [key]: value });
  }

  function clearFilters() {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  }

  const totalEngagement = data.sourceStats.reduce(
    (sum, row) => sum + row.total_engagement,
    0,
  );
  const metrics = [
    ["Total mentions", formatNumber(data.total), "Matching current filters"],
    [
      "Tracked sources",
      String(data.sourceStats.length),
      "All indexed source labels",
    ],
    [
      "Engagement",
      formatNumber(totalEngagement),
      "Across all indexed mentions",
    ],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        {metrics.map(([label, value, caption]) => (
          <Card className="flex min-h-28 flex-col justify-center" key={label}>
            <span className="text-xs text-slate-500">{label}</span>
            <strong className="my-2 text-3xl font-semibold text-blue-600">
              {value}
            </strong>
            <span className="text-[11px] text-slate-500">{caption}</span>
          </Card>
        ))}
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,.8fr)]">
        <div className="grid min-w-0 gap-5">
          <Card>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">
                  Explore coverage
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Search mentions
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">
                {formatNumber(data.total)} results
              </span>
            </div>

            <form
              className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))_auto]"
              onSubmit={submitFilters}
            >
              <div className="sm:col-span-2 lg:col-span-1">
                <InputField
                  label="Keyword"
                  value={draftFilters.q}
                  onChange={(event) => updateFilter("q", event.target.value)}
                  placeholder="Search title or content"
                />
              </div>
              <InputField
                label="Source"
                value={draftFilters.source}
                onChange={(event) => updateFilter("source", event.target.value)}
                placeholder="e.g. The Star"
              />
              <InputField
                label="From"
                type="date"
                value={draftFilters.from}
                onChange={(event) => updateFilter("from", event.target.value)}
              />
              <InputField
                label="To"
                type="date"
                value={draftFilters.to}
                onChange={(event) => updateFilter("to", event.target.value)}
              />
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
                <button
                  className="min-h-10 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-700"
                  type="submit"
                >
                  Apply filters
                </button>
                <button
                  className="min-h-10 rounded-md border border-slate-300 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">
                  Latest signals
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Recent mentions
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Newest first</span>
            </div>
            {loading ? (
              <p className="grid min-h-40 place-items-center text-xs text-slate-500">
                Loading coverage...
              </p>
            ) : error ? (
              <div className="grid min-h-40 place-items-center text-center text-xs text-red-600">
                <div>
                  <p className="mb-3">{error}</p>
                  <button
                    className="rounded-md bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white"
                    type="button"
                    onClick={() => void loadData()}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : data.mentions.length === 0 ? (
              <p className="grid min-h-40 place-items-center text-xs text-slate-500">
                No mentions match these filters.
              </p>
            ) : (
              <div>
                {data.mentions.map((mention) => (
                  <article
                    className="border-t border-slate-200 py-[18px] first:border-0 first:pt-0"
                    key={mention.id}
                  >
                    <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-500">
                      <span className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                        {mention.source}
                      </span>
                      <span>{formatDate(mention.publishedAt)}</span>
                    </div>
                    <h3 className="my-2 text-[15px] font-semibold text-slate-900">
                      {mention.title ?? "Untitled mention"}
                    </h3>
                    <p className="text-xs leading-[1.65] text-slate-600">
                      {mention.content}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[10px] text-slate-500">
                      <span>{mention.author ?? "Unknown author"}</span>
                      <span className="text-slate-700">
                        {formatNumber(mention.engagement)} engagement
                      </span>
                      <a
                        className="text-blue-700 hover:underline sm:ml-auto"
                        href={mention.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open source ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">
            Distribution
          </p>
          <h2 className="mb-5 mt-1 text-xl font-semibold text-slate-900">
            By source
          </h2>
          {data.sourceStats.length === 0 ? (
            <p className="grid min-h-20 place-items-center text-xs text-slate-500">
              No source data yet.
            </p>
          ) : (
            data.sourceStats.map((row, index) => (
              <div
                className="flex items-center justify-between gap-3 border-t border-slate-200 py-3 first:border-0 first:pt-0"
                key={row.label}
              >
                <span className="flex min-w-0 items-center gap-2 text-xs text-slate-700">
                  <span className="grid size-[25px] shrink-0 place-items-center rounded bg-slate-100 text-[9px] font-bold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="whitespace-nowrap text-right text-[9px] text-slate-500">
                  <strong className="block text-xs text-slate-900">
                    {formatNumber(row.count)}
                  </strong>
                  {formatNumber(row.total_engagement)} eng.
                </span>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

export default Home;
