/**
 * Apply the large `seed2-*` demo dataset only (schema must already exist).
 * Loads backend/.env and uses the shared MySQL pool.
 */
import { getPool, closePool } from "../utils/pool.js";
import { seedFullDemo } from "../utils/seed-full-demo.js";

async function main() {
  const pool = getPool();
  try {
    await seedFullDemo(pool);
    // eslint-disable-next-line no-console
    console.log("db:seed-full finished OK.");
  } finally {
    await closePool();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
