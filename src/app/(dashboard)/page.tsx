import Link from "next/link";
import { ArrowRight, ArrowUpRight, Boxes, CircleDollarSign, HandCoins, Plus, TrendingUp, Wallet } from "lucide-react";
import { loadData, balance } from "@/lib/data";
import { dateLabel, money, colombiaMonth } from "@/lib/format";
import { Alert, Empty, Heading, ProductPhoto, SaleStatus } from "@/components/ui";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { products, customers, sales, payments } = await loadData();
  const { error, ok } = await searchParams;
  const month = colombiaMonth();
  const monthlySales = sales.filter(s => colombiaMonth(new Date(s.created_at)) === month);
  const monthlyPayments = payments.filter(p => p.paid_at.slice(0, 7) === month);
  const owed = sales.reduce((sum, s) => sum + balance(s, payments), 0);
  const debtors = customers.map(c => ({ ...c, debt: sales.filter(s => s.customer_id === c.id).reduce((sum, s) => sum + balance(s, payments), 0) })).filter(c => c.debt > 0).sort((a, b) => b.debt - a.debt);
  const low = products.filter(p => p.stock <= 3).sort((a, b) => a.stock - b.stock);
  return <><Heading eyebrow="RESUMEN DE TU NEGOCIO" title="Hola, qué gusto verte ✳" description="Aquí tienes lo más importante de tu tienda, de un vistazo." action={<Link className="button primary" href="/ventas/nueva"><Plus size={18} /> Nueva venta</Link>} /><Alert error={error} ok={ok} />
    <div className="stats-grid">
      <div className="stat-card highlight"><div className="stat-icon"><HandCoins size={22} /></div><span>Por cobrar</span><strong>{money(owed)}</strong><small>{debtors.length} {debtors.length === 1 ? "cliente con saldo" : "clientes con saldo"}</small></div>
      <div className="stat-card"><div className="stat-icon peach"><Wallet size={22} /></div><span>Cobrado este mes</span><strong>{money(monthlyPayments.reduce((sum, p) => sum + p.amount, 0))}</strong><small>Dinero recibido</small></div>
      <div className="stat-card"><div className="stat-icon green"><TrendingUp size={22} /></div><span>Ganancia en ventas</span><strong>{money(monthlySales.reduce((sum, s) => sum + s.total - s.total_cost, 0))}</strong><small>De las ventas de este mes</small></div>
      <div className="stat-card"><div className="stat-icon beige"><Boxes size={22} /></div><span>Pocas unidades</span><strong>{low.length}</strong><small>Productos con 3 o menos</small></div>
    </div>
    <div className="quick-actions"><Link href="/productos/nuevo"><span className="quick-icon"><Plus size={22} /></span><span>Agregar producto<small>Una nueva prenda a tu catálogo</small></span><ArrowUpRight size={19} /></Link><Link href="/clientes"><span className="quick-icon coral"><CircleDollarSign size={22} /></span><span>Registrar abono<small>Actualiza lo que te pagaron</small></span><ArrowUpRight size={19} /></Link></div>
    <div className="dashboard-columns"><section className="panel"><div className="panel-header"><div><span className="eyebrow">SEGUIMIENTO</span><h2>Clientes por cobrar</h2></div><Link href="/clientes" className="section-link">Ver todos <ArrowRight size={16} /></Link></div>{debtors.length ? <div className="row-list">{debtors.slice(0, 5).map(c => <Link href={`/clientes/${c.id}`} className="list-row" key={c.id}><span className="avatar">{c.name.charAt(0).toUpperCase()}</span><span className="list-primary"><strong>{c.name}</strong><small>Saldo pendiente</small></span><strong className="debt-value">{money(c.debt)}</strong></Link>)}</div> : <Empty title="Todo al día" description="No tienes clientes con pagos pendientes." />}</section>
      <section className="panel"><div className="panel-header"><div><span className="eyebrow">MOVIMIENTOS</span><h2>Ventas recientes</h2></div><Link href="/ventas" className="section-link">Ver todas <ArrowRight size={16} /></Link></div>{sales.length ? <div className="row-list">{sales.slice(0, 5).map(s => <Link href={`/ventas/${s.id}`} className="list-row" key={s.id}><span className="avatar muted-avatar">✳</span><span className="list-primary"><strong>{s.customer_id ? customers.find(c => c.id === s.customer_id)?.name ?? "Cliente" : "Venta de mostrador"}</strong><small>{dateLabel(s.created_at)}</small></span><span className="row-end"><strong>{money(s.total)}</strong><SaleStatus balance={balance(s, payments)} total={s.total} /></span></Link>)}</div> : <Empty title="Todavía no hay ventas" description="Tu primera venta aparecerá aquí." href="/ventas/nueva" action="Crear venta" />}</section></div>
    {low.length > 0 && <section className="panel low-panel"><div className="panel-header"><div><span className="eyebrow">INVENTARIO</span><h2>Revisa tus existencias</h2></div><Link href="/productos" className="section-link">Ver productos <ArrowRight size={16} /></Link></div><div className="low-list">{low.slice(0, 4).map(p => <Link href={`/productos/${p.id}`} key={p.id} className="low-product"><ProductPhoto product={p} /><span>{p.name}<small>{p.stock === 0 ? "Agotado" : `${p.stock} unidades disponibles`}</small></span></Link>)}</div></section>}
  </>;
}
