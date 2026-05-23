---
name: breakup
description: Refactor large files by breaking them into smaller, organized pieces. Use when a file is too large and needs to be split into logical modules.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# File Breakup Guide

Use this skill when breaking up large, complex files into smaller, more maintainable modules.

## When to Use

- File is >500 lines and becoming hard to navigate
- Multiple distinct responsibilities in one file (should follow Single Responsibility Principle)
- Helper components/functions that could be extracted
- Large enum/constant collections that deserve their own file
- TypeScript types that are growing unwieldy

## Process

### Step 1: Analyze the File

```typescript
// Read the entire file
// Identify distinct sections:
// - Main export (component/function)
// - Helper components
// - Utility functions
// - Types and interfaces
// - Constants
```

### Step 2: Plan the Split

Before creating files, document the split plan:

```
ORIGINAL: src/components/PayrollDashboard.tsx (850 lines)

SPLIT INTO:
├── PayrollDashboard.tsx (main component, 200 lines)
├── _components/
│   ├── PayPeriodSelector.tsx (extracted component)
│   ├── StubsTable.tsx (extracted component)
│   └── SummarySection.tsx (extracted component)
├── _utils/
│   ├── calculations.ts (payroll calculation helpers)
│   └── filters.ts (filtering logic)
├── _types.ts (types specific to this feature)
└── index.ts (re-exports for cleaner imports)
```

### Step 3: Create Output Directory Structure

For TSX components:
```
src/app/.../ComponentName/
├── ComponentName.tsx (main)
├── _components/ (extracted components)
├── _utils/ (helper functions)
├── _types.ts (types)
└── index.ts (re-exports)
```

For TS utilities:
```
src/utils/featureName/
├── index.ts (main re-export)
├── helpers.ts
├── types.ts
├── constants.ts
└── validation.ts
```

### Step 4: Extract Files

1. Create new files with extracted code
2. Update imports in new files
3. Add re-exports to `index.ts` if needed

### Step 5: Update Original File

1. Remove extracted code
2. Add imports from new locations
3. Clean up to main export only

### Step 6: Verify Imports

Check that:
- All references in other files still work
- No circular imports
- Type imports use `import type` where appropriate

## Examples

### Example 1: Extract Helper Components from TSX

**Before:** `src/app/admin/payroll/PayrollAdminClient.tsx` (800 lines)

**Extract to:**
```
src/app/admin/payroll/_components/
├── PayrollAdminClient.tsx (270 lines - main layout)
├── PayrollDashboard.tsx (180 lines)
├── StubsTable.tsx (200 lines)
├── PayrollFilters.tsx (150 lines)
└── index.ts
```

**index.ts re-export:**
```typescript
export { PayrollDashboard } from './PayrollDashboard';
export { StubsTable } from './StubsTable';
export { PayrollFilters } from './PayrollFilters';
```

**Original now:**
```typescript
import { PayrollDashboard, StubsTable, PayrollFilters } from './_components';

export function PayrollAdminClient() {
  // Main orchestration only
}
```

### Example 2: Extract Utils from TS File

**Before:** `src/utils/payrollCalculations.ts` (600 lines, mix of: gross calc, tax calc, deductions, formatting)

**Extract to:**
```
src/utils/payroll/
├── index.ts (re-exports)
├── gross.ts (gross pay logic)
├── taxes.ts (tax calculations)
├── deductions.ts (deduction logic)
├── formatting.ts (output formatting)
└── types.ts (types for this module)
```

**index.ts:**
```typescript
export * from './gross';
export * from './taxes';
export * from './deductions';
export * from './formatting';
export type * from './types';
```

**Usage updates:**
```typescript
// Before
import { calculateGross, calculateTaxes } from '~/utils/payrollCalculations';

// After
import { calculateGross, calculateTaxes } from '~/utils/payroll';
```

## Arguments

- **file-path** (required): Absolute path to file to break up
  - Example: `/mnt/c/Users/Bryan/Documents/NewReports/t3reports/src/components/Dashboard.tsx`

- **output-dir** (optional): Where to put extracted files
  - If omitted, infer from filename
  - Example: `src/components/Dashboard/` (if breaking up `Dashboard.tsx`)

## Output Summary

After completion, provide:

1. **Files Created**
   - List each new file with line count
   - Example: `_components/StubsTable.tsx (245 lines)`

2. **What Moved Where**
   - Table showing old location → new location
   - Show which code went where

3. **Import Updates**
   - Original file: what imports it has now
   - Any re-exports added
   - Files to check for external imports that need updating

4. **Manual Steps Needed**
   - Run eslint/biome if needed
   - Check circular imports
   - Verify no dead code left in original

## Key Rules

1. **Keep main export in original location** - Don't move the primary component/function
2. **Use `_components` and `_utils` conventions** - Leading underscore for "private" organizational directories
3. **Create `index.ts` for re-exports** - Makes imports cleaner
4. **Update all import paths** - Use `~/` absolute imports
5. **No circular imports** - Check dependency graph
6. **Remove dead code** - Don't leave orphaned code in original file
7. **Document with code comments** - If there's complex interdependency, add comments

## Anti-Patterns

- Don't create too many files (keep it <10 at same level)
- Don't split just to split - have a logical reason
- Don't use ambiguous filenames like `utils.ts` or `helpers.ts` at the root level
- Don't leave duplicate code in original file after extracting

## Related Skills

- **script-template** - If creating new utility scripts
- **scroll-area** - If breaking up UI component, might need to check ScrollArea usage
