import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "~/lib/utils"

function TooltipProvider({
  delayDuration = 1000,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [pinned, setPinned] = React.useState(false)
  const [hoverOpen, setHoverOpen] = React.useState(false)

  const isOpen = controlledOpen ?? (pinned || hoverOpen)

  const handleOpenChange = (nextOpen: boolean) => {
    if (pinned) return
    setHoverOpen(nextOpen)
    controlledOnOpenChange?.(nextOpen)
  }

  React.useEffect(() => {
    if (!pinned) return
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-slot="tooltip-trigger"]') || target.closest('[data-slot="tooltip-content"]')) return
      setPinned(false)
      setHoverOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [pinned])

  return (
    <TooltipProvider>
      <TooltipPrimitive.Root
        data-slot="tooltip"
        open={isOpen}
        onOpenChange={handleOpenChange}
        data-pinned={pinned || undefined}
        {...props}
      >
        <PinContext.Provider value={{ pinned, setPinned }}>
          {props.children}
        </PinContext.Provider>
      </TooltipPrimitive.Root>
    </TooltipProvider>
  )
}

const PinContext = React.createContext<{ pinned: boolean; setPinned: (v: boolean) => void }>({ pinned: false, setPinned: () => {} })

function TooltipTrigger({
  onClick,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const { pinned, setPinned } = React.useContext(PinContext)
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onClick={(e) => {
        setPinned(!pinned)
        onClick?.(e)
      }}
      {...props}
    />
  )
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "text-card-foreground border-border/50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur-sm [background:color-mix(in_srgb,var(--card)_70%,transparent)]",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] [fill:color-mix(in_srgb,var(--card)_80%,transparent)] [background:color-mix(in_srgb,var(--card)_80%,transparent)]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
