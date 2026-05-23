---
name: breakup
description: Refactor large files by breaking them into smaller, organized pieces. Use when a file is too large and needs to be split into logical modules.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Breakup - File Splitter

Break up a large file into smaller, more maintainable pieces.

## Arguments

- **file path** (required): Absolute path to the file to break up
- **output directory** (optional): Directory to place the broken-up files. If not provided, create a directory based on the original filename (e.g., `theme.ts` → `themes/` directory)

## Process

### Step 1: Read and Analyze

Read the target file completely. Identify:
- All exports (named, default)
- Logical groupings (components, types, utilities, constants, etc.)
- Internal dependencies between pieces
- External imports

### Step 2: Plan the Split

**For TSX/JSX files:**
- Identify the main/primary component that should remain in the original file
- Extract smaller helper components into separate files
- Main component imports the extracted pieces
- Each extracted component gets its own file
- Maintain proper imports and types

**For TS files:**
- Analyze the file structure (functions, types, constants, classes)
- Group related code logically
- Create individual files for each logical unit
- Determine if an index file for re-exports is needed OR if there's a main file that should import the pieces
- Preserve all type safety and imports

### Step 3: Create Output Directory

Use the provided output directory, or infer from the filename:
- `theme.ts` → `themes/`
- `utils.ts` → `utils/`
- `MyComponent.tsx` → `MyComponent/`

### Step 4: Extract Files

For each logical unit:
1. Create the new file with proper imports
2. Move the relevant code
3. Export everything that was previously accessible

### Step 5: Update Original

Either:
- **Main file pattern**: Original file keeps the primary export, imports extracted pieces
- **Index file pattern**: Create `index.ts` that re-exports everything from the new files

### Step 6: Fix All Imports

Search the codebase for anything importing from the original file and update import paths if needed. If using an index re-export, existing imports should still work.

## Output

Provide a summary of:
- Files created
- What was moved where
- Any manual steps needed (e.g., imports in other files that may need updating)
