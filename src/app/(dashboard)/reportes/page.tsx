import Link from "next/link";
import { loadData, balance } from "@/lib/data";
import { money, colombiaMonth } from "@/lib/format";
import { Heading } from "@/components/ui";
export default async function Reports({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: requested } = await searchParams; const { sales, payments } = await loadData();
  const current = colombiaMonth();
  const month = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : current;
  const prevDate = new Date(`${current}-15T12:00:00Z`); prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
  const prev = prevDate.toISOString().slice(0, 7);
  const selectedSales = sales.filter(s => colombiaMonth(new Date(s.created_at)) === month);
  const selectedPayments = payments.filter(p => p.paid_at.slice(0, 7) === month);
  const sold = selectedSales.reduce((n, s) => n + s.total, 0);
  const costs = selectedSales.reduce((n, s) => n + s.total_cost, 0);
  const collected = selectedPayments.reduce((n, p) => n + p.amount, 0);
  const pending = sales.reduce((n, s) => n + balance(s, payments), 0);
  const periodLabel = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
  return <><Heading eyebrow="TUS NÚMEROS CLAROS" title="Reportes" description="Entiende cuánto vendiste, cuánto cobraste y cuánto ganaste." /><div className="report-filters"><Link className={`filter-pill ${month === current ? "active" : ""}`} href="/reportes">Este mes</Link><Link className={`filter-pill ${month === prev && month !== current ? "active" : ""}`} href={`/reportes?month=${prev}`}>Mes anterior</Link><form method="get" className="month-form"><label htmlFor="month">Elegir mes</label><input id="month" type="month" name="month" defaultValue={month} max={current} /><button type="submit" className="button outline">Ver</button></form></div><h2 className="report-month">{periodLabel}</h2>
  <div className="report-grid"><div className="report-card"><span>Total vendido</span><strong>{money(sold)}</strong><p>Valor de las {selectedSales.length} ventas realizadas en este mes, se hayan pagado o no.</p></div><div className="report-card"><span>Dinero cobrado</span><strong>{money(collected)}</strong><p>Abonos recibidos en este mes, incluso de ventas de meses anteriores.</p></div><div className="report-card featured"><span>Ganancia de las ventas</span><strong>{money(sold - costs)}</strong><p>Total vendido menos costo de las prendas vendidas este mes. Puede incluir dinero aún no cobrado.</p></div><div className="report-card"><span>Costo de productos vendidos</span><strong>{money(costs)}</strong><p>Lo que pagaste originalmente por las prendas vendidas este mes.</p></div></div><div className="report-owed"><span><strong>Por cobrar actualmente</strong><small>Saldo pendiente de todas las ventas, no solo de este mes.</small></span><strong>{money(pending)}</strong></div><p className="tip">La ganancia muestra el resultado de las ventas; «dinero cobrado» muestra lo que realmente ha entrado a tu caja.</p></>;
}
