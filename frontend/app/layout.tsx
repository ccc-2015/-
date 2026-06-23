import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "河南高考智能报考 Agent",
  description: "面向 2026 年河南普通类高考生的智能志愿填报辅助系统"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
