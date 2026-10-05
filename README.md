# Mi Tienda

Panel privado y responsive para gestionar una tienda de ropa en Colombia. Registra prendas con fotografía, costo y precio compartidos, y variantes de color/talla con unidades independientes; entrega al vender, descuenta el inventario correcto y controla pagos iniciales y abonos. Los reportes distinguen dinero cobrado y ganancia de las ventas.

## Requisitos

- Node.js 20 o superior
- Proyecto de Supabase

## Configuración

1. Instala dependencias: `npm install`.
2. En Supabase, abre **SQL Editor** y ejecuta las migraciones **en orden**: `supabase/migrations/20261004000000_initial.sql`, `supabase/migrations/20261005000000_walk_in_sales.sql` y `supabase/migrations/20261006000000_product_variants.sql`. Si ya ejecutaste las dos primeras, ejecuta **solo la tercera**. Conserva productos y ventas existentes: su inventario pasa a una variante «Único · Única». Esto crea las tablas, reglas de acceso, funciones transaccionales y el bucket público `productos` (solo el usuario autenticado puede subir archivos dentro de su carpeta).
3. En **Authentication → Users**, crea una cuenta con correo y contraseña para el administrador. Usa el correo confirmado o confirma la cuenta desde Supabase. La aplicación no ofrece registro público.
4. Copia `.env.example` a `.env.local` y reemplaza las dos variables con **Project URL** y la **publishable key** (o `anon` key) de **Project Settings → API**. Nunca pongas una `service_role` o secret key en `NEXT_PUBLIC_*`.
5. Inicia la web: `npm run dev`. Abre `http://localhost:3000` e inicia sesión.

## Comprobaciones

`npm run typecheck` · `npm run lint` · `npm run build`

## Organización

- `src/app/(auth)`: acceso privado.
- `src/app/(dashboard)`: inicio, productos, clientes, ventas, abonos y reportes.
- `src/components`: navegación, formularios y componentes visuales.
- `src/lib/supabase`: clientes de Supabase para servidor y navegador.
- `src/lib/data.ts`: lectura de datos y cálculos de saldos.
- `supabase/migrations`: tablas, políticas RLS y funciones `create_sale` / `add_payment`.

## Reglas de negocio

- Los montos se guardan en pesos colombianos enteros y se muestran como `COP $25.000` (sin conversión a dólares). Los campos monetarios nuevos comienzan vacíos y agrupan miles mientras escribes (`25000` → `25.000`); al guardar se envían los dígitos sin puntos. Escribe `0` cuando corresponda.
- Al crear un producto, «Guardar y agregar otro» confirma el guardado y abre un formulario nuevo con todos los campos vacíos (incluidos costo y precio). «Guardar y ver producto» abre su ficha; editar un producto permanece en esa ficha.
- Una venta guarda el precio y el costo por producto del momento; modificar el catálogo no cambia ventas anteriores.
- `save_product_with_variants` crea o edita las combinaciones de color/talla junto con los datos del producto y calcula su stock total en una sola transacción.
- `create_sale_v3` bloquea producto y variantes, guarda color/talla y precios del momento, descuenta solo la combinación vendida y registra el pago inicial en una sola transacción. También puede crear al cliente nuevo en esa misma transacción.
- Una venta de mostrador pagada totalmente no necesita cliente. Si queda cualquier saldo pendiente, el cliente es obligatorio.
- `add_payment` bloquea la venta y rechaza abonos superiores al saldo.
- La ganancia de las ventas del mes es el total vendido menos el costo de esos productos; el dinero cobrado en el mes puede pertenecer a ventas anteriores.
- Fotografías JPG, PNG o WebP hasta 3 MB en Supabase Storage. Las fotografías son públicas; la escritura y eliminación están limitadas al propietario autenticado.

Esta primera versión está pensada para una sola persona administradora. Cada cuenta de Supabase ve exclusivamente sus propios datos.
# Tienda-de-ropa
