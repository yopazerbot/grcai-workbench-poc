import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GRC Agent Workbench",
  description: "AI-drafted GRC work products, reviewed and approved by analysts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
