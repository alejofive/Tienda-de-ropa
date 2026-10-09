import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Plus, RotateCcw } from "lucide-react";
import { loadData, balance, paid } from "@/lib/data";
import { dateLabel, money } from "@/lib/format";
import { variantLabel } from "@/lib/variants";
import { Alert, Back, Heading, SaleStatus } from "@/components/ui";

export default async function SaleDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const { sales, customers, items, payments, returns, returnItems } = await loadData();
  const sale = sales.find(s => s.id === id);
  if (!sale) notFound();
  const customer = customers.find(c => c.id === sale.customer_id);
  const remaining = balance(sale, payments, returns);
  const receipts = payments.filter(p => p.sale_id === id);
  const history = returns.filter(r => r.sale_id === id);
  const saleItems = items.filter(i => i.sale_id === id);
  const active = saleItems.map(item => ({
    ...item, returned: returnItems.filter(row => row.item_id === item.id).reduce((sum, row) => sum + row.quantity, 0),
  }));

  return <><Back href="/ventas" />
    <Heading eyebrow={`VENTA · ${dateLabel(sale.created_at)}`} title={customer ? `Compra de ${customer.name}` : "Venta de mostrador"}
      description="Productos entregados, devoluciones y pagos." action={sale.cancelled_at
        ? <SaleStatus balance={0} total={0} cancelled />
        : remaining > 0 ? <Link href={`/ventas/${id}/abonar`} className="button primary"><Plus size={18} /> Registrar abono</Link>
          : <span className="button done"><Check size={18} /> Venta pagada</span>} />
    <Alert error={error} ok={ok} />
    {!sale.cancelled_at && <div className="sale-actions">
      <Link href={`/ventas/${id}/devolver`} className="button outline"><RotateCcw size={17} /> Devolver prendas</Link>
      <Link href={`/ventas/${id}/devolver?mode=cancel`} className="button outline">Anular venta completa</Link>
    </div>}
    <div className="sale-detail-grid"><section className="panel"><div className="panel-header"><div><span className="eyebrow">PRODUCTOS ENTREGADOS</span><h2>Detalle de la compra</h2></div><SaleStatus balance={remaining} total={sale.total} cancelled={!!sale.cancelled_at} /></div>
      <div className="detail-items">{active.map(item => <div key={item.id}><span><strong>{item.product_name}</strong>
        {variantLabel(item.variant_color, item.variant_size) && <small>{variantLabel(item.variant_color, item.variant_size)}</small>}
        <small>{item.quantity - item.returned} × {money(item.unit_price)}{item.returned > 0 ? ` · ${item.returned} devueltas` : ""}</small>
      </span><strong>{money((item.quantity - item.returned) * item.unit_price)}</strong></div>)}</div>
      <div className="detail-totals"><div><span>Total actual de la venta</span><strong>{money(sale.total)}</strong></div>
        <div><span>Pagado neto</span><strong>{money(paid(id, payments, returns))}</strong></div>
        <div className="detail-outstanding"><span>Queda por pagar</span><strong>{money(remaining)}</strong></div>
      </div>
    </section>
    <section className="panel"><div className="panel-header"><div><span className="eyebrow">DINERO RECIBIDO</span><h2>Pagos y devoluciones</h2></div></div>
      {receipts.length || history.length ? <div className="row-list">
        {receipts.map(p => <div key={p.id} className="list-row"><span className="avatar muted-avatar">$</span><span className="list-primary"><strong>{sale.customer_id ? "Abono" : "Pago completo"}</strong><small>{dateLabel(p.paid_at)}{p.note ? ` · ${p.note}` : ""}</small></span><strong className="positive-value">+ {money(p.amount)}</strong></div>)}
        {history.map(r => <div key={r.id} className="list-row"><span className="avatar muted-avatar">↩</span><span className="list-primary"><strong>{r.reason === "error" ? "Venta corregida" : "Devolución"}</strong>
          <small>{dateLabel(r.created_at)} · {money(r.total)} en prendas devueltas{r.refund ? ` · Reembolsado ${money(r.refund)}` : " · Sin reembolso"}</small>
          <small>{returnItems.filter(row => row.return_id === r.id).map(row => { const item = saleItems.find(i => i.id === row.item_id); return item ? `${row.quantity} × ${item.product_name}${variantLabel(item.variant_color, item.variant_size) ? ` (${variantLabel(item.variant_color, item.variant_size)})` : ""}` : ""; }).filter(Boolean).join(" · ")}</small>
        </span>{r.refund > 0 && <strong>- {money(r.refund)}</strong>}</div>)}
      </div> : <div className="empty-inline pad">Todavía no se han recibido pagos para esta venta.</div>}
      {customer && <Link href={`/clientes/${customer.id}`} className="panel-footer-link">Ver ficha de {customer.name} <ArrowRight size={16} /></Link>}
    </section></div>
  </>;
}
