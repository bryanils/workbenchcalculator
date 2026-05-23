"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";

type Theme = "light" | "dark" | "system";

type Props = {
  className?: string;
  duration?: number;
};

export function ThemeToggle({ className, duration = 600 }: Props) {
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
          duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    },
    [theme, setTheme, duration],
  );

  const active = mounted ? ((theme as Theme) ?? "system") : "system";

  return (
    <ButtonGroup
      className={cn(
        "rounded-md border border-input bg-background shadow-xs",
        className,
      )}
    >
      <Button
        type="button"
        variant={active === "light" ? "default" : "ghost"}
        size="icon-sm"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handle("light", e)}
        aria-label="Light theme"
        className="rounded-l-md rounded-r-none border-0 shadow-none hover:bg-secondary"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={active === "dark" ? "default" : "ghost"}
        size="icon-sm"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handle("dark", e)}
        aria-label="Dark theme"
        className="rounded-none border-0 border-l border-input shadow-none hover:bg-secondary"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={active === "system" ? "default" : "ghost"}
        size="icon-sm"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handle("system", e)}
        aria-label="System theme"
        className="rounded-r-md rounded-l-none border-0 border-l border-input shadow-none hover:bg-secondary"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </ButtonGroup>
  );
}
