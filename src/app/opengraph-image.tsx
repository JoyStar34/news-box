import { ImageResponse } from "next/og";

export const alt = "News Box - 过去 24 小时科技与科学要闻";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
          color: "#ffffff",
          padding: "56px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 30, opacity: 0.85 }}>News Box</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>Today in Science</div>
          <div style={{ fontSize: 34, opacity: 0.92 }}>全球科技、AI、科学与天文新闻聚合</div>
          <div style={{ fontSize: 28, opacity: 0.82 }}>AI 自动摘要 · 24h 重点精选</div>
        </div>
      </div>
    ),
    size,
  );
}

