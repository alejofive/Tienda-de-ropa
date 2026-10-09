"use client";

import { useState } from "react";
import type { Item, Sale } from "@/lib/data";
import { processSaleReturn } from "@/app/actions";
import { money } from "@/lib/format";
import { variantLabel } from "@/lib/variants";
import { ActionForm, SubmitButton } from "./action-form";
import { MoneyInput } from "./money-input";
import "./sale-return.css";

type ReturnableItem = Item & { available: number };

export function SaleReturnForm({ sale, items, paidNet, requestId, cancel }: {
  sale: Sale; items: ReturnableItem[]; paidNet: number; requestId: string; cancel: boolean;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(items.map(item => [item.id, cancel ? String(item.available) : "0"]))
  );
  const [reason, setReason] = useState<"error" | "return">(cancel ? "error" : "return");
  const [refund, setRefund] = useState(cancel ? String(paidNet) : "0");
  const selected = items.map(item => ({ item_id: item.id, quantity: Number(quantities[item.id] || 0) })).filter(item => item.quantity > 0);
  const returned = items.reduce((sum, item) => sum + Number(quantities[item.id] || 0) * item.unit_price, 0);
  const newTotal = sale.total - returned;
  const minRefund = Math.max(0, paidNet - newTotal);
  const maxRefund = Math.min(returned, paidNet);
  const valid = selected.length > 0 && refund !== "" && Number(refund) >= minRefund && Number(refund) <= maxRefund;

  return <ActionForm action={processSaleReturn} className="form-card return-form">
    <input type="hidden" name="sale_id" value={sale.id} />
    <input type="hidden" name="mode" value={cancel ? "cancel" : "return"} />
    <input type="hidden" name="request_id" value={requestId} />
    <input type="hidden" name="items" value={JSON.stringify(selected)} />
    <div className="form-section"><h2>{cancel ? "Prendas de la venta" : "¿Qué prendas devolvieron?"}</h2>
      <p className="muted">Las unidades seleccionadas volverán al inventario de su color y talla.</p>
      <div className="return-items">{items.map(item => <div className="return-item" key={item.id}>
        <div><strong>{item.product_name}</strong><small>{variantLabel(item.variant_color, item.variant_size)} · {item.available} {item.available === 1 ? "unidad disponible para devolver" : "unidades disponibles para devolver"}</small></div>
        {cancel ? <strong>{item.available} × {money(item.unit_price)}</strong> : <label className="field">Unidades a devolver
          <input type="number" min="0" max={item.available} step="1" inputMode="numeric" value={quantities[item.id]}
            aria-label={`Unidades a devolver de ${item.product_name}, ${variantLabel(item.variant_color, item.variant_size)}`}
            onChange={event => { const value = event.target.value; if (value === "" || (/^\d+$/.test(value) && Number(value) <= item.available)) setQuantities(current => ({ ...current, [item.id]: value })); }} />
        </label>}
      </div>)}</div>
    </div>
    <div className="form-section"><label className="field">Motivo
      <select name="reason" value={reason} onChange={event => setReason(event.target.value as "error" | "return")}>
        <option value="error">Registré la venta por error</option>
        <option value="return">El cliente devolvió el producto</option>
      </select>
    </label>
      <label className="field">Dinero que devuelves al cliente
        <MoneyInput name="refund" value={refund} onChange={setRefund} min={minRefund} max={maxRefund} placeholder="Escribe 0 si no devolviste dinero" />
        <small>{cancel ? `Debes devolver lo cobrado: ${money(paidNet)}.` : `Puedes devolver entre ${money(minRefund)} y ${money(maxRefund)}. Lo demás, si aplica, reduce la deuda.`}</small>
      </label>
    </div>
    <div className="return-summary"><div><span>Valor devuelto</span><strong>{money(returned)}</strong></div><div><span>Nuevo total de la venta</span><strong>{money(newTotal)}</strong></div><div><span>Nuevo saldo por pagar</span><strong>{money(Math.max(0, newTotal - (paidNet - Number(refund || 0))))}</strong></div></div>
    <SubmitButton type="submit" className="button primary form-submit" disabled={!valid} pendingLabel="Registrando devolución…">{cancel ? "Anular venta y reponer inventario" : "Registrar devolución"}</SubmitButton>
  </ActionForm>;
}
