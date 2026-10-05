export function variantLabel(color: string, size: string) {
  if (!color && !size) return ""; // Sales made before variants were introduced.
  if (color === "Único" && size === "Única") return "Presentación única";
  return `${color} · Talla ${size}`;
}
