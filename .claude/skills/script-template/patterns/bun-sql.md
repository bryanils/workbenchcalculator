# Bun SQL Pattern

## When to Use

Use Bun SQL when connecting to databases directly:
- `DATABASE_URL_TEST` - Docker test-db (reports)
- `DATABASE_URL_PROD` - Production reports DB
- `DW_DATABASE_URL` - Data Warehouse
- `VICI_DATABASE_URL` - ViciDial
- `PORTFOLIO_DATABASE_URL` - LMS base URL (append db name: `/communit_lms`, `/primecre_lms`, `/titanfu_lms`)

## Running Scripts

Always use the script runner to target the correct database:

```bash
# Test database
bun run script:test scripts/path/to/script.ts --dry-run

# Production database
bun run script:prod scripts/path/to/script.ts --dry-run
```

The script runner sets `DB_TARGET` env var. Scripts must check this to pick the right URL.

## Syntax

```typescript
import { SQL } from 'bun'

const db = new SQL(process.env.DATABASE_URL!)

// ✅ CORRECT - Template literals for all queries (auto parameterized)
const rows = await db`SELECT * FROM users WHERE id = ${id}`
await db`UPDATE users SET name = ${name} WHERE id = ${id}`
await db`INSERT INTO logs (msg, user_id) VALUES (${message}, ${userId})`
await db`DELETE FROM logs WHERE id = ${id}`

// Always close when done
await db.close()
```

## IN Clauses with Arrays (USE db() HELPER)

**Use the `db()` helper function for arrays:**

```typescript
const db = new SQL(dbUrl)

// ✅ CORRECT - db() helper for arrays in IN clauses
const usernames = ['alice', 'bob', 'charlie']
const rows = await db`SELECT * FROM employees WHERE username IN ${db(usernames)}`

// ✅ CORRECT - works with number arrays too
const ids = [1, 2, 3]
const rows = await db`SELECT * FROM employees WHERE id IN ${db(ids)}`

// ✅ CORRECT - extract key from array of objects
const users = [{ id: 1 }, { id: 2 }]
const rows = await db`SELECT * FROM employees WHERE id IN ${db(users, 'id')}`

// ❌ WRONG - template literal with raw array (crashes: "Incorrect arguments to mysqld_stmt_execute")
const rows = await db`SELECT * FROM employees WHERE username IN (${usernames})`
```

**Note:** No parentheses around `${db(usernames)}` — the helper adds them automatically.

## INSERT Statements

```typescript
// ✅ CORRECT - Template literals for INSERT (auto parameterized)
const employeeId = 123
const fromDate = '2025-01-01'
const expectation = 5

await db`INSERT INTO payroll_loan_expectations (employee_id, from_date, expectation) VALUES (${employeeId}, ${fromDate}, ${expectation})`

// For nullable columns, use null directly:
await db`INSERT INTO table (col1, col2) VALUES (${val1}, ${toDate})`
```

## Full Template

**🚨 CRITICAL: ALL SCRIPTS MUST OUTPUT TO `scriptOutput.md` SO CLAUDE CAN READ THE RESULTS! 🚨**

```typescript
#!/usr/bin/env bun
/**
 * Description of what this script does
 *
 * Run with:
 *   bun run script:test scripts/investigations/people/my-script.ts
 *   bun run script:prod scripts/investigations/people/my-script.ts
 */
import { SQL } from 'bun'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq > 0) {
      let val = trimmed.slice(eq + 1)
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      )
        val = val.slice(1, -1)
      process.env[trimmed.slice(0, eq)] = val
    }
  }
} catch (err) {
  console.error('Failed to load .env.local:', err)
}

// Output logging - REQUIRED! Writes to scriptOutput.md so Claude can read results
const output: string[] = []
const log = (msg = '') => {
  console.log(msg)
  output.push(msg)
}

process.on('exit', () => {
  writeFileSync(resolve(process.cwd(), 'scriptOutput.md'), output.join('\n'))
})

const isDryRun = process.argv.includes('--dry-run')

// Script runner sets DB_TARGET
const useProd = process.env.DB_TARGET === 'prod'
const dbUrl = useProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL_TEST
const dbName = useProd ? 'PRODUCTION' : 'TEST'

if (!dbUrl) {
  log(`Missing ${useProd ? 'DATABASE_URL_PROD' : 'DATABASE_URL_TEST'}`)
  process.exit(1)
}

async function main() {
  log(`# Script Name`)
  log('')
  log(`Database: ${dbName}`)
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`)
  log('')

  const db = new SQL(dbUrl)

  // Your queries here - ALWAYS use DATE_FORMAT for date columns!
  const rows = await db`
    SELECT
      id,
      username,
      DATE_FORMAT(hire_date, '%Y-%m-%d') as hire_date,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
    FROM employees
    LIMIT 10
  `

  log(`Found ${rows.length} employees`)
  log('```json')
  log(JSON.stringify(rows, null, 2))
  log('```')

  if (isDryRun) {
    log('')
    log('DRY RUN - no changes made')
  }

  await db.close()
  process.exit(0)
}

main().catch((err) => {
  log('')
  log('## FATAL ERROR')
  log(String(err))
})
```

## Multiple Connections (AVOID WHEN POSSIBLE)

**Prefer sequential connections over simultaneous.** Having multiple SSH-tunneled connections open at once can cause hangs:

```typescript
// ✅ BEST - Sequential connections (close one before opening another)
const dwDb = new SQL(process.env.DW_DATABASE_URL!)
const dwData = await dwDb`SELECT * FROM source_table`
await dwDb.close()  // Close DW BEFORE opening prod

const db = new SQL(dbUrl)
for (const row of dwData) {
  await db`INSERT INTO target (col) VALUES (${row.val})`
}
await db.close()

// ⚠️ RISKY - Simultaneous connections (can hang on writes)
let db: SQL | null = null
let dwDb: SQL | null = null

try {
  db = new SQL(process.env.DATABASE_URL!)
  dwDb = new SQL(process.env.DW_DATABASE_URL!)
  // This pattern can cause INSERT/UPDATE to hang!
} finally {
  if (dwDb) await dwDb.close()
  if (db) await db.close()
}
```

## Date Handling (CRITICAL)

Bun SQL returns DATE/DATETIME as JavaScript Date objects. Always use DATE_FORMAT:

```sql
-- ❌ WRONG - Returns Date object with timezone bugs
SELECT start_date FROM table

-- ✅ CORRECT - Returns string directly
SELECT DATE_FORMAT(start_date, '%Y-%m-%d') as start_date FROM table
SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at FROM table
```
