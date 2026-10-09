"use client";

import { useState } from "react";
import { addPayment } from "@/app/actions";
import { money } from "@/lib/format";
import { MoneyInput } from "./money-input";
import { ActionForm, SubmitButton } from "./action-form";

export function PaymentForm({ saleId, balance }: { saleId: string; balance: number }) {
  const [amount, setAmount] = useState("");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  return <ActionForm action={addPayment} className="form-card"><input type="hidden" name="sale_id" value={saleId} />
    <div className="payment-balance"><span>Saldo actual</span><strong>{money(balance)}</strong></div>
    <label className="field">¿Cuánto abonó?<MoneyInput name="amount" value={amount} onChange={setAmount} min={1} max={balance} placeholder="Ej. 10.000" /></label>
    <label className="field">Fecha del pago<input name="paid_at" type="date" required max={today} defaultValue={today} /></label>
    <label className="field">Nota <span className="optional">(opcional)</span><textarea name="note" maxLength={300} rows={2} placeholder="Ej. Pagó en efectivo" /></label>
    <div className="profit-preview"><span>Nuevo saldo</span><strong>{money(Math.max(0, balance - Number(amount || 0)))}</strong></div>
    <SubmitButton className="button primary form-submit" pendingLabel="Guardando abono…" disabled={!amount || Number(amount) < 1 || Number(amount) > balance} type="submit">Guardar abono</SubmitButton>
  </ActionForm>;
}
