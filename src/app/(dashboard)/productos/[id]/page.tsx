import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { loadData } from "@/lib/data";
import { money } from "@/lib/format";
import { Alert, Back, Heading, ProductPhoto } from "@/components/ui";
import { ProductForm } from "@/components/product-form";
export default async function ProductDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params; const { error, ok } = await searchParams;
  const { products, variants } = await loadData(); const product = products.find(p => p.id === id); if (!product) notFound();
  return <div className="narrow-page"><Back href="/productos" /><Heading title={product.name} description="Consulta las tallas, colores y existencias de esta prenda." /><Alert error={error} ok={ok} /><div className="product-detail-summary"><ProductPhoto product={product} /><span><strong>{money(product.price)}</strong><small><PackageCheck size={15} /> {product.stock} unidades disponibles</small></span></div><ProductForm product={product} variants={variants.filter(variant => variant.product_id === product.id)} /></div>;
}
