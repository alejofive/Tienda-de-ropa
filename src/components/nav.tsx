"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Package, ReceiptText, Users, ChartNoAxesCombined, Plus, Shirt } from "lucide-react";

const links = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/ventas", label: "Ventas", icon: ReceiptText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/reportes", label: "Reportes", icon: ChartNoAxesCombined },
];
export function Nav() {
  const pathname = usePathname();
  return <>
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-icon"><Shirt size={23} /></span><span>mi tienda<small>GESTIÓN SIMPLE</small></span></Link>
      <p className="side-caption">MENÚ PRINCIPAL</p>
      <nav className="side-links">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`side-link ${pathname === href || href !== "/" && pathname.startsWith(href) ? "active" : ""}`}><Icon size={20} strokeWidth={1.9} />{label}</Link>)}</nav>
      <Link href="/ventas/nueva" className="button primary sidebar-action"><Plus size={19} /> Nueva venta</Link>
      <div className="sidebar-foot">Hecho para llevar tu negocio<br />con tranquilidad ✳</div>
    </aside>
    <nav className="bottom-nav" aria-label="Navegación principal">{links.slice(0, 4).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href || href !== "/" && pathname.startsWith(href) ? "active" : ""}><Icon size={21} strokeWidth={1.9} /><span>{label}</span></Link>)}</nav>
  </>;
}
