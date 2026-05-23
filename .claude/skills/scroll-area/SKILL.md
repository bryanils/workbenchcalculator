---
name: scroll-area
description: Correctly implement shadcn ScrollArea component. Use when adding scrollable containers, scrollable tables, or when the user mentions scroll, overflow, or scrollable content.
allowed-tools: Read, Edit, Write, Glob, Grep
---

# ScrollArea Implementation Guide

The shadcn ScrollArea component wraps Radix UI's scroll primitives. It provides custom styled scrollbars but has specific layout requirements that MUST be followed.

## Pattern Files (READ THE RELEVANT ONE)

| Pattern | File | Key Point |
|---------|------|-----------|
| **Horizontal Scroll** | `patterns/horizontal-scroll.md` | FIXED WIDTH parent required |

## Critical Rules

### 1. ScrollArea MUST Have Explicit Height

ScrollArea cannot infer its height. You MUST give it a height constraint:

```tsx
// CORRECT - explicit height
<ScrollArea className="h-full">
  {content}
</ScrollArea>

// CORRECT - fixed height
<ScrollArea className="h-64">
  {content}
</ScrollArea>

// WRONG - no height (will not scroll!)
<ScrollArea>
  {content}
</ScrollArea>
```

### 2. Parent Must Have Proper Height Constraints

The parent container must constrain its height using the flex pattern:

```tsx
// CORRECT - parent has min-h-0 flex-1 to contain overflow
<div className="flex min-h-0 flex-1 flex-col">
  <ScrollArea className="h-full">
    {content}
  </ScrollArea>
</div>

// WRONG - parent has no height constraint
<div className="flex flex-col">
  <ScrollArea className="h-full">
    {content}
  </ScrollArea>
</div>
```

### 3. Horizontal Scrolling Requires FIXED WIDTH Parent

**READ `patterns/horizontal-scroll.md` FOR DETAILS**

Parent container MUST have:
1. **FIXED WIDTH** like `max-w-lg` (NOT `w-full`, NOT `max-w-full`)
2. **`overflow-hidden`** to clip children

```tsx
// CORRECT
<div className="max-w-lg overflow-hidden">
  <ScrollArea className="w-full">
    <pre>{wideContent}</pre>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
</div>

// WRONG - w-full does NOT constrain, content pushes off screen
<div className="w-full overflow-hidden">
  <ScrollArea className="w-full">
    <pre>{wideContent}</pre>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
</div>
```

## Common Patterns

### Pattern 1: Scrollable Card Content

```tsx
<Card className="flex h-full min-h-0 flex-col">
  <CardContent className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 rounded-md border">
      <ScrollArea className="h-full">
        {content}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  </CardContent>
</Card>
```

### Pattern 2: Scrollable Table in Tab Content

```tsx
<TabsContent value="detail" className="min-h-0 flex-1 rounded-md border">
  <ScrollArea className="h-full">
    <Table>
      {/* table content */}
    </Table>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
</TabsContent>
```

### Pattern 3: Wide Data Table (Horizontal Only)

```tsx
<ScrollArea className="w-full rounded-lg border">
  <Table>
    <TableHeader>
      {/* many columns */}
    </TableHeader>
    <TableBody>
      {/* rows */}
    </TableBody>
  </Table>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

### Pattern 4: Both Vertical AND Horizontal Scrolling

The shadcn ScrollArea component already includes a vertical ScrollBar by default.
To enable BOTH directions, just add the horizontal ScrollBar:

```tsx
<ScrollArea className="h-[400px] w-full rounded-lg border">
  <div className="w-[800px]">
    {/* content wider than container */}
    {/* content taller than 400px */}
  </div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

For tables that need both directions:

```tsx
<div className="min-h-0 flex-1 rounded-md border">
  <ScrollArea className="h-full">
    <Table className="w-[1200px]"> {/* or min-w-max */}
      <TableHeader>
        {/* many columns */}
      </TableHeader>
      <TableBody>
        {/* many rows */}
      </TableBody>
    </Table>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
</div>
```

Note: The shadcn component (using Radix Primitives) requires explicit ScrollBar children.
Radix Themes has a simpler `scrollbars="both"` prop, but we use Primitives here.

## Common Mistakes

### Mistake 1: No Height on ScrollArea

```tsx
// BROKEN - ScrollArea grows infinitely, never scrolls
<ScrollArea>
  <div>{longContent}</div>
</ScrollArea>

// FIXED
<ScrollArea className="h-full">
  <div>{longContent}</div>
</ScrollArea>
```

### Mistake 2: Parent Doesn't Constrain Height

```tsx
// BROKEN - h-full refers to unconstrained parent
<div className="flex flex-col">
  <ScrollArea className="h-full">
    {content}
  </ScrollArea>
</div>

// FIXED - min-h-0 prevents flex child from growing
<div className="flex min-h-0 flex-1 flex-col">
  <ScrollArea className="h-full">
    {content}
  </ScrollArea>
</div>
```

### Mistake 3: Using overflow-auto Instead

```tsx
// WRONG - don't use native overflow, use ScrollArea
<div className="h-full overflow-auto">
  {content}
</div>

// CORRECT - use ScrollArea for consistent styling
<ScrollArea className="h-full">
  {content}
</ScrollArea>
```

## When NOT to Use ScrollArea

- Page-level scrolling (pages use `h-full overflow-auto` on their wrapper)
- Simple dropdowns (use native scroll)

## Reference Files in This Codebase

Good examples:
- `src/app/(authenticated)/admin/snapshots/_components/SnapshotTableWrapper.tsx` - tabs with scrollable tables
- `src/app/(authenticated)/reports/_components/NewLoans/NewLoansTable.tsx` - horizontal scrolling table

Import from:
```tsx
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
```
