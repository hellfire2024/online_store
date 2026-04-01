import { pool } from "./connection.js";
import { RowDataPacket } from "mysql2";
import { APP_SCHEMA_RULES } from "./schemaRules.js";

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SHOW COLUMNS FROM \`${table}\` LIKE ?`,
    [column],
  );
  return rows.length > 0;
}

export async function checkProductSchema(): Promise<void> {
  await checkDatabaseSchema();
}

export async function checkDatabaseSchema(): Promise<void> {
  let hasError = false;

  for (const rule of APP_SCHEMA_RULES) {
    const [camelExists, snakeExists] = await Promise.all([
      hasColumn(rule.table, rule.camel),
      hasColumn(rule.table, rule.snake),
    ]);

    if (!camelExists && !snakeExists) {
      hasError = true;
      console.error(
        `❌ ${rule.table}: missing both columns '${rule.camel}' and '${rule.snake}'`,
      );
      continue;
    }

    if (camelExists && snakeExists) {
      console.log(
        `✅ ${rule.table}: both '${rule.camel}' and '${rule.snake}' exist (compat mode)`,
      );
      continue;
    }

    const existing = camelExists ? rule.camel : rule.snake;
    console.log(`✅ ${rule.table}: using '${existing}'`);
  }

  if (hasError) {
    throw new Error("Database schema compatibility check failed");
  }

  console.log("✅ Database schema compatibility check passed");
}

const directRunTarget = (process.argv[1] || "").replace(/\\/g, "/");
const isDirectRun =
  directRunTarget.endsWith("/checkProductSchema.ts") ||
  directRunTarget.endsWith("/checkProductSchema.js");

if (isDirectRun) {
  checkDatabaseSchema()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Database schema check failed:", error);
      process.exit(1);
    });
}
