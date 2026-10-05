export function matchesProduct(name: string, query: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CO").trim();
  return normalize(name).includes(normalize(query));
}
