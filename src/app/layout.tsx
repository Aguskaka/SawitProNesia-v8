import type { Metadata, Viewport } from "next";
import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SawitProNesia",
    template: "%s | SawitProNesia",
  },
  description: "Manajemen operasional, produksi, biaya dan analitik kebun sawit dalam satu aplikasi.",
  applicationName: "SawitProNesia",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SawitProNesia",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#064e3b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
