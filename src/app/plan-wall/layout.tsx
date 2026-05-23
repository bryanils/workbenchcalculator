import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan a wall — Workbench Calculator",
};

export default function PlanWallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
