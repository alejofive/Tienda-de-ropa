"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { saveProduct } from "@/app/actions";
import { money, imageUrl, numericInput } from "@/lib/format";
import type { Product, Variant } from "@/lib/data";
import { MoneyInput } from "./money-input";
import "./product-variants.css";

type VariantRow = { key: string; id: string | null; color: string; size: string; stock: string };

export function ProductForm({ product, variants = [] }: { product?: Product; variants?: Variant[] }) {
  const [cost, setCost] = useState(product ? String(product.cost) : "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [rows, setRows] = useState<VariantRow[]>(variants.length
    ? variants.map(variant => ({ key: variant.id, id: variant.id, color: variant.color, size: variant.size, stock: String(variant.stock) }))
    : [{ key: "first", id: null, color: "", size: "", stock: "" }]);
  const [preview, setPreview] = useState<string | null>(imageUrl(product?.image_path ?? null));
  const stockTotal = rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
  const filledCombinations = rows.filter(row => row.color.trim() && row.size.trim()).map(row => `${row.color.trim().toLocaleLowerCase("es-CO")}\u0000${row.size.trim().toLocaleLowerCase("es-CO")}`);
  const hasDuplicates = new Set(filledCombinations).size !== filledCombinations.length;
  function updateRow(key: string, field: "color" | "size" | "stock", value: string) {
    setRows(current => current.map(row => row.key === key ? { ...row, [field]: field === "stock" ? numericInput(value) : value } : row));
  }
  return <form action={saveProduct} className="form-card">
    {product && <input type="hidden" name="id" value={product.id} />}
    <input type="hidden" name="variants" value={JSON.stringify(rows.map(({ id, color, size, stock }) => ({ id, color, size, stock })))} />
    <div className="form-section"><h2>La prenda</h2><p className="muted">Una buena foto ayuda a reconocerla rápidamente.</p>
      <label className="upload"><input type="file" name="image" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); }} /><span className="upload-photo">{preview ? <Image src={preview} alt="Vista previa del producto" width={76} height={76} unoptimized /> : <ImagePlus size={30} />}</span><span><strong>{preview ? "Cambiar fotografía" : "Agregar fotografía"}</strong><small>JPG, PNG o WebP · Máximo 3 MB</small></span></label>
      <label className="field">Nombre del producto<input name="name" required maxLength={120} defaultValue={product?.name} placeholder="Ej. Conjunto para niño" /></label>
      <label className="field">Descripción <span className="optional">(opcional)</span><textarea name="description" rows={2} maxLength={300} defaultValue={product?.description} placeholder="Talla, color u otros detalles" /></label>
    </div>
    <div className="form-section"><h2>Precios de todas las variantes</h2><p className="muted">Cada color y talla tendrá el mismo costo y precio de venta.</p><div className="form-grid">
      <label className="field">Costo por unidad <span className="hint">Lo que pagaste</span><MoneyInput name="cost" value={cost} onChange={setCost} placeholder="Ej. 20.000" /></label>
      <label className="field">Precio de venta <span className="hint">Lo que cobrarás</span><MoneyInput name="price" value={price} onChange={setPrice} placeholder="Ej. 25.000" /></label>
    </div>
    <div className={`profit-preview ${price !== "" && cost !== "" && Number(price) < Number(cost) ? "negative" : ""}`}><span>Ganancia estimada por unidad</span><strong>{price !== "" && cost !== "" ? money(Number(price) - Number(cost)) : "Completa los precios"}</strong></div>
    {price !== "" && cost !== "" && Number(price) < Number(cost) && <p className="field-warning">El precio de venta es menor que el costo.</p>}
    </div>
    <div className="form-section"><div className="variant-heading"><div><h2>Colores, tallas y unidades</h2><p className="muted">Agrega solo las combinaciones que realmente tienes. Para una prenda sin variaciones usa «Único» y «Única».</p></div><span className="variant-total">{stockTotal} {stockTotal === 1 ? "unidad" : "unidades"} en total</span></div>
      {product && rows.some(row => row.color === "Único" && row.size === "Única") && <p className="variant-tip">Si distribuyes las unidades actuales por colores y tallas, reemplaza o elimina la fila «Único · Única» para no contarlas dos veces.</p>}
      <div className="variant-rows">{rows.map((row, index) => <div className="variant-row" key={row.key}><span className="variant-index">{index + 1}</span><label className="field">Color<input required maxLength={60} value={row.color} onChange={e => updateRow(row.key, "color", e.target.value)} placeholder="Ej. Azul" /></label><label className="field">Talla<input required maxLength={60} value={row.size} onChange={e => updateRow(row.key, "size", e.target.value)} placeholder="Ej. 8 o M" /></label><label className="field">Unidades<input required type="number" inputMode="numeric" min="0" max="2147483647" step="1" value={row.stock} onFocus={e => e.currentTarget.select()} onChange={e => updateRow(row.key, "stock", e.target.value)} placeholder="Ej. 1" /></label><button className="variant-remove" type="button" disabled={rows.length === 1} onClick={() => setRows(current => current.filter(item => item.key !== row.key))} aria-label={`Eliminar variante ${index + 1}`} title="Eliminar variante"><Trash2 size={17} /></button></div>)}</div>
      {hasDuplicates && <p className="field-warning" role="alert">No repitas la misma combinación de color y talla.</p>}
      <button className="button outline add-variant" type="button" disabled={rows.length >= 100} onClick={() => setRows(current => [...current, { key: crypto.randomUUID(), id: null, color: "", size: "", stock: "" }])}><Plus size={17} /> Agregar otra combinación</button>
    </div>
    {product ? <button className="button primary form-submit" disabled={hasDuplicates || stockTotal > 2147483647} type="submit">Guardar cambios</button> : <div className="product-submit-actions"><button className="button primary" disabled={hasDuplicates || stockTotal > 2147483647} type="submit" name="after_save" value="another">Guardar y agregar otro</button><button className="button outline" disabled={hasDuplicates || stockTotal > 2147483647} type="submit" name="after_save" value="view">Guardar y ver producto</button></div>}
  </form>;
}
