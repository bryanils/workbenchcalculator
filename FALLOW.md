# Fallow Audit — Workbench Calculator

Snapshot of what fallow found across the codebase. Shadcn (`src/components/ui/**`) and its dependencies are scoped out — these numbers are the real signal.

## Headline

| Metric | Value |
|---|---|
| Total files analyzed | 55 |
| Total functions analyzed | 538 |
| Total LOC | 9,095 |
| Average maintainability | 85.3 (good) |
| Duplication | **0 clones above threshold** (3.5% raw) |
| Critical complexity findings | **21** |
| High complexity findings | 12 |
| Moderate complexity findings | 15 |
| Unused files | 13 |
| Unused exports | 8 |
| Unused prod deps | 0 |
| Unused dev deps | 2 |

## The real problem: complexity hotspots

**`src/lib/calculator.ts:31` `calculate`** — cyclomatic **93**, cognitive **117**.
This is by far the worst function in the codebase. For reference, the project-wide average cyclomatic is 2.2 and the p90 is 4. This one function is ~23x the p90. It is unreachable to reason about safely and almost certainly the root cause of any "I changed X and now Y is wrong" bugs.

**`src/lib/steps.ts:10` `computeSteps`** — cyc **38**, cog **45**.
Second worst. Same shape of problem — too many branches in one function.

**`src/lib/derive.ts:13` `deriveBenchConfig`** — cyc **32**, cog **27**.
Critical.

**`src/components/BenchIso3D.tsx:92` `BenchIso3D`** — cyc **24**, cog **19**.
Render function doing too much branching/conditional logic. Should be split into smaller subcomponents or memoized helpers.

**`src/lib/wallPlan.ts:43` `planWall`** — cyc **23**, cog **25**.
**`src/lib/wallPlan.ts:100` `scoreCandidate`** — cyc **16**, cog **22**.
Two critical functions in the same file — wallPlan is a hotspot module overall.

**`src/components/ElevationViews.tsx:91` `FrontElevation` & `:334` `SideElevation`** — cyc 22, 23.
Two giant render functions in one file. Both are also unused exports (see below) — they're declared `export` but nothing imports them.

**`src/lib/hardware.ts:18` `computeHardware`** — cyc **16**.
**`src/lib/stability.ts:41` `assessStability`** — cyc **16**.

### Pattern
Every critical hotspot is a single function doing too much branching. The `src/lib/` calculation modules (`calculator`, `steps`, `derive`, `wallPlan`, `hardware`, `stability`) carry almost all the complexity. The 3D / elevation rendering components carry the rest. **None of the React component tree, hooks, or tRPC plumbing shows up in the critical list** — the math is the mess, not the UI glue.

### Vital signs

- **39.4 functions over 60 LOC per 1,000 functions** — about 1 in 25 functions is bloated.
- **3.9% of functions are very-high-risk size**, 6% high-risk. Roughly 1 in 10 functions is oversized.
- **p95 fan-in: 8** — no single module is over-depended-on; coupling is fine.
- **Critical complexity %: 0.1%** — tiny number of functions, but each is severe.

## Unused files (13)

### Test files (11) — false positive, ignore
```
src/lib/calculator.test.ts
src/lib/derive.test.ts
src/lib/materials.test.ts
src/lib/packLumber.test.ts
src/lib/packSheet.test.ts
src/lib/parseLength.test.ts
src/lib/presets.test.ts
src/lib/stability.test.ts
src/lib/styles.test.ts
src/lib/units.test.ts
src/lib/wallPlan.test.ts
```
These are run by `bun test`, not imported. Fallow correctly reports them as having no import graph — they aren't actually dead. Add `**/*.test.{ts,tsx}` to `ignorePatterns` to silence, or leave as documented noise.

### Actually dead (2)
- **`src/components/DimField.tsx`** — no importers. Either delete or wire it up.
- **`src/trpc/server.ts`** — no importers. Likely leftover from the App Router migration that already happened in the recent commit history. Verify and delete.

## Unused exports (8)

```
src/components/ElevationViews.tsx:91   FrontElevation     (also a complexity hotspot)
src/components/ElevationViews.tsx:334  SideElevation      (also a complexity hotspot)
src/lib/calculator.ts:31               calculate          (the cyc-93 monster)
src/lib/styles.ts:520                  DEFAULT_STYLE_ID
src/lib/utils.ts:11                    formatCurrency
src/lib/utils.ts:22                    humanizeSnakeCase
src/server/db/index.ts:15              client
src/trpc/react.tsx:25                  api
```

**Notable:** `calculate` — the highest-complexity function in the project — has no importers. Either it's the API surface that callers are *supposed* to use (and the project is mid-refactor), or it's truly orphaned and the 93-cyclomatic mess can be deleted outright. Worth answering before any other refactor work.

`api` from `src/trpc/react.tsx` and `client` from `src/server/db/index.ts` being unused points at the same App Router migration cleanup as `src/trpc/server.ts` above — the tRPC layer may not be wired in anywhere.

## Unused dev dependencies (2)

```
@typescript-eslint/utils    package.json:73
eslint-plugin-drizzle       package.json:76
```

Both are ESLint plugins but this project uses oxlint, not ESLint. Safe to remove:
```bash
bun remove -d @typescript-eslint/utils eslint-plugin-drizzle
```

## Duplication

Zero clones above threshold (`minOccurrences: 3`). Raw duplication is 3.5% (319 / 9,095 lines), 7 clone groups exist at the pair level but were filtered out. Codebase is not suffering from copy-paste.

## Recommended order of operations

1. **Decide the fate of `calculate` in `src/lib/calculator.ts`.** Is it the intended public API or orphaned? If orphaned, delete it and 93 points of cyclomatic complexity vanish in one commit.
2. **Clean up the App Router migration leftovers**: `src/trpc/server.ts`, `src/trpc/react.tsx`'s `api` export, `src/server/db/index.ts`'s `client` export, `src/components/DimField.tsx`.
3. **Drop the two unused ESLint deps.**
4. **Break up the remaining hotspots** — start with `computeSteps`, `deriveBenchConfig`, `planWall`. Each is ~30 cyclomatic of decision logic that almost certainly factors into smaller named cases.
5. **Refactor `BenchIso3D` and the two `ElevationViews` render functions** into smaller subcomponents.
