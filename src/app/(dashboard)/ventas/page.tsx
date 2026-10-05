import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { loadData, balance, paid } from "@/lib/data";
import { dateLabel, money } from "@/lib/format";
import { Alert, Empty, Heading, SaleStatus } from "@/components/ui";
export default async function Sales({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { sales, customers, payments } = await loadData(); const { error, ok } = await searchParams;
  return <><Heading eyebrow="MOVIMIENTOS" title="Ventas" description="Cada compra, lo que pagaron y lo que queda pendiente." action={<Link className="button primary" href="/ventas/nueva"><Plus size={18} /> Nueva venta</Link>} /><Alert error={error} ok={ok} />{sales.length ? <section className="panel customer-panel"><div className="row-list">{sales.map(s => <Link key={s.id} href={`/ventas/${s.id}`} className="list-row customer-row"><span className="avatar muted-avatar">✳</span><span className="list-primary"><strong>{s.customer_id ? customers.find(c => c.id === s.customer_id)?.name ?? "Cliente" : "Venta de mostrador"}</strong><small>{dateLabel(s.created_at)} · Pagado {money(paid(s.id, payments))}</small></span><span className="row-end"><strong>{money(s.total)}</strong><SaleStatus balance={balance(s, payments)} total={s.total} /></span><ArrowRight size={18} className="row-arrow" /></Link>)}</div></section> : <Empty title="Aún no hay ventas" description="Registra tu primera venta; puedes recibir un pago inicial o dejar todo pendiente." href="/ventas/nueva" action="Nueva venta" />}</>;
}
