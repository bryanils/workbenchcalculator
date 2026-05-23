---
name: fallow-check
description: Check the codebase for cyclomatic complexity, dead code, and code duplication using fallow. Use when the user asks to find unused code, complexity hotspots, duplicate logic, refactor candidates, or run a fallow / health / dead-code / dupes / complexity scan. ALWAYS runs fallow via powershell.exe — never directly in WSL.
allowed-tools: Bash, Read, Grep, Glob
---

# Fallow Check (Windows-side via powershell.exe)

Run fallow analysis against this Next.js project. Fallow lives in WSL (`node_modules/.bin/fallow`) but **must be invoked Windows-side via `powershell.exe`** — running it from WSL is dramatically slower due to filesystem crossing.

## ABSOLUTE RULES

1. **NEVER** call `bunx fallow`, `npx fallow`, `./node_modules/.bin/fallow`, or any direct fallow invocation from WSL bash. It will work but is painfully slow.
2. **ALWAYS** invoke through `powershell.exe -NoProfile -Command "..."` so it runs natively on Windows against the same project files.
3. **ALWAYS** use `--format json` so output is structured and parseable.
4. **NEVER** run `fallow fix` without `--dry-run` first. Apply auto-fixes only after the user has reviewed the dry-run output and approved.

## Project Windows Path

```
C:\Users\bryan\Documents\workbenchcalculator
```

(corresponds to `/mnt/c/Users/bryan/Documents/workbenchcalculator` in WSL)

## Invocation Template

```bash
powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow <subcommand> --format json"
```

Notes on the wrapping:
- `-NoProfile` skips the user's PowerShell profile (faster startup, no surprise prompts).
- Single quotes around the path inside the PS command so spaces are safe.
- `;` separates the `cd` and the `bunx` call inside PowerShell.
- The whole `-Command` value is wrapped in **double quotes** at the bash layer.
- If you need to pass a literal double-quote inside the PS command, escape it as `\"` from bash, or switch to a here-doc.

## Commands

| Goal | Command (run from WSL bash, in repo root) |
|------|-------------------------------------------|
| Everything (default: dead-code + dupes + health) | `powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow --format json"` |
| Dead code only (unused files/exports/deps) | `powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow dead-code --format json"` |
| Duplication only | `powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow dupes --format json"` |
| Cyclomatic complexity / health hotspots | `powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow health --format json"` |
| Circular dependency check | `powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow circular --format json"` |
| Preview auto-fixes (SAFE — read-only) | `powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow fix --dry-run --format json"` |
| Apply auto-fixes (DESTRUCTIVE — only after user approves dry-run) | `powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow fix --format json"` |

## Capturing Output

Fallow JSON output can be large. Pipe to a file under `.fallow/` (already gitignored) so the result stays out of the conversation context:

```bash
powershell.exe -NoProfile -Command "cd 'C:\Users\bryan\Documents\workbenchcalculator'; bunx fallow dead-code --format json" > .fallow/dead-code.json
```

Then use `Read` / `Grep` to slice the JSON file rather than dumping the full payload into the conversation.

## Workflow

1. Confirm which check the user wants (dead-code / dupes / health / circular / all). If unclear, default to `bunx fallow` (runs all three core checks).
2. Run the matching powershell.exe invocation. Redirect to `.fallow/<name>.json`.
3. Read the JSON file, summarize the top findings (file paths, line numbers, severity), and present them grouped by category.
4. For each finding, give the user a one-line recommendation: delete, refactor, extract, ignore. Wait for direction before editing code.
5. If the user approves cleanup, edit files directly — do NOT run `fallow fix` unless they explicitly ask for the automatic path.

## When NOT to use this skill

- Type errors / lint errors — fallow doesn't cover those; defer to `oxlint` / `tsgo` (and remember [[the user runs those, not you]]).
- Runtime bugs / test failures — fallow is static analysis only.
- Performance profiling — fallow measures complexity, not runtime cost.

## Common Pitfalls

- **`bunx` not found in PowerShell**: PowerShell needs `bun` on its PATH. If powershell.exe reports "bun is not recognized", tell the user to add bun's Windows install dir to their Windows PATH (do not try to fix it from WSL).
- **Path with quotes**: If the working directory ever contains a single quote, switch to double-quote escaping inside PS: `cd \"C:\\path\\with'quote\"`. This repo's path is safe.
- **Color codes in output**: `--format json` strips them. If you ever skip `--format json`, ANSI escape codes will pollute the output — always prefer JSON.
- **First run is slow**: Fallow caches in `.fallow/cache/`. The first run after a clean clone or after dependency changes takes longer; subsequent runs are sub-second.
