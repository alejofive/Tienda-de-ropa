import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ImageIcon } from "lucide-react";
import type { Product } from "@/lib/data";
import { money, imageUrl } from "@/lib/format";
import "./sale-status.css";

export function Alert({ error, ok }: { error?: string; ok?: string }) {
  return <>{error && <div className="alert error" role="alert">{error}</div>}{ok && <div className="alert success" role="status">{ok}</div>}</>;
}
export function Heading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="heading"><div><div className="eyebrow">{eyebrow || "MI TIENDA"}</div><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
}
export function Back({ href, label = "Volver" }: { href: string; label?: string }) { return <Link href={href} className="back"><ArrowLeft size={17} />{label}</Link>; }
export function Empty({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <div className="empty"><div className="empty-icon">✳</div><h3>{title}</h3><p>{description}</p>{href && <Link className="button primary" href={href}>{action}<ArrowRight size={17} /></Link>}</div>;
}
export function ProductPhoto({ product, className = "" }: { product: Pick<Product, "image_path" | "name">; className?: string }) {
  const url = imageUrl(product.image_path);
  return <div className={`product-photo ${className}`}>{url ? <Image src={url} alt={product.name} width={400} height={400} unoptimized /> : <ImageIcon size={29} strokeWidth={1.3} aria-label="Sin fotografía" />}</div>;
}
export function MoneyValue({ value, strong = false }: { value: number; strong?: boolean }) { return <span className={strong ? "money-strong" : ""}>{money(value)}</span>; }
export function SaleStatus({ balance, total, cancelled = false }: { balance: number; total: number; cancelled?: boolean }) { const label = cancelled ? "Anulada" : balance <= 0 ? "Pagada" : balance === total ? "Pendiente" : "Pago parcial"; return <span className={`badge ${cancelled ? "cancelled" : balance <= 0 ? "paid" : balance === total ? "pending" : "partial"}`}>{label}</span>; }
