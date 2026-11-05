import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import SuiteLinks from "@/components/SuiteLinks";
import { siteUrl } from "@/lib/suite";
import "./globals.css";

const SITE_URL = siteUrl("prereqs");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "UC Berkeley EECS Prereqs",
  description: "The prerequisites for every UC Berkeley EECS course, with the full chain and what each one unlocks.",
  openGraph: {
    title: "UC Berkeley EECS Prereqs",
    description: "The prerequisites for every UC Berkeley EECS course, with the full chain and what each one unlocks.",
    url: "/",
    siteName: "EECS Hub",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SuiteLinks />
        <Analytics />
      </body>
    </html>
  );
}
