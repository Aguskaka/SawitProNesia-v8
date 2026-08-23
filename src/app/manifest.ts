import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SawitProNesia — Manajemen Kebun Sawit",
    short_name: "SawitProNesia",
    description: "Manajemen operasional, produksi, biaya dan analitik kebun sawit.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7f2",
    theme_color: "#064e3b",
    orientation: "any",
    lang: "id-ID",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Catat Aktivitas",
        short_name: "Aktivitas",
        description: "Buka pencatatan aktivitas kebun",
        url: "/aktivitas",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Catat Panen",
        short_name: "Panen",
        description: "Buka pencatatan panen",
        url: "/panen",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Pemupukan",
        short_name: "Pupuk",
        description: "Buka kontrol pemupukan",
        url: "/pupuk",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
