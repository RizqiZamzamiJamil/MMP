import { Router } from "express";
import { normalizeMention } from "./normalize.js";
import {
  getStats,
  insertMention,
  searchMentions,
  withTransaction,
} from "./repository.js";

export const mentionsRouter = Router();

// Normalizes the complete batch before opening a transaction, so invalid input cannot be partially stored.
mentionsRouter.post("/internal/mentions/bulk", async (request, response) => {
  if (!Array.isArray(request.body)) {
    response
      .status(400)
      .json({ error: "Request body must be an array of mentions." });
    return;
  }

  try {
    const normalized = request.body.map(normalizeMention);
    const result = await withTransaction(async (client) => {
      let inserted = 0;
      for (const mention of normalized) {
        if (await insertMention(client, mention)) inserted += 1;
      }
      return { inserted, skipped: normalized.length - inserted };
    });
    response.status(200).json({ total: normalized.length, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to ingest mentions.";
    response.status(400).json({ error: message });
  }
});

// Applies search filters and pagination while repository code handles SQL parameters and stable ordering.
mentionsRouter.get("/mentions", async (request, response) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(String(request.query.page ?? "1"), 10) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(String(request.query.limit ?? "20"), 10) || 20,
      ),
    );
    const sortValues = [
      "published_at",
      "engagement",
      "source",
      "title",
      "created_at",
    ] as const;
    const requestedSort = String(request.query.sort ?? "published_at");
    const sort = sortValues.includes(
      requestedSort as (typeof sortValues)[number],
    )
      ? (requestedSort as (typeof sortValues)[number])
      : "published_at";
    const order =
      String(request.query.order ?? "DESC").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";
    const from = request.query.from ? String(request.query.from) : undefined;
    const to = request.query.to ? String(request.query.to) : undefined;
    if (
      (from && Number.isNaN(Date.parse(from))) ||
      (to && Number.isNaN(Date.parse(to)))
    ) {
      response.status(400).json({ error: "from and to must be valid dates." });
      return;
    }

    const result = await searchMentions({
      q: request.query.q ? String(request.query.q).trim() : undefined,
      source: request.query.source
        ? String(request.query.source).trim()
        : undefined,
      from,
      to: to ? `${to}T23:59:59.999Z` : undefined,
      page,
      limit,
      sort,
      order,
    });
    response.json(result);
  } catch (error) {
    console.error("Search request failed:", error);
    response.status(500).json({ error: "Unable to search mentions." });
  }
});

// Exposes the two aggregates required by the optional dashboard chart.
mentionsRouter.get("/mentions/stats", async (request, response) => {
  const groupBy = String(request.query.group_by ?? "");
  if (groupBy !== "source" && groupBy !== "day") {
    response.status(400).json({ error: "group_by must be source or day." });
    return;
  }

  try {
    response.json({ groupBy, stats: await getStats(groupBy) });
  } catch (error) {
    console.error("Stats request failed:", error);
    response.status(500).json({ error: "Unable to calculate mention stats." });
  }
});
