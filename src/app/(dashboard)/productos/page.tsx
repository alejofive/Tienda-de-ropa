import Link from "next/link";
import { Plus } from "lucide-react";
import { loadData } from "@/lib/data";
import { Alert, Empty, Heading } from "@/components/ui";
import { ProductCatalog } from "@/components/product-catalog";

export default async function Products({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { products, variants } = await loadData();
  const { error, ok } = await searchParams;
  return <><Heading eyebrow="TU CATÁLOGO" title="Productos" description={`${products.length} ${products.length === 1 ? "producto" : "productos"} en tu tienda`} action={<Link className="button primary" href="/productos/nuevo"><Plus size={18} /> Agregar producto</Link>} /><Alert error={error} ok={ok} />{products.length ? <ProductCatalog products={products} variants={variants} /> : <Empty title="Tu catálogo comienza aquí" description="Agrega tu primera prenda con foto, precios y existencias." href="/productos/nuevo" action="Agregar producto" />}</>;
}
