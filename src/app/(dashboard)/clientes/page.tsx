import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { loadData, balance } from "@/lib/data";
import { money } from "@/lib/format";
import { Alert, Empty, Heading } from "@/components/ui";
export default async function Customers({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { customers, sales, payments } = await loadData(); const { error, ok } = await searchParams;
  return <><Heading eyebrow="PERSONAS" title="Clientes" description="Sus compras y lo que queda por pagar, en un solo lugar." action={<Link className="button primary" href="/clientes/nuevo"><Plus size={18} /> Agregar cliente</Link>} /><Alert error={error} ok={ok} />{customers.length ? <section className="panel customer-panel"><div className="row-list">{customers.map(c => { const customerSales = sales.filter(s => s.customer_id === c.id); const owed = customerSales.reduce((sum, s) => sum + balance(s, payments), 0); return <Link className="list-row customer-row" href={`/clientes/${c.id}`} key={c.id}><span className="avatar">{c.name.charAt(0).toUpperCase()}</span><span className="list-primary"><strong>{c.name}</strong><small>{c.phone || `${customerSales.length} ${customerSales.length === 1 ? "compra" : "compras"}`}</small></span><span className="row-end"><strong className={owed > 0 ? "debt-value" : ""}>{money(owed)}</strong><small>{owed ? "Por pagar" : "Al día"}</small></span><ArrowRight size={18} className="row-arrow" /></Link>; })}</div></section> : <Empty title="Aún no hay clientes" description="Agrega a tus compradores para llevar sus compras y abonos." href="/clientes/nuevo" action="Agregar cliente" />}</>;
}
