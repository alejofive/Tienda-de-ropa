import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Mi Tienda",
    short_name: "Mi Tienda",
    description: "Productos, ventas y abonos para tu tienda de ropa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f4",
    theme_color: "#315b44",
    lang: "es-CO",
    icons: [192, 512].flatMap((size) => ([
      { src: `/icons/${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" as const },
      { src: `/icons/${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" as const },
    ])),
  };
}
