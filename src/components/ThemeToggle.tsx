import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

type Theme = "light" | "dark" | "system";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handle = useCallback(
    async (newTheme: Theme, event: React.MouseEvent<HTMLButtonElement>) => {
      if (!newTheme || newTheme === theme) return;

      const button = event.currentTarget;
      const supportsViewTransitions =
        typeof document !== "undefined" &&
        "startViewTransition" in document &&
        typeof (document as Document & { startViewTransition?: unknown })
          .startViewTransition === "function";

      if (!supportsViewTransitions) {
        setTheme(newTheme);
        return;
      }

      const transition = (
        document as unknown as {
          startViewTransition: (cb: () => void) => { ready: Promise<void> };
        }
      ).startViewTransition(() => {
        flushSync(() => setTheme(newTheme));
      });

      await transition.ready;

      const { top, left, width, height } = button.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const r = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top),
      );
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${r}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 600,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    },
    [theme, setTheme],
  );

  const active = mounted ? (theme as Theme) ?? "system" : "system";

  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-input bg-background shadow-xs",
        className,
      )}
      role="radiogroup"
      aria-label="Theme"
    >
      <Button
        type="button"
        variant={active === "light" ? "default" : "ghost"}
        size="icon-sm"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handle("light", e)}
        aria-label="Light theme"
        className="rounded-r-none border-r border-input"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={active === "dark" ? "default" : "ghost"}
        size="icon-sm"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handle("dark", e)}
        aria-label="Dark theme"
        className="rounded-none border-r border-input"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={active === "system" ? "default" : "ghost"}
        size="icon-sm"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handle("system", e)}
        aria-label="System theme"
        className="rounded-l-none"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  );
}
