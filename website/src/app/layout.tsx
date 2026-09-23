import type { Metadata } from "next";
import { Cormorant_Garamond, Karla } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { site } from "@/lib/content";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-karla",
  display: "swap",
});

export const metadata: Metadata = {
  // Makes the share-preview image an absolute URL on the live domain.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://weland.dranzo.com"),
  title: `${site.name}, Kakkadampoyil — ${site.tagline}`,
  description: site.description,
  openGraph: {
    title: `${site.name}, Kakkadampoyil`,
    images: [{ url: "/images/hero-sunset-deck.jpg" }],
    description: site.description,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${karla.variable}`}>
      <body>
        <Navbar />
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  );
}
