import { ImageResponse } from "next/og";

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (size !== 192 && size !== 512) return new Response(null, { status: 404 });

  return new ImageResponse(
    <div style={{ background: "#315b44", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 4 4 2 3 5-4 2-1-2v10H6V11l-1 2-4-2 3-5 4-2c.7 1.4 2.2 2 4 2s3.3-.6 4-2Z" />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
