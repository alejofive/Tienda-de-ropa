"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product, Variant } from "@/lib/data";
import { money } from "@/lib/format";
import { matchesProduct } from "@/lib/search";
import { ProductPhoto } from "./ui";
import { ProductSearch } from "./product-search";

const PAGE_SIZE = 20;

export function ProductCatalog({ products, variants }: { products: Product[]; variants: Variant[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const filtered = products.filter(product => matchesProduct(product.name, query));
  const visible = filtered.slice(0, limit);
  function search(value: string) { setQuery(value); setLimit(PAGE_SIZE); }

  return <><ProductSearch value={query} onChange={search} /><p className="search-count" aria-live="polite">Mostrando {visible.length} de {filtered.length} {filtered.length === 1 ? "producto" : "productos"}{query.trim() && ` para «${query.trim()}»`}</p>
    {filtered.length ? <><div className="product-grid">{visible.map(p => <Link href={`/productos/${p.id}`} className="product-card" key={p.id}><ProductPhoto product={p} /><div className="product-card-body"><span className={`stock-tag ${p.stock <= 3 ? "low" : ""}`}>{p.stock === 0 ? "Agotado" : `${p.stock} disponibles`}</span><h2>{p.name}</h2><strong>{money(p.price)}</strong><p>{variants.filter(v => v.product_id === p.id).length} combinaciones de color y talla</p><p>Ganas {money(p.price - p.cost)} por unidad</p></div></Link>)}</div>{visible.length < filtered.length && <div className="show-more"><button type="button" className="button outline" onClick={() => setLimit(current => current + PAGE_SIZE)}>Mostrar más productos</button></div>}</> : <div className="search-empty"><strong>No encontramos productos con ese nombre</strong>Prueba con otra palabra o limpia la búsqueda.</div>}
  </>;
}
