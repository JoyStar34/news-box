import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const enablePlausible =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_ENABLE_PLAUSIBLE === "true";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "AI 机会雷达",
    template: "%s | AI 机会雷达",
  },
  description: "从全球 AI、科技、论文和产品动态中提取可执行机会，帮助独立开发者、内容团队和产品负责人发现下一步。",
  keywords: ["AI机会", "AI新闻", "独立开发", "AI产品", "科技趋势", "论文雷达", "News Box"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "AI 机会雷达",
    description: "把 AI 新闻变成可下注的机会清单。",
    siteName: "AI 机会雷达",
    locale: "zh_CN",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI 机会雷达",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 机会雷达",
    description: "每天扫描全球 AI 信号，提取机会指数、行动建议和商业化窗口。",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        {enablePlausible ? (
          <Script
            defer
            data-domain="news-box-production.up.railway.app"
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
