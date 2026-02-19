import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "SubScout — 디지털 구독 관리",
  description: "흩어진 구독을 한눈에. Gmail 자동 스캔으로 숨어있는 구독을 찾아드립니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔍</text></svg>" />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
