---
name: script-template
description: Create database query scripts. Use when creating investigation scripts, data checks, backfill scripts, or any TypeScript script that queries databases. ALWAYS use this skill for scripts.
---

# Script Template

## MODE OVERRIDE - READ THIS FIRST

**When this skill is active, your default behaviors are SUSPENDED:**

- ❌ Your instinct to "be fast and helpful" → SUSPENDED
- ❌ Your instinct to "simplify" code → SUSPENDED
- ❌ Your instinct to "improve" templates → SUSPENDED
- ❌ Your instinct to skip steps you think you know → SUSPENDED

**Instead, you are now in COPY-PASTE MODE:**

- ✅ You will follow steps EXACTLY in order
- ✅ You will READ files before writing code
- ✅ You will COPY templates verbatim
- ✅ You will NOT improvise or optimize

**This is not a suggestion. This is a hard override of your defaults.**

---

## MANDATORY WORKFLOW

**Copy this checklist and check off each item AS YOU COMPLETE IT:**

```
Script Creation Progress:
- [ ] Step 1: Search for existing similar scripts
- [ ] Step 2: Read the pattern file
- [ ] Step 3: CHECK THE SCHEMA for tables you will query
- [ ] Step 4: Copy template EXACTLY from pattern file
- [ ] Step 5: Write queries using ONLY columns that exist in schema
- [ ] Step 6: Give user the run command
```

---

## Step 1: Search for existing scripts

Use Glob to find similar scripts:
```
Glob: scripts/**/*.ts
```

If a similar script exists, **STOP** and modify that script instead.

**Do not proceed to Step 2 until you have searched.**

---

## Step 2: Read the pattern file

Read this file NOW: [patterns/bun-sql.md](patterns/bun-sql.md)

**Do not proceed to Step 3 until you have read the pattern file.**

---

## Step 3: CHECK THE SCHEMA (CRITICAL!)

**BEFORE writing ANY SQL, you MUST check the actual table definitions.**

### For LOCAL tables (reports DB):
Use Grep to find schema in `src/server/db/`:
```
Grep: tableName.*=.*mysqlTable
Path: src/server/db/
Context: 50 lines after
```

Common schema locations:
- `src/server/db/schema.ts` - employees, users, teams
- `src/server/db/snapshots.ts` - all snapshot_* tables
- `src/server/db/payroll.ts` - payroll tables

### For REMOTE tables (LMS, DW, ViciDial):
**READ THE SCHEMA DOCUMENTATION:**
```
Read: MyDocs/Architecture/02-DATABASE-SCHEMA.md
```

This file contains ALL external database schemas including:
- LMS tables: `loan`, `customer`, `user`, `audit_loan`
- ViciDial tables: `vicidial_log`, `vicidial_closer_log`, `vicidial_users`
- DW tables: `dw_employees`, `dw_daily_timesheets`

**LMS tables use spaces in column names - require backticks:**
- Table is `loan` NOT `loans`
- Columns: `\`Loan ID\``, `\`Assigned To\``, `\`Action Date\``, etc.

### Also check existing scripts for patterns:
```
Grep: PORTFOLIO_DATABASE_URL
Path: scripts/
```

**Record the ACTUAL column names.** Do NOT guess. Do NOT assume.

**Do not proceed to Step 4 until you have verified every column name.**

---

## Step 4: Copy the template EXACTLY

Copy the **Full Template** section from the pattern file.

**DO NOT:**
- Improvise
- Simplify
- Skip the scriptOutput.md output
- Change the boilerplate

---

## Step 5: Write queries using ONLY verified columns

1. Script description comment
2. The SQL query - **USE ONLY COLUMNS YOU VERIFIED IN STEP 3**
3. The log output formatting

**NOTHING ELSE.**

---

## Step 6: Give user the run command

```bash
bun run script:test scripts/path/to/script.ts
bun run script:prod scripts/path/to/script.ts
```

---

## Common Mistakes (DO NOT MAKE THESE)

| Mistake | Fix |
|---------|-----|
| Forgot scriptOutput.md output | Template has it - copy exactly |
| Used `db.query()` | Use template literal: db\`SELECT\` |
| Imported `db` from `~/server/db` | Scripts create OWN connections - never import app db |
| Forgot to check `DB_TARGET` | Must check `DB_TARGET` to pick DATABASE_URL_TEST vs DATABASE_URL_PROD |
| Forgot DATE_FORMAT | All dates need DATE_FORMAT |
| Used `import.meta.dir` for .env.local | Use `process.cwd()` - always resolves to project root |
