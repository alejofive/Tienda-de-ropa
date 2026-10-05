const colombianNumber = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
export const money = (value: number) => `${value < 0 ? "-" : ""}COP $${colombianNumber.format(Math.abs(value))}`;
export const numericInput = (value: string) => value.replace(/^0+(?=\d)/, "");
export const groupedInput = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const dateLabel = (value: string) => new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: value.length <= 10 ? "UTC" : "America/Bogota" }).format(new Date(value));
export const day = (value: string) => value.slice(0, 10);
export function integer(value: FormDataEntryValue | null, field: string, min = 0) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) < min || Number(text) > 2147483647) throw new Error(`${field}: ingresa un número entero válido`);
  return Number(text);
}
export function text(value: FormDataEntryValue | null, field: string, max = 120) {
  const result = String(value ?? "").trim();
  if (!result || result.length > max) throw new Error(`${field}: ingresa entre 1 y ${max} caracteres`);
  return result;
}
export function message(error: unknown) { return error instanceof Error ? error.message : "Ocurrió un error. Inténtalo de nuevo."; }
export function imageUrl(path: string | null) {
  if (!path || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${path.split("/").map(encodeURIComponent).join("/")}`;
}
export function colombiaMonth(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}
