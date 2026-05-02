import { ImageResponse } from "next/og";

export const alt = "AI 机会雷达 - 把 AI 新闻变成可执行机会";
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
          background: "#f7f8f4",
          color: "#09090b",
          padding: "58px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 700 }}>
          <span>AI 机会雷达</span>
          <span style={{ color: "#047857" }}>PRO</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>把 AI 新闻变成可下注的机会清单</div>
          <div style={{ fontSize: 31, color: "#3f3f46" }}>机会指数 · 行动建议 · 商业化窗口 · 风险提示</div>
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: 24 }}>
          <span style={{ borderLeft: "6px solid #059669", paddingLeft: "14px" }}>产品化窗口</span>
          <span style={{ borderLeft: "6px solid #0284c7", paddingLeft: "14px" }}>内容红利</span>
          <span style={{ borderLeft: "6px solid #d97706", paddingLeft: "14px" }}>平台风险</span>
        </div>
      </div>
    ),
    size,
  );
}
