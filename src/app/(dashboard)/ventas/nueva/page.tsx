import { loadData } from "@/lib/data";
import { Alert, Back, Empty, Heading } from "@/components/ui";
import { SaleForm } from "@/components/sale-form";
export default async function NewSale({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { products, variants, customers } = await loadData(); const { error } = await searchParams;
  return <><Back href="/ventas" /><Heading title="Nueva venta" description="Elige la prenda, su color y talla; luego registra cómo pagará." /><Alert error={error} />{!products.some(p => p.stock > 0) ? <Empty title="Primero agrega productos" description="Necesitas al menos una prenda con unidades disponibles." href="/productos/nuevo" action="Agregar producto" /> : <SaleForm customers={customers} products={products.filter(p => p.stock > 0)} variants={variants} />}</>;
}
