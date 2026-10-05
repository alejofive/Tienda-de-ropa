"use client";

import { useId } from "react";
import { Search, X } from "lucide-react";
import "./product-search.css";

export function ProductSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="product-search"><label htmlFor={id}>Buscar producto</label><div className="product-search-field"><Search size={19} aria-hidden="true" /><input id={id} type="search" autoComplete="off" value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} placeholder="Escribe el nombre de una prenda" />{value && <button type="button" aria-label="Limpiar búsqueda" onClick={() => onChange("")}><X size={18} /></button>}</div></div>;
}
