import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const enablePlausible =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_ENABLE_PLAUSIBLE === "true";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "News Box",
    template: "%s | News Box",
  },
  description: "聚合全球科技、AI、自然科学与天文学新闻，提供中文 AI 摘要与每日重点。",
  keywords: ["AI新闻", "科技新闻", "科学新闻", "天文新闻", "arXiv", "OpenRouter", "News Box"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "News Box",
    description: "每天快速浏览最重要的科技与科学突破。",
    siteName: "News Box",
    locale: "zh_CN",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "News Box",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "News Box",
    description: "全球科技与科学新闻聚合，AI 自动摘要。",
    images: ["/opengraph-image"],
  },
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
      <head>
        {enablePlausible ? (
          <>
            <Script
              defer
              data-domain="news-box-production.up.railway.app"
              src="https://plausible.io/js/script.js"
              strategy="afterInteractive"
            />
          </>
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
