"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Wallet, HandCoins } from "lucide-react";
import { createSale } from "@/app/actions";
import type { Customer, Product, Variant } from "@/lib/data";
import { money } from "@/lib/format";
import { matchesProduct } from "@/lib/search";
import { variantLabel } from "@/lib/variants";
import { ProductPhoto } from "./ui";
import { ProductSearch } from "./product-search";
import { MoneyInput } from "./money-input";
import "./sale-form.css";

export function SaleForm({ products, variants, customers }: { products: Product[]; variants: Variant[]; customers: Customer[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"full" | "credit">("full");
  const [customerType, setCustomerType] = useState<"existing" | "new">(customers.length ? "existing" : "new");
  const [payment, setPayment] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const items = variants.filter(v => quantities[v.id] > 0).map(v => ({ variant_id: v.id, quantity: quantities[v.id] }));
  const filteredProducts = products.filter(product => matchesProduct(product.name, query));
  const total = variants.reduce((sum, v) => sum + (products.find(p => p.id === v.product_id)?.price ?? 0) * (quantities[v.id] || 0), 0);
  const paidToday = mode === "full" ? total : Number(payment || 0);
  const validCustomer = mode === "full" || (customerType === "existing" ? !!customerId : !!customerName.trim());
  const validPayment = mode === "full" || (total > 0 && payment !== "" && Number(payment) >= 0 && Number(payment) < total);
  function update(v: Variant, quantity: number) { setQuantities(current => ({ ...current, [v.id]: Math.max(0, Math.min(v.stock, quantity)) })); }

  return <form action={createSale} className="sale-layout"><div className="sale-main">
    <section className="form-card"><div className="section-heading"><span className="step">1</span><div><h2>Elige color y talla</h2><p className="muted">Selecciona la combinación exacta que se llevará hoy.</p></div></div>
      <ProductSearch value={query} onChange={setQuery} /><p className="search-count" aria-live="polite">{filteredProducts.length} {filteredProducts.length === 1 ? "producto disponible" : "productos disponibles"}{items.length > 0 && ` · ${items.length} ${items.length === 1 ? "elegido" : "elegidos"} en el resumen`}</p>
      {filteredProducts.length ? <div className="sale-products">{filteredProducts.map(p => <div key={p.id} className="sale-product-group"><div className="sale-product"><ProductPhoto product={p} /><div className="sale-product-info"><strong>{p.name}</strong><span>{money(p.price)} · {p.stock} unidades en total</span></div></div><div className="sale-variant-list">{variants.filter(v => v.product_id === p.id).map(v => <div className={`sale-variant ${v.stock === 0 ? "sold-out" : ""}`} key={v.id}><div className="sale-variant-info"><strong>{variantLabel(v.color, v.size)}</strong><small>{v.stock === 0 ? "Agotada" : `${v.stock} ${v.stock === 1 ? "disponible" : "disponibles"}`}</small></div><div className="quantity"><button type="button" aria-label={`Quitar ${p.name}, ${variantLabel(v.color, v.size)}`} disabled={!quantities[v.id]} onClick={() => update(v, (quantities[v.id] || 0) - 1)}><Minus size={16} /></button><span>{quantities[v.id] || 0}</span><button type="button" aria-label={`Agregar ${p.name}, ${variantLabel(v.color, v.size)}`} disabled={(quantities[v.id] || 0) >= v.stock} onClick={() => update(v, (quantities[v.id] || 0) + 1)}><Plus size={16} /></button></div></div>)}</div></div>)}</div> : <div className="search-empty"><strong>No encontramos productos con ese nombre</strong>Prueba con otra palabra o limpia la búsqueda. Los productos elegidos siguen en el resumen.</div>}
    </section>
    <section className="form-card"><div className="section-heading"><span className="step">2</span><div><h2>¿Cómo va a pagar?</h2><p className="muted">Solo necesitas registrar al cliente si queda debiendo.</p></div></div>
      <div className="payment-choices" role="group" aria-label="Forma de pago">
        <button type="button" className={`choice-card ${mode === "full" ? "selected" : ""}`} aria-pressed={mode === "full"} onClick={() => setMode("full")}><span className="choice-icon"><Wallet size={21} /></span><span><strong>Paga completo</strong><small>Se lleva la ropa y paga todo hoy. Sin registrar cliente.</small></span></button>
        <button type="button" className={`choice-card ${mode === "credit" ? "selected" : ""}`} aria-pressed={mode === "credit"} disabled={total === 0} onClick={() => setMode("credit")}><span className="choice-icon"><HandCoins size={21} /></span><span><strong>Fía o abona</strong><small>Se lleva la ropa y paga después, o deja un abono.</small></span></button>
      </div>
      {mode === "credit" && <div className="credit-fields"><p className="credit-note">Registra a quién cobrarle el saldo pendiente.</p>
        {customers.length > 0 && <div className="choice-tabs"><button type="button" className={customerType === "existing" ? "active" : ""} aria-pressed={customerType === "existing"} onClick={() => setCustomerType("existing")}>Cliente existente</button><button type="button" className={customerType === "new" ? "active" : ""} aria-pressed={customerType === "new"} onClick={() => setCustomerType("new")}>Cliente nuevo</button></div>}
        {customerType === "existing" ? <label className="field">Selecciona un cliente<select name="customer_id" value={customerId} onChange={e => setCustomerId(e.target.value)} required><option value="">Elige un cliente</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}</select></label> : <><label className="field">Nombre del cliente<input name="customer_name" required maxLength={120} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ej. Ana Gómez" /></label><label className="field">Teléfono <span className="optional">(opcional)</span><input name="customer_phone" type="tel" maxLength={30} placeholder="Ej. 300 123 4567" /></label></>}
        <label className="field">¿Cuánto paga hoy?<MoneyInput name="initial_payment" value={payment} onChange={setPayment} max={Math.max(0, total - 1)} placeholder="Escribe 0 si paga después" /><small>Escribe 0 si pagará todo después.</small></label>
      </div>}
    </section>
  </div><aside className="sale-summary form-card"><div className="section-heading"><span className="step">3</span><div><h2>Revisa la venta</h2><p className="muted">Las unidades se descuentan al confirmar.</p></div></div>
    <input type="hidden" name="items" value={JSON.stringify(items)} />
    <input type="hidden" name="payment_mode" value={mode} />
    {mode === "full" && <input type="hidden" name="initial_payment" value={total} />}
    {items.length ? <div className="summary-items">{items.map(item => { const v = variants.find(v => v.id === item.variant_id)!; const p = products.find(p => p.id === v.product_id)!; return <div key={v.id}><span>{item.quantity} × {p.name}<small>{variantLabel(v.color, v.size)}</small></span><strong>{money(item.quantity * p.price)}</strong></div>; })}</div> : <div className="empty-inline">Selecciona al menos una combinación de color y talla.</div>}
    <div className="summary-line total"><span>Total de la venta</span><strong>{money(total)}</strong></div>
    <div className="summary-line"><span>Paga hoy</span><strong>{money(paidToday)}</strong></div>
    <div className="summary-line balance"><span>Queda por pagar</span><strong>{money(Math.max(0, total - paidToday))}</strong></div>
    <button className="button primary form-submit" disabled={!items.length || !validCustomer || !validPayment} type="submit"><ShoppingBag size={18} /> Confirmar venta y entregar</button>
  </aside></form>;
}
