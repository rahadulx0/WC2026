import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { themeScript, ThemeWatcher } from "@/components/theme";

export const metadata: Metadata = {
  title: {
    default: "FIFA World Cup 2026 Live Center",
    template: "%s · WC 2026 Live Center",
  },
  description:
    "Live scores, fixtures, standings, knockout bracket, teams, players and venues for the FIFA World Cup 2026 across the USA, Canada and Mexico.",
  keywords: ["FIFA World Cup 2026", "live scores", "fixtures", "standings", "bracket"],
  openGraph: {
    title: "FIFA World Cup 2026 Live Center",
    description: "Live scores, fixtures, standings and more for the 2026 World Cup.",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "WC 2026",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <ThemeWatcher />
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
