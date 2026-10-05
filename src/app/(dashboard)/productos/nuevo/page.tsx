import Link from "next/link";
import { Alert, Back, Heading } from "@/components/ui";
import { ProductForm } from "@/components/product-form";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved: savedParam } = await searchParams;
  const saved = savedParam && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(savedParam) ? savedParam : null;

  return <div className="narrow-page"><Back href="/productos" /><Heading title="Agregar producto" description="Registra tus prendas una tras otra, con sus colores y tallas." /><Alert error={error} />
    {saved && <div className="alert success" role="status">Producto guardado correctamente. <Link className="font-semibold underline" href={`/productos/${saved}`}>Ver producto guardado</Link>. Ya puedes agregar el siguiente.</div>}
    <ProductForm key={saved ?? "new"} />
  </div>;
}
