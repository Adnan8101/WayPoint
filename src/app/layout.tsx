import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RevealObserver } from "@/components/motion";
import { AskPalette } from "@/features/assistant/ask-palette";
import { Translator } from "@/features/i18n/translator";
import { SITE } from "@/lib/site";

const heading = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const body = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const code = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: Flight Status, Train Running Status & PNR`, template: `%s · ${SITE.name}` },
  description:
    "Check live flight status, track flights, check Indian Railways PNR status, train running status, trains between stations, schedules and airport and station information.",
  openGraph: { type: "website", siteName: SITE.name },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0d10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${heading.variable} ${body.variable} ${code.variable}`} suppressHydrationWarning>
      <head>
        {/* Lets CSS hide reveal-on-scroll content only when JS will reveal it */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-signal focus:px-3 focus:py-2 focus:font-semibold">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        <RevealObserver />
        <AskPalette />
        <Translator />
      </body>
    </html>
  );
}
