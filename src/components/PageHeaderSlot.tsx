"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

let outletEl: HTMLElement | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((fn) => fn());
const subscribe = (fn: () => void) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export function PageHeaderOutlet({ className }: { className?: string }) {
  return (
    <div
      ref={(el) => {
        outletEl = el;
        notify();
      }}
      className={className}
    />
  );
}

export function PageHeaderSlot({ children }: { children: React.ReactNode }) {
  const el = useSyncExternalStore(
    subscribe,
    () => outletEl,
    () => null,
  );
  if (!el) return null;
  return createPortal(children, el);
}
