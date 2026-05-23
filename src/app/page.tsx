"use client";

import { useEffect, useState } from "react";

import Home from "~/components/home/Home";
import HomeV2 from "~/components/home/HomeV2";
import HomeV3 from "~/components/home/HomeV3";
import { PageHeaderSlot } from "~/components/PageHeaderSlot";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

const STORAGE_KEY = "wbc.layout-version";
type LayoutVersion = "v1" | "v2" | "v3";

export default function Page() {
  const [version, setVersion] = useState<LayoutVersion>("v3");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "v1" || saved === "v2" || saved === "v3") setVersion(saved);
    setHydrated(true);
  }, []);

  const setAndStore = (v: LayoutVersion) => {
    setVersion(v);
    window.localStorage.setItem(STORAGE_KEY, v);
  };

  if (!hydrated) {
    return <div className="flex-1" />;
  }

  return (
    <>
      <PageHeaderSlot>
        <div className="ml-auto flex items-center">
          <ToggleGroup
            type="single"
            value={version}
            onValueChange={(v) => {
              if (v === "v1" || v === "v2" || v === "v3") setAndStore(v);
            }}
            variant="outline"
            size="sm"
            className="no-print"
            aria-label="Layout version"
          >
            <ToggleGroupItem
              value="v1"
              className="font-mono text-[10px] uppercase tracking-[0.15em] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              title="Original layout"
            >
              v1
            </ToggleGroupItem>
            <ToggleGroupItem
              value="v2"
              className="font-mono text-[10px] uppercase tracking-[0.15em] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              title="Persistent-preview layout"
            >
              v2
            </ToggleGroupItem>
            <ToggleGroupItem
              value="v3"
              className="font-mono text-[10px] uppercase tracking-[0.15em] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              title="Workshop / blueprint layout"
            >
              v3
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </PageHeaderSlot>

      {version === "v3" ? <HomeV3 /> : version === "v2" ? <HomeV2 /> : <Home />}
    </>
  );
}
