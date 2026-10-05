import { supabaseServer } from "./supabase/server";

export type Product = { id: string; name: string; description: string; cost: number; price: number; stock: number; image_path: string | null; created_at: string };
export type Variant = { id: string; product_id: string; color: string; size: string; stock: number; created_at: string };
export type Customer = { id: string; name: string; phone: string; created_at: string };
export type Sale = { id: string; customer_id: string | null; total: number; total_cost: number; created_at: string };
export type Item = { id: string; sale_id: string; product_name: string; variant_color: string; variant_size: string; quantity: number; unit_price: number; unit_cost: number };
export type Payment = { id: string; sale_id: string; amount: number; paid_at: string; note: string; created_at: string };

export async function loadData() {
  const db = await supabaseServer();
  const [products, variants, customers, sales, items, payments] = await Promise.all([
    db.from("products").select("id,name,description,cost,price,stock,image_path,created_at").order("created_at", { ascending: false }),
    db.from("product_variants").select("id,product_id,color,size,stock,created_at").order("created_at", { ascending: true }),
    db.from("customers").select("id,name,phone,created_at").order("name"),
    db.from("sales").select("id,customer_id,total,total_cost,created_at").order("created_at", { ascending: false }),
    db.from("sale_items").select("id,sale_id,product_name,variant_color,variant_size,quantity,unit_price,unit_cost"),
    db.from("payments").select("id,sale_id,amount,paid_at,note,created_at").order("created_at", { ascending: false }),
  ]);
  const error = [products, variants, customers, sales, items, payments].find((result) => result.error)?.error;
  if (error) throw new Error(`No se pudieron cargar los datos: ${error.message}. Comprueba la migración de Supabase.`);
  return { products: products.data as Product[], variants: variants.data as Variant[], customers: customers.data as Customer[], sales: sales.data as Sale[], items: items.data as Item[], payments: payments.data as Payment[] };
}

export function paid(saleId: string, payments: Payment[]) { return payments.filter((p) => p.sale_id === saleId).reduce((sum, p) => sum + p.amount, 0); }
export function balance(sale: Sale, payments: Payment[]) { return Math.max(0, sale.total - paid(sale.id, payments)); }
export function status(sale: Sale, payments: Payment[]) { const amount = paid(sale.id, payments); return amount >= sale.total ? "Pagada" : amount ? "Pago parcial" : "Pendiente"; }
