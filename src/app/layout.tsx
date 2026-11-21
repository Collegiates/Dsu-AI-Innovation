import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_NAME } from "@/lib/config/app";
import "./globals.css";

// Serif display font for page titles and big numbers; clean sans for everything else.
const display = Fraunces({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600"] });
const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Buy your weekly groceries for less, using stores already on your commute.",
};

/**
 * The frame every page sits inside: loads the fonts, sets the tab title, and draws the sidebar and top bar.
 * Example: visiting /trip renders the Trip Plan page inside this frame.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
