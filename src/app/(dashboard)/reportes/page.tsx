import Link from "next/link";
import { loadData, balance } from "@/lib/data";
import { money, colombiaMonth } from "@/lib/format";
import { Heading } from "@/components/ui";
import { ReportMonthForm } from "@/components/report-month-form";
export default async function Reports({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: requested } = await searchParams; const { sales, payments, returns } = await loadData();
  const current = colombiaMonth();
  const month = requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : current;
  const prevDate = new Date(`${current}-15T12:00:00Z`); prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
  const prev = prevDate.toISOString().slice(0, 7);
  const selectedSales = sales.filter(s => colombiaMonth(new Date(s.created_at)) === month);
  const selectedPayments = payments.filter(p => p.paid_at.slice(0, 7) === month);
  const selectedReturns = returns.filter(r => colombiaMonth(new Date(r.created_at)) === month);
  const gross = selectedSales.reduce((n, s) => n + s.total, 0) + returns.filter(r => selectedSales.some(s => s.id === r.sale_id)).reduce((n, r) => n + r.total, 0);
  const grossCost = selectedSales.reduce((n, s) => n + s.total_cost, 0) + returns.filter(r => selectedSales.some(s => s.id === r.sale_id)).reduce((n, r) => n + r.total_cost, 0);
  const refundedProducts = selectedReturns.reduce((n, r) => n + r.total, 0);
  const sold = gross - refundedProducts;
  const costs = grossCost - selectedReturns.reduce((n, r) => n + r.total_cost, 0);
  const refundedMoney = selectedReturns.reduce((n, r) => n + r.refund, 0);
  const collected = selectedPayments.reduce((n, p) => n + p.amount, 0) - refundedMoney;
  const pending = sales.reduce((n, s) => n + balance(s, payments, returns), 0);
  const periodLabel = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
  return <><Heading eyebrow="TUS NÚMEROS CLAROS" title="Reportes" description="Entiende cuánto vendiste, cuánto cobraste y cuánto ganaste." /><div className="report-filters"><Link className={`filter-pill ${month === current ? "active" : ""}`} href="/reportes">Este mes</Link><Link className={`filter-pill ${month === prev && month !== current ? "active" : ""}`} href={`/reportes?month=${prev}`}>Mes anterior</Link><ReportMonthForm key={month} month={month} current={current} /></div><h2 className="report-month">{periodLabel}</h2>
  <div className="report-grid"><div className="report-card"><span>Ventas netas</span><strong>{money(sold)}</strong><p>Ventas del mes ({money(gross)}) menos devoluciones registradas este mes ({money(refundedProducts)}).</p></div><div className="report-card"><span>Dinero cobrado neto</span><strong>{money(collected)}</strong><p>Pagos recibidos menos {money(refundedMoney)} en reembolsos de este mes, incluso de ventas anteriores.</p></div><div className="report-card featured"><span>Ganancia neta</span><strong>{money(sold - costs)}</strong><p>Ventas netas menos costo neto de las prendas vendidas, incluidas las devoluciones del mes.</p></div><div className="report-card"><span>Costo neto de productos vendidos</span><strong>{money(costs)}</strong><p>Costo de las prendas vendidas menos el costo de las unidades devueltas este mes.</p></div></div><div className="report-owed"><span><strong>Por cobrar actualmente</strong><small>Saldo pendiente de todas las ventas, no solo de este mes.</small></span><strong>{money(pending)}</strong></div><p className="tip">Una devolución afecta el mes en que se registra; las ventas y pagos originales permanecen en su historial.</p></>;
}
