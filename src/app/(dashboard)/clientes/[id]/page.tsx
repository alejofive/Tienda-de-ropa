import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Phone, Plus } from "lucide-react";
import { loadData, balance } from "@/lib/data";
import { money, dateLabel } from "@/lib/format";
import { Alert, Back, Empty, Heading, SaleStatus } from "@/components/ui";
export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params; const { error, ok } = await searchParams;
  const { customers, sales, payments } = await loadData(); const customer = customers.find(c => c.id === id); if (!customer) notFound();
  const customerSales = sales.filter(s => s.customer_id === id); const owed = customerSales.reduce((sum, s) => sum + balance(s, payments), 0);
  const receipts = payments.filter(p => customerSales.some(s => s.id === p.sale_id));
  return <><Back href="/clientes" /><Heading eyebrow="FICHA DE CLIENTE" title={customer.name} description={customer.phone || "Compras y pagos de este cliente"} action={<Link className="button primary" href="/ventas/nueva"><Plus size={18} /> Nueva venta</Link>} /><Alert error={error} ok={ok} /><div className="customer-top"><div className="customer-debt"><span>Saldo pendiente</span><strong>{money(owed)}</strong><small>{customerSales.filter(s => balance(s, payments) > 0).length} ventas por pagar</small></div><div className="customer-info"><span className="avatar large">{customer.name.charAt(0).toUpperCase()}</span><div><strong>{customer.name}</strong><p><Phone size={15} /> {customer.phone || "Sin teléfono registrado"}</p><p>{customerSales.length} {customerSales.length === 1 ? "compra registrada" : "compras registradas"}</p></div></div></div>
    <div className="dashboard-columns"><section className="panel"><div className="panel-header"><div><span className="eyebrow">HISTORIAL</span><h2>Sus compras</h2></div></div>{customerSales.length ? <div className="row-list">{customerSales.map(s => <Link href={`/ventas/${s.id}`} className="list-row" key={s.id}><span className="list-primary"><strong>Venta · {dateLabel(s.created_at)}</strong><small>Total {money(s.total)}</small></span><span className="row-end"><strong>{money(balance(s, payments))}</strong><SaleStatus balance={balance(s, payments)} total={s.total} /></span><ArrowRight size={17} className="row-arrow" /></Link>)}</div> : <Empty title="Sin compras todavía" description="Cuando registres una venta aparecerá aquí." href="/ventas/nueva" action="Nueva venta" />}</section>
    <section className="panel"><div className="panel-header"><div><span className="eyebrow">DINERO RECIBIDO</span><h2>Sus abonos</h2></div></div>{receipts.length ? <div className="row-list">{receipts.map(p => <Link href={`/ventas/${p.sale_id}`} className="list-row" key={p.id}><span className="avatar muted-avatar">$</span><span className="list-primary"><strong>Abono recibido</strong><small>{dateLabel(p.paid_at)}</small></span><strong className="positive-value">+ {money(p.amount)}</strong></Link>)}</div> : <Empty title="Sin abonos todavía" description="Los pagos recibidos se mostrarán aquí." />}</section></div>
    {owed > 0 && <div className="tip">Para registrar un abono, abre la compra correspondiente y toca «Registrar abono».</div>}
  </>;
}
