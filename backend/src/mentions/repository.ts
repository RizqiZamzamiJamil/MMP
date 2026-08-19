import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import type { MentionRecord, NormalizedMention } from "./types.js";

const SORT_COLUMNS = {
  published_at: "published_at",
  engagement: "engagement",
  source: "source",
  title: "title",
  created_at: "created_at",
} as const;

export type SearchOptions = {
  q?: string;
  source?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
  sort: keyof typeof SORT_COLUMNS;
  order: "ASC" | "DESC";
};

function toMention(row: Record<string, unknown>): MentionRecord {
  return {
    id: String(row.id),
    externalId: String(row.external_id),
    source: String(row.source),
    title: row.title ? String(row.title) : null,
    content: String(row.content),
    url: String(row.url),
    author: row.author ? String(row.author) : null,
    publishedAt: row.published_at instanceof Date ? row.published_at : null,
    engagement: Number(row.engagement),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at
        : new Date(String(row.created_at)),
  };
}

/** Inserts one normalized mention and reports whether PostgreSQL created a row. */
export async function insertMention(
  client: PoolClient,
  mention: NormalizedMention,
) {
  const result = await client.query(
    `INSERT INTO mentions
      (external_id, source, title, content, url, author, published_at, engagement)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (external_id, url) DO NOTHING
     RETURNING id`,
    [
      mention.externalId,
      mention.source,
      mention.title,
      mention.content,
      mention.url,
      mention.author,
      mention.publishedAt,
      mention.engagement,
    ],
  );
  return result.rowCount === 1;
}

/** Builds parameterized search/count queries while keeping sort fields allow-listed. */
export async function searchMentions(options: SearchOptions) {
  const filters: string[] = [];
  const values: unknown[] = [];
  const addValue = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (options.q) {
    const parameter = addValue(`%${options.q}%`);
    filters.push(`(title ILIKE ${parameter} OR content ILIKE ${parameter})`);
  }
  if (options.source)
    filters.push(`source ILIKE ${addValue(`%${options.source}%`)}`);
  if (options.from) filters.push(`published_at >= ${addValue(options.from)}`);
  if (options.to) filters.push(`published_at < ${addValue(options.to)}`);

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const sortColumn = SORT_COLUMNS[options.sort] ?? SORT_COLUMNS.published_at;
  const offset = (options.page - 1) * options.limit;
  const limitParameter = addValue(options.limit);
  const offsetParameter = addValue(offset);
  const order = options.order === "ASC" ? "ASC" : "DESC";

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, external_id, source, title, content, url, author, published_at, engagement, created_at
       FROM mentions ${where}
       ORDER BY ${sortColumn} ${order} NULLS LAST, id ASC
       LIMIT ${limitParameter} OFFSET ${offsetParameter}`,
      values,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM mentions ${where}`,
      values.slice(0, -2),
    ),
  ]);

  const total = Number(countResult.rows[0].total);
  return {
    data: rowsResult.rows.map(toMention),
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

/** Returns aggregate counts for either canonical source or UTC publication day. */
export async function getStats(groupBy: "source" | "day") {
  const query =
    groupBy === "source"
      ? `SELECT source AS label, COUNT(*)::int AS count, COALESCE(SUM(engagement), 0)::int AS total_engagement
       FROM mentions GROUP BY source ORDER BY count DESC, label ASC`
      : `SELECT TO_CHAR(published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS label,
         COUNT(*)::int AS count, COALESCE(SUM(engagement), 0)::int AS total_engagement
       FROM mentions WHERE published_at IS NOT NULL
       GROUP BY label ORDER BY label ASC`;

  const result = await pool.query(query);
  return result.rows;
}

/** Runs a group of database operations atomically and rolls back on any failure. */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
