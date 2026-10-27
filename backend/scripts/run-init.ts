/** Run full DB init (schema + seed rules + migrations). Usage: npx tsx scripts/run-init.ts */
import { getPool, closePool } from '../utils/pool.js'
import { initDatabase } from '../utils/init-db.js'

await initDatabase(getPool())
await closePool()
console.log('initDatabase finished')
