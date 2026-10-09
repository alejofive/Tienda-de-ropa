import { notFound } from "next/navigation";
import { loadData, balance } from "@/lib/data";
import { money } from "@/lib/format";
import { Alert, Back, Heading } from "@/components/ui";
import { PaymentForm } from "@/components/payment-form";
export default async function NewPayment({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params; const { error } = await searchParams; const { sales, customers, payments, returns } = await loadData(); const sale = sales.find(s => s.id === id); if (!sale) notFound(); const remaining = balance(sale, payments, returns); const customer = customers.find(c => c.id === sale.customer_id);
  return <div className="narrow-page"><Back href={`/ventas/${id}`} /><Heading eyebrow="DINERO RECIBIDO" title="Registrar abono" description={`Pago de ${customer?.name ?? "cliente"} · Venta por ${money(sale.total)}`} /><Alert error={error} />{remaining > 0 ? <PaymentForm saleId={id} balance={remaining} /> : <div className="form-card"><h2>Esta venta ya está pagada ✳</h2><p className="muted">No tiene saldo pendiente.</p></div>}</div>;
}
