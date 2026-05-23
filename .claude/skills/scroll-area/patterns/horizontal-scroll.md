# Horizontal Scrolling Pattern

## THE RULE

**Parent container MUST have FIXED WIDTH (`max-w-lg`, `max-w-md`, etc.) + `overflow-hidden`**

Without fixed width, ScrollArea expands to fit content and NEVER scrolls.

## CORRECT

```tsx
<div className="max-w-lg overflow-hidden">
  <ScrollArea className="w-full">
    <pre>{wideContent}</pre>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
</div>
```

## WRONG - These do NOT work

```tsx
// w-full does NOT constrain
<div className="w-full overflow-hidden">
  <ScrollArea>...</ScrollArea>
</div>

// max-w-full does NOT constrain
<div className="max-w-full overflow-hidden">
  <ScrollArea>...</ScrollArea>
</div>

// min-w-0 does NOT constrain
<div className="min-w-0 overflow-hidden">
  <ScrollArea>...</ScrollArea>
</div>
```

## Inside a Sheet

Sheet has `sm:max-w-lg`. Content container must match:

```tsx
<SheetContent className="overflow-hidden sm:max-w-lg">
  <SheetHeader>...</SheetHeader>

  <div className="min-h-0 flex-1 overflow-hidden">
    <ScrollArea className="h-full">
      <div className="max-w-lg overflow-hidden p-4">
        {/* Content with horizontal scroll */}
        <JsonViewer data={data} />
      </div>
    </ScrollArea>
  </div>
</SheetContent>
```

## Reference

Working example: `src/app/(authenticated)/admin/pipeline/_components/PipelineRunSheet.tsx`
