import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: "linear-gradient(135deg, #280248 0%, #8F1E97 55%, #E86333 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: "bold", marginBottom: 20 }}>📐</div>
        <h1 style={{ fontSize: 80, margin: 0, fontWeight: 800, lineHeight: 1.2 }}>StudioMaker</h1>
        <p style={{ fontSize: 40, margin: "20px 0 0 0", opacity: 0.9, fontWeight: 500 }}>
          Gestão inteligente para makers e estúdios 3D
        </p>
        <p style={{ fontSize: 32, margin: "20px 0 0 0", opacity: 0.7 }}>
          Precificação • Pedidos • Estoque • Integrações
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
