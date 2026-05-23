# WhenIWork API Pattern

## 🚨 CRITICAL: USE THE EXISTING CLIENT

**NEVER create your own WIW client class. ALWAYS use `wiwClient` from the existing service.**

```typescript
// Import AFTER env is loaded
import { wiwClient } from '../src/server/services/wheniwork'
```

## Available Methods

```typescript
// Get users
const users = await wiwClient.getUsers(false) // active only
const allUsers = await wiwClient.getUsers(true) // include deleted

// Get clock in/out times
const times = await wiwClient.getTimes('2026-01-01', '2026-01-07')

// Get PTO/time-off requests
const requests = await wiwClient.getRequests('2026-01-01', '2026-01-07')

// Get shift breaks (lunch) for a user
const breaks = await wiwClient.getShiftBreaks('2026-01-01', '2026-01-07', userId)

// Generic GET for any endpoint (hourstats, payrolls, etc.)
const data = await wiwClient.get<ResponseType>('2/payrolls', { include: 'hourstats' })
```

## Full Script Template

```typescript
#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local FIRST
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

// Import AFTER env is loaded
import { wiwClient } from '../src/server/services/wheniwork'

const output: string[] = []
const log = (msg = '') => {
  console.log(msg)
  output.push(msg)
}

process.on('exit', () => {
  writeFileSync(resolve(process.cwd(), 'scriptOutput.md'), output.join('\n'))
})

async function main() {
  log('# WIW Script Output')
  log('')

  // Use wiwClient methods
  const users = await wiwClient.getUsers(false)
  log(`Found ${users.length} active users`)

  // For endpoints without dedicated methods, use generic get()
  const payrolls = await wiwClient.get<{ payrolls: any[] }>('2/payrolls')
  log(`Found ${payrolls.payrolls?.length ?? 0} payroll periods`)
}

main().catch((err) => {
  log('')
  log('## FATAL ERROR')
  log(String(err))
})
```

## Reference Scripts

Look at these existing scripts for examples:
- `scripts/fetch-wiw-payroll-periods.ts` - Fetches payroll periods
- `scripts/fetch-wiw-overtime.ts` - Fetches overtime data from hourstats
- `scripts/check-wiw-timeoff-today.ts` - Fetches PTO requests
- `scripts/backfill-wiw-timeoff.ts` - Syncs timeoff data

## Environment Variables

The wiwClient uses these from `env.ts` (loaded via .env.local):
- `WIW_API_KEY`
- `WIW_API_USERNAME`
- `WIW_API_PASSWORD`

You don't need to reference these directly - `wiwClient` handles auth automatically.
