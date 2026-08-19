import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { config } from "../config.js";

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function setupDatabase() {
  const databaseUrl = new URL(config.databaseUrl);
  const databaseName =
    databaseUrl.pathname.replace(/^\//, "") || "media_monitor";
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();
  try {
    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );
    if (result.rowCount === 0) {
      await adminClient.query(
        `CREATE DATABASE ${quoteIdentifier(databaseName)}`,
      );
      console.log(`Created database "${databaseName}".`);
    } else {
      console.log(`Database "${databaseName}" already exists.`);
    }
  } finally {
    await adminClient.end();
  }

  const migrationPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../migrations/001_create_mentions.sql",
  );
  const migration = await fs.readFile(migrationPath, "utf8");
  const migrationClient = new Client({ connectionString: config.databaseUrl });
  await migrationClient.connect();
  try {
    await migrationClient.query(migration);
    console.log("Applied migration 001_create_mentions.sql.");
  } finally {
    await migrationClient.end();
  }
}

setupDatabase().catch((error: unknown) => {
  console.error("Database setup failed:", error);
  process.exitCode = 1;
});
