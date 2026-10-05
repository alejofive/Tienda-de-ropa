import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mi Tienda | Tu negocio en orden",
  description: "Productos, ventas y abonos para tu tienda de ropa.",
  applicationName: "Mi Tienda",
  appleWebApp: { capable: true, title: "Mi Tienda", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#315b44" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body className="antialiased">{children}<ServiceWorkerRegistration /></body></html>; }
