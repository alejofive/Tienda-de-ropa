import { supabaseServer } from "./supabase/server";

export type Product = { id: string; name: string; description: string; cost: number; price: number; stock: number; image_path: string | null; created_at: string };
export type Variant = { id: string; product_id: string; color: string; size: string; stock: number; created_at: string };
export type Customer = { id: string; name: string; phone: string; created_at: string };
export type Sale = { id: string; customer_id: string | null; total: number; total_cost: number; created_at: string; cancelled_at: string | null };
export type Item = { id: string; sale_id: string; product_name: string; variant_color: string; variant_size: string; quantity: number; unit_price: number; unit_cost: number };
export type Payment = { id: string; sale_id: string; amount: number; paid_at: string; note: string; created_at: string };
export type SaleReturn = { id: string; sale_id: string; reason: "error" | "return"; total: number; total_cost: number; refund: number; created_at: string };
export type SaleReturnItem = { return_id: string; item_id: string; quantity: number };

export async function loadData() {
  const db = await supabaseServer();
  const [products, variants, customers, sales, items, payments, returns, returnItems] = await Promise.all([
    db.from("products").select("id,name,description,cost,price,stock,image_path,created_at").order("created_at", { ascending: false }),
    db.from("product_variants").select("id,product_id,color,size,stock,created_at").order("created_at", { ascending: true }),
    db.from("customers").select("id,name,phone,created_at").order("name"),
    db.from("sales").select("id,customer_id,total,total_cost,created_at,cancelled_at").order("created_at", { ascending: false }),
    db.from("sale_items").select("id,sale_id,product_name,variant_color,variant_size,quantity,unit_price,unit_cost"),
    db.from("payments").select("id,sale_id,amount,paid_at,note,created_at").order("created_at", { ascending: false }),
    db.from("sale_returns").select("id,sale_id,reason,total,total_cost,refund,created_at").order("created_at", { ascending: false }),
    db.from("sale_return_items").select("return_id,item_id,quantity"),
  ]);
  const results = { products, product_variants: variants, customers, sales, sale_items: items, payments, sale_returns: returns, sale_return_items: returnItems };
  for (const [table, result] of Object.entries(results)) {
    if (!result.error) continue;
    const causeCode = result.error.details?.match(/Caused by:[^\n]*\(([A-Z][A-Z0-9_]{2,40})\)/)?.[1] ?? null;
    console.error("Supabase data load failed", { table, status: result.status, code: result.error.code || null, causeCode });
  }
  const error = Object.values(results).find((result) => result.error)?.error;
  if (error) throw new Error(error.message.includes("fetch failed") ? "No se pudo conectar con Supabase. Inténtalo de nuevo." : `No se pudieron cargar los datos: ${error.message}. Comprueba la migración de Supabase.`);
  return { products: products.data as Product[], variants: variants.data as Variant[], customers: customers.data as Customer[], sales: sales.data as Sale[], items: items.data as Item[], payments: payments.data as Payment[], returns: returns.data as SaleReturn[], returnItems: returnItems.data as SaleReturnItem[] };
}

export async function loadHomeData() {
  const db = await supabaseServer();
  const [products, customers, sales, payments, returns] = await Promise.all([
    db.from("products").select("id,name,stock,image_path").order("created_at", { ascending: false }),
    db.from("customers").select("id,name"),
    db.from("sales").select("id,customer_id,total,total_cost,created_at,cancelled_at").order("created_at", { ascending: false }),
    db.from("payments").select("id,sale_id,amount,paid_at,note,created_at").order("created_at", { ascending: false }),
    db.from("sale_returns").select("id,sale_id,reason,total,total_cost,refund,created_at"),
  ]);
  const results = { products, customers, sales, payments, sale_returns: returns };
  for (const [table, result] of Object.entries(results)) {
    if (!result.error) continue;
    console.error("Supabase data load failed", { table, status: result.status, code: result.error.code || null });
  }
  const error = Object.values(results).find(result => result.error)?.error;
  if (error) throw new Error(error.message.includes("fetch failed") ? "No se pudo conectar con Supabase. Inténtalo de nuevo." : `No se pudieron cargar los datos: ${error.message}. Comprueba la migración de Supabase.`);
  return {
    products: products.data as Pick<Product, "id" | "name" | "stock" | "image_path">[],
    customers: customers.data as Pick<Customer, "id" | "name">[],
    sales: sales.data as Sale[], payments: payments.data as Payment[], returns: returns.data as SaleReturn[],
  };
}

export function paid(saleId: string, payments: Payment[], returns: SaleReturn[] = []) {
  return payments.filter(p => p.sale_id === saleId).reduce((sum, p) => sum + p.amount, 0)
    - returns.filter(r => r.sale_id === saleId).reduce((sum, r) => sum + r.refund, 0);
}
export function balance(sale: Sale, payments: Payment[], returns: SaleReturn[] = []) { return Math.max(0, sale.total - paid(sale.id, payments, returns)); }
