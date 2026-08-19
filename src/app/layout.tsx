import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SawitProNesia v8",
  description: "Owner-centric palm plantation operations platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
