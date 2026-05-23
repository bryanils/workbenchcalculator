"use client";

import { useEffect, useState } from "react";

import Home from "~/components/home/Home";
import HomeV2 from "~/components/home/HomeV2";

const STORAGE_KEY = "wbc.layout-version";

export default function Page() {
  const [version, setVersion] = useState<"v1" | "v2">("v2");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "v1" || saved === "v2") setVersion(saved);
    setHydrated(true);
  }, []);

  const setAndStore = (v: "v1" | "v2") => {
    setVersion(v);
    window.localStorage.setItem(STORAGE_KEY, v);
  };

  if (!hydrated) {
    return <div className="flex-1" />;
  }

  return (
    <>
      {version === "v2" ? <HomeV2 /> : <Home />}

      <div className="no-print fixed bottom-4 right-4 z-50 inline-flex overflow-hidden rounded-full border border-input bg-card shadow-lg">
        <button
          type="button"
          onClick={() => setAndStore("v1")}
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            version === "v1"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title="Original layout"
        >
          v1
        </button>
        <button
          type="button"
          onClick={() => setAndStore("v2")}
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            version === "v2"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title="Reworked layout"
        >
          v2
        </button>
      </div>
    </>
  );
}
