import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { config } from "../config.js";
import { normalizeMention } from "../mentions/normalize.js";
import type { RawMention } from "../mentions/types.js";

async function seedDatabase() {
  const seedPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../seed_mentions.json",
  );
  const source = await fs.readFile(seedPath, "utf8");
  const rawMentions = JSON.parse(source) as RawMention[];
  const mentions = rawMentions.map(normalizeMention);
  const client = new Client({ connectionString: config.databaseUrl });

  await client.connect();
  try {
    await client.query("BEGIN");
    let inserted = 0;

    for (const mention of mentions) {
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
      if (result.rowCount === 1) inserted += 1;
    }

    await client.query("COMMIT");
    console.log(
      `Seeded ${inserted} of ${mentions.length} mentions (${mentions.length - inserted} skipped).`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

seedDatabase().catch((error: unknown) => {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
});
