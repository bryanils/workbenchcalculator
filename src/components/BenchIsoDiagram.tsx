// Public entry for the 3D bench overview. The real renderer is r3f-based
// and requires WebGL, so we ship it as a client-only dynamic import. The
// SSR fallback is a sized placeholder card so layout doesn't jump.

import dynamic from "next/dynamic";

import type { BenchConfig } from "~/lib/types";
import type { Unit } from "~/lib/units";
import { Card } from "~/components/ui/card";

type Props = {
  config: BenchConfig;
  unit: Unit;
};

const BenchIso3D = dynamic(
  () => import("./BenchIso3D").then((m) => m.BenchIso3D),
  {
    ssr: false,
    loading: () => (
      <Card className="p-3">
        <div className="mb-1 text-sm font-semibold text-card-foreground">
          Bench overview (3D)
        </div>
        <div className="flex aspect-[16/10] w-full items-center justify-center rounded-md bg-gradient-to-b from-stone-100 to-stone-300 text-xs text-muted-foreground dark:from-stone-900 dark:to-stone-950">
          loading 3D view…
        </div>
      </Card>
    ),
  },
);

export function BenchIsoDiagram(props: Props) {
  return <BenchIso3D {...props} />;
}
