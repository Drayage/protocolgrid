import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "Protocol: Grid — 전술 카드게임";
  const description = "5대5 전술 카드게임: 지속 교전, 역할 덱, 스파이크, 라운드 경제를 PC와 모바일에서 플레이하세요.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1730, height: 909, alt: "Protocol: Grid 전술 지도와 카드" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
