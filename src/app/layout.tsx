import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Mi Tienda | Tu negocio en orden", description: "Productos, ventas y abonos para tu tienda de ropa." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body className="antialiased">{children}</body></html>; }
