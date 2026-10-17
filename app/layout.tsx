import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: `${SITE_NAME}: PM, APM and product internship jobs`,
  description: `${SITE_TAGLINE} India and remote roles, AI resume match, and a daily email.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F7FB" },
    { media: "(prefers-color-scheme: dark)", color: "#10152B" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
