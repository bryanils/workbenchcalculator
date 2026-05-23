"use client";

import { useEffect, useState } from "react";

import Home from "~/components/home/Home";
import HomeV2 from "~/components/home/HomeV2";
import HomeV3 from "~/components/home/HomeV3";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

const STORAGE_KEY = "wbc.layout-version";
type LayoutVersion = "v1" | "v2" | "v3";
const VERSIONS: { id: LayoutVersion; title: string }[] = [
  { id: "v1", title: "Original layout" },
  { id: "v2", title: "Persistent-preview layout" },
  { id: "v3", title: "Workshop / blueprint layout" },
];

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
      {version === "v3" ? <HomeV3 /> : version === "v2" ? <HomeV2 /> : <Home />}

      <ToggleGroup
        type="single"
        value={version}
        onValueChange={(v) => {
          if (v === "v1" || v === "v2" || v === "v3") setAndStore(v);
        }}
        variant="outline"
        size="sm"
        aria-label="Layout version"
        className="no-print fixed bottom-4 right-4 z-50 rounded-full border border-input bg-card shadow-lg"
      >
        {VERSIONS.map((v) => (
          <ToggleGroupItem
            key={v.id}
            value={v.id}
            title={v.title}
            className="rounded-full font-mono text-[10px] uppercase tracking-[0.15em] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {v.id}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  );
}
