import Image from "next/image";
import Link from "next/link";
import { Hammer, Ruler } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { ThemeToggle } from "~/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="no-print w-full shrink-0 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/favicon.png"
            alt="Workbench Calculator logo"
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-md shadow-sm"
          />
          <span className="text-base font-semibold tracking-tight">
            Workbench Calculator
          </span>
        </Link>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <Hammer className="mr-1 size-4" />
              Calculator
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/plan-wall">
              <Ruler className="mr-1 size-4" />
              Plan a wall
            </Link>
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
