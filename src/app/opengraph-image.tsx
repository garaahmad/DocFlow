import { ImageResponse } from "next/og";
export const alt = "DocFlow AI — From Documents to Decisions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Opengraph() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "linear-gradient(140deg,#1b1232,#4b2da7)",
        color: "#fff",
        flexDirection: "column",
        justifyContent: "center",
        padding: 84,
        gap: 34,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 36,
          fontWeight: 700,
        }}
      >
        <span
          style={{
            display: "flex",
            borderRadius: 12,
            padding: 10,
            background: "#7957ec",
          }}
        >
          DF
        </span>{" "}
        DocFlow AI
      </div>
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -4,
          whiteSpace: "pre-wrap",
        }}
      >
        {"Turn Documents Into\nActionable Intelligence."}
      </div>
      <div style={{ fontSize: 30, color: "#e3d9ff" }}>
        From Documents to Decisions.
      </div>
    </div>,
    size,
  );
}
