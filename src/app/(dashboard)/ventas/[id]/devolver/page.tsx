import { notFound } from "next/navigation";
import { loadData, paid } from "@/lib/data";
import { money } from "@/lib/format";
import { Alert, Back, Heading } from "@/components/ui";
import { SaleReturnForm } from "@/components/sale-return-form";

export default async function ReturnSale({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const { id } = await params;
  const { error, mode } = await searchParams;
  const { sales, items, payments, returns, returnItems } = await loadData();
  const sale = sales.find(s => s.id === id);
  if (!sale) notFound();
  const available = items.filter(item => item.sale_id === id).map(item => ({
    ...item, available: item.quantity - returnItems.filter(row => row.item_id === item.id).reduce((sum, row) => sum + row.quantity, 0),
  })).filter(item => item.available > 0);

  return <div className="narrow-page"><Back href={`/ventas/${id}`} /><Heading title={mode === "cancel" ? "Anular venta" : "Registrar devolución"}
    description={`Venta por ${money(sale.total)} · Elige las unidades que regresan a tu inventario.`} />
    <Alert error={error} />
    {sale.cancelled_at || !available.length ? <div className="form-card"><h2>Esta venta ya está anulada</h2><p className="muted">No quedan prendas por devolver.</p></div>
      : <SaleReturnForm key={mode === "cancel" ? "cancel" : "return"} sale={sale} items={available} paidNet={paid(id, payments, returns)} requestId={crypto.randomUUID()} cancel={mode === "cancel"} />}
  </div>;
}
