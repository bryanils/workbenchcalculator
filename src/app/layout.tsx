import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { SiteHeader } from "~/components/SiteHeader";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { TRPCReactProvider } from "~/trpc/react";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Workbench Calculator — real plans, real cut lists",
  description:
    "Pick a real workbench style — Roubo, Moravian, Knockdown Nicholson, Garage Workhorse — set your dimensions, get a structurally-sound cut list, materials list, and step-by-step build directions.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TRPCReactProvider>
            <div className={`${geist.variable} flex h-screen flex-col overflow-hidden font-sans`}>
              <SiteHeader />
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </div>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
