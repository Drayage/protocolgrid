import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Protocol: Grid — 전술 카드게임",
  description: "5대5 발로란트식 전술 카드게임의 웹 플레이 프로토타입",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
