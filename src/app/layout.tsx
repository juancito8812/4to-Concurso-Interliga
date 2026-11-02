import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "./providers";
import RegisterSW from "./RegisterSW";
import Footer from "./Footer";
import AdminBackToPanel from "@/components/AdminBackToPanel";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://futbolcamisetapasion.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "4° Concurso Interliga | Temporada 2026-27",
  description:
    "Fútbol + Camiseta + Pasión. Elige tu equipo, pronostica y gana en el 4° Concurso Interliga.",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "4° Concurso Interliga",
    url: SITE_URL,
    title: "4° Concurso Interliga | Temporada 2026-27",
    description:
      "Fútbol + Camiseta + Pasión. Elige tu equipo, pronostica y gana en el 4° Concurso Interliga.",
    images: [{ url: "/logos/og-interliga.png", width: 1200, height: 630, alt: "4° Concurso Interliga" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "4° Concurso Interliga | Temporada 2026-27",
    description:
      "Fútbol + Camiseta + Pasión. Elige tu equipo, pronostica y gana en el 4° Concurso Interliga.",
    images: ["/logos/og-interliga.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Interliga",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "4° Concurso Interliga",
  url: SITE_URL,
  inLanguage: "es",
  description:
    "Concurso de pronósticos de fútbol con kit de camiseta de premio. Temporada 2026-27.",
};

export const viewport: Viewport = {
  themeColor: "#c9a84c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${dmSans.variable} h-full antialiased`}>
      <head>
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        {/* JSON-LD estático propio del sitio (literal, sin input externo) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://crests.football-data.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://upload.wikimedia.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://ilkndkqcmxvlufxaugog.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://crests.football-data.org" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
        <link rel="dns-prefetch" href="https://ilkndkqcmxvlufxaugog.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        <Providers>
          <main id="main-content" className="flex-1 flex flex-col">
            {children}
          </main>
          <AdminBackToPanel />
        </Providers>
        <Footer />
      </body>
    </html>
  );
}
