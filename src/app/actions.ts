"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { integer, message, text } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

async function authenticated() {
  const db = await supabaseServer();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  return { db, user };
}
function fail(path: string, error: unknown): never { redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message(error))}`); }
function uuid(value: FormDataEntryValue | null) {
  const id = String(value ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Identificador no válido");
  return id;
}

export async function signIn(form: FormData) {
  const db = await supabaseServer();
  const { error } = await db.auth.signInWithPassword({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
  if (error) {
    console.error("Supabase login failed", { type: error.name, status: error.status ?? null, code: error.code ?? null });
    if (error.code === "invalid_credentials") fail("/login", "Correo o contraseña incorrectos");
    if (error.code === "email_not_confirmed") fail("/login", "Confirma tu correo antes de ingresar");
    if (error.name === "AuthRetryableFetchError" || error.status === 0) fail("/login", "No se pudo conectar con Supabase. Inténtalo de nuevo");
    fail("/login", "No se pudo iniciar sesión. Inténtalo de nuevo");
  }
  redirect("/");
}
export async function signOut() {
  const db = await supabaseServer();
  await db.auth.signOut();
  redirect("/login");
}

export async function saveProduct(form: FormData) {
  const { db, user } = await authenticated();
  const existing = form.get("id") ? uuid(form.get("id")) : null;
  const path = existing ? `/productos/${existing}` : "/productos/nuevo";
  let uploaded: string | null = null;
  let oldImage: string | null = null;
  let productId: string;
  try {
    const name = text(form.get("name"), "Nombre");
    const description = String(form.get("description") ?? "").trim().slice(0, 300);
    const cost = integer(form.get("cost"), "Costo");
    const price = integer(form.get("price"), "Precio");
    const submitted = JSON.parse(String(form.get("variants") ?? "[]")) as unknown;
    if (!Array.isArray(submitted) || submitted.length < 1 || submitted.length > 100) throw new Error("Agrega entre 1 y 100 variantes");
    const combinations = new Set<string>();
    const variants = submitted.map((row) => {
      if (!row || typeof row !== "object") throw new Error("Variante no válida");
      const variant = row as { id?: string | null; color?: string; size?: string; stock?: number | string };
      const color = text(variant.color ?? "", "Color", 60);
      const size = text(variant.size ?? "", "Talla", 60);
      const stock = integer(String(variant.stock ?? ""), "Unidades");
      const key = `${color.toLocaleLowerCase("es-CO")}\u0000${size.toLocaleLowerCase("es-CO")}`;
      if (combinations.has(key)) throw new Error("No repitas la misma combinación de color y talla");
      combinations.add(key);
      return { id: variant.id ? uuid(variant.id) : null, color, size, stock };
    });
    let image_path: string | null = null;
    if (existing) {
      const { data, error } = await db.from("products").select("image_path").eq("id", existing).single();
      if (error) throw new Error("Producto no encontrado");
      image_path = data.image_path;
      oldImage = data.image_path;
    }
    const file = form.get("image");
    if (file instanceof File && file.size > 0) {
      if (file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("La foto debe ser JPG, PNG o WebP y pesar menos de 3 MB");
      const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
      uploaded = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await db.storage.from("productos").upload(uploaded, file, { contentType: file.type });
      if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
      image_path = uploaded;
    }
    const { data, error } = await db.rpc("save_product_with_variants", {
      p_id: existing, p_name: name, p_description: description, p_cost: cost, p_price: price,
      p_image_path: image_path, p_variants: variants,
    });
    if (error) throw new Error(error.message);
    productId = data as string;
  } catch (error) {
    if (uploaded) await db.storage.from("productos").remove([uploaded]);
    fail(path, error);
  }
  if (uploaded && oldImage && oldImage.startsWith(`${user.id}/`)) await db.storage.from("productos").remove([oldImage]);
  revalidatePath("/", "layout");
  if (!existing && form.get("after_save") === "another") {
    redirect(`/productos/nuevo?saved=${productId}`);
  }
  redirect(`/productos/${productId}?ok=${encodeURIComponent(existing ? "Producto actualizado" : "Producto agregado")}`);
}

export async function saveCustomer(form: FormData) {
  const { db, user } = await authenticated();
  const path = "/clientes/nuevo";
  let id: string;
  try {
    const name = text(form.get("name"), "Nombre");
    const phone = String(form.get("phone") ?? "").trim();
    if (phone.length > 30) throw new Error("El teléfono es demasiado largo");
    const { data, error } = await db.from("customers").insert({ owner_id: user.id, name, phone }).select("id").single();
    if (error) throw new Error(error.message);
    id = data.id;
  } catch (error) { fail(path, error); }
  revalidatePath("/", "layout");
  redirect(`/clientes/${id}?ok=Cliente%20agregado`);
}

export async function createSale(form: FormData) {
  const { db } = await authenticated();
  let id: string;
  try {
    const requestId = uuid(form.get("request_id"));
    const mode = String(form.get("payment_mode") ?? "");
    if (mode !== "full" && mode !== "credit") throw new Error("Selecciona cómo pagará el cliente");
    const customer = mode === "credit" && form.get("customer_id") ? uuid(form.get("customer_id")) : null;
    const customerName = mode === "credit" && !customer ? String(form.get("customer_name") ?? "").trim() : "";
    const customerPhone = mode === "credit" && !customer ? String(form.get("customer_phone") ?? "").trim() : "";
    if (mode === "credit") {
      if (!customer && (!customerName || customerName.length > 120)) throw new Error("Selecciona un cliente o escribe su nombre");
      if (customerPhone.length > 30) throw new Error("El teléfono es demasiado largo");
    }
    const raw = JSON.parse(String(form.get("items") ?? "[]")) as unknown;
    if (!Array.isArray(raw) || !raw.length || raw.length > 50) throw new Error("Agrega al menos una variante");
    const items = raw.map((item) => {
      if (!item || typeof item !== "object") throw new Error("Producto no válido");
      const { variant_id, quantity } = item as { variant_id: string; quantity: number };
      if (!/^[0-9a-f-]{36}$/i.test(variant_id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw new Error("Cantidad no válida");
      return { variant_id, quantity };
    });
    const amount = integer(form.get("initial_payment"), "Pago inicial");
    const { data, error } = await db.rpc("create_sale_v3", { p_customer_id: customer, p_customer_name: customerName, p_customer_phone: customerPhone, p_items: items, p_initial_payment: amount, p_request_id: requestId });
    if (error) throw new Error(error.message);
    id = data as string;
  } catch (error) { fail("/ventas/nueva", error); }
  revalidatePath("/", "layout");
  redirect(`/ventas/${id}?ok=Venta%20registrada`);
}

export async function processSaleReturn(form: FormData) {
  const { db } = await authenticated();
  const saleId = uuid(form.get("sale_id"));
  const path = `/ventas/${saleId}/devolver${form.get("mode") === "cancel" ? "?mode=cancel" : ""}`;
  try {
    const requestId = uuid(form.get("request_id"));
    const reason = String(form.get("reason") ?? "");
    if (reason !== "error" && reason !== "return") throw new Error("Selecciona un motivo válido");
    const refund = integer(form.get("refund"), "Reembolso");
    const raw = JSON.parse(String(form.get("items") ?? "[]")) as unknown;
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > 50) throw new Error("Selecciona las prendas a devolver");
    const items = raw.map(item => {
      if (!item || typeof item !== "object") throw new Error("Prenda no válida");
      const row = item as { item_id?: string; quantity?: number };
      if (!Number.isInteger(row.quantity) || !row.quantity || row.quantity < 1) throw new Error("Cantidad no válida");
      return { item_id: uuid(row.item_id ?? null), quantity: row.quantity };
    });
    const { error } = await db.rpc("process_sale_return", { p_sale_id: saleId, p_items: items, p_refund: refund, p_reason: reason, p_request_id: requestId });
    if (error) throw new Error(error.message);
  } catch (error) { fail(path, error); }
  revalidatePath("/", "layout");
  redirect(`/ventas/${saleId}?ok=${encodeURIComponent("Devolución registrada")}`);
}

export async function addPayment(form: FormData) {
  const { db } = await authenticated();
  const saleId = uuid(form.get("sale_id"));
  try {
    const amount = integer(form.get("amount"), "Abono", 1);
    const paidAt = String(form.get("paid_at") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) throw new Error("Selecciona una fecha válida");
    const note = String(form.get("note") ?? "").trim().slice(0, 300);
    const { error } = await db.rpc("add_payment", { p_sale_id: saleId, p_amount: amount, p_paid_at: paidAt, p_note: note });
    if (error) throw new Error(error.message);
  } catch (error) { fail(`/ventas/${saleId}/abonar`, error); }
  revalidatePath("/", "layout");
  redirect(`/ventas/${saleId}?ok=Abono%20registrado`);
}
