-- Run AFTER 20261005000000_walk_in_sales.sql. Previous sales and inventory are preserved.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  product_id uuid not null,
  color text not null check (length(trim(color)) between 1 and 60),
  size text not null check (length(trim(size)) between 1 and 60),
  stock integer not null check (stock >= 0),
  created_at timestamptz not null default now(),
  foreign key (product_id, owner_id) references public.products(id, owner_id) on delete cascade,
  constraint unique_product_combination unique(product_id, color, size) deferrable initially deferred
);
create index on public.product_variants(owner_id, product_id);
alter table public.product_variants enable row level security;
create policy "owner variants read" on public.product_variants for select to authenticated
using (owner_id = (select auth.uid()));

-- Each existing product keeps its current stock as a single default variant.
insert into public.product_variants(owner_id, product_id, color, size, stock)
select owner_id, id, 'Único', 'Única', stock from public.products;

alter table public.sale_items add column variant_id uuid references public.product_variants(id) on delete set null;
alter table public.sale_items add column variant_color text not null default '';
alter table public.sale_items add column variant_size text not null default '';

-- All variant and product edits occur together. The product's stock is the sum of its variants.
create or replace function public.save_product_with_variants(
  p_id uuid, p_name text, p_description text, p_cost integer, p_price integer,
  p_image_path text, p_variants jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_product_id uuid := p_id;
  v_row record;
  v_total bigint;
begin
  if v_owner is null then raise exception 'Debes iniciar sesión'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 120 or length(coalesce(p_description, '')) > 300
     or p_cost is null or p_cost < 0 or p_price is null or p_price < 0 then
    raise exception 'Revisa el nombre y los precios del producto';
  end if;
  if p_image_path is not null and split_part(p_image_path, '/', 1) <> v_owner::text then
    raise exception 'La fotografía no pertenece a tu cuenta';
  end if;
  if jsonb_typeof(p_variants) is distinct from 'array' then raise exception 'Agrega al menos una variante'; end if;
  if jsonb_array_length(p_variants) < 1 or jsonb_array_length(p_variants) > 100 then
    raise exception 'Agrega entre 1 y 100 variantes';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_variants) as x(id uuid, color text, size text, stock integer)
    where x.color is null or length(trim(x.color)) not between 1 and 60
       or x.size is null or length(trim(x.size)) not between 1 and 60
       or x.stock is null or x.stock < 0
  ) then raise exception 'Completa color, talla y unidades de cada variante'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_variants) as x(id uuid, color text, size text, stock integer)
    group by lower(trim(x.color)), lower(trim(x.size)) having count(*) > 1
  ) then raise exception 'Hay combinaciones de color y talla repetidas'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_variants) as x(id uuid, color text, size text, stock integer)
    where x.id is not null group by x.id having count(*) > 1
  ) then raise exception 'Hay variantes repetidas'; end if;

  if v_product_id is null then
    insert into public.products(owner_id, name, description, cost, price, stock, image_path)
    values(v_owner, trim(p_name), coalesce(p_description, ''), p_cost, p_price, 0, p_image_path)
    returning id into v_product_id;
  else
    perform 1 from public.products where id = v_product_id and owner_id = v_owner for update;
    if not found then raise exception 'Producto no encontrado'; end if;
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_variants) as x(id uuid, color text, size text, stock integer)
    where x.id is not null and not exists (
      select 1 from public.product_variants v where v.id = x.id and v.product_id = v_product_id and v.owner_id = v_owner
    )
  ) then raise exception 'Una variante no pertenece a este producto'; end if;

  delete from public.product_variants where product_id = v_product_id and owner_id = v_owner
    and id not in (select x.id from jsonb_to_recordset(p_variants) as x(id uuid) where x.id is not null);
  for v_row in select x.* from jsonb_to_recordset(p_variants) as x(id uuid, color text, size text, stock integer)
  loop
    if v_row.id is null then
      insert into public.product_variants(owner_id, product_id, color, size, stock)
      values(v_owner, v_product_id, trim(v_row.color), trim(v_row.size), v_row.stock);
    else
      update public.product_variants set color = trim(v_row.color), size = trim(v_row.size), stock = v_row.stock
      where id = v_row.id and product_id = v_product_id and owner_id = v_owner;
    end if;
  end loop;
  select coalesce(sum(stock), 0) into v_total from public.product_variants where product_id = v_product_id;
  if v_total > 2147483647 then raise exception 'Las unidades superan el máximo permitido'; end if;
  update public.products set name = trim(p_name), description = coalesce(p_description, ''),
    cost = p_cost, price = p_price, stock = v_total::integer, image_path = p_image_path
  where id = v_product_id and owner_id = v_owner;
  return v_product_id;
end;
$$;

-- Sale lines choose a real color+size combination. Product and variant rows are locked
-- in stable order so two simultaneous sales cannot oversell the same stock.
create or replace function public.create_sale_v3(
  p_customer_id uuid, p_customer_name text, p_customer_phone text,
  p_items jsonb, p_initial_payment integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_customer_id uuid := p_customer_id;
  v_name text := trim(coalesce(p_customer_name, ''));
  v_phone text := trim(coalesce(p_customer_phone, ''));
  v_product_id uuid;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_item record;
  v_total bigint := 0;
  v_cost bigint := 0;
  v_sale uuid;
begin
  if v_owner is null then raise exception 'Debes iniciar sesión'; end if;
  if v_customer_id is not null and (v_name <> '' or v_phone <> '') then raise exception 'Elige un cliente o crea uno nuevo'; end if;
  if v_customer_id is null and v_name <> '' then
    if length(v_name) > 120 or length(v_phone) > 30 then raise exception 'Los datos del cliente son demasiado largos'; end if;
    insert into public.customers(owner_id, name, phone)
    values(v_owner, v_name, v_phone) returning id into v_customer_id;
  elsif v_phone <> '' then
    raise exception 'Escribe el nombre del cliente';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Agrega al menos un producto'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Agrega entre 1 y 50 variantes'; end if;
  if p_initial_payment is null or p_initial_payment < 0 then raise exception 'Pago inicial no válido'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    where x.variant_id is null or x.quantity is null or x.quantity < 1
  ) then raise exception 'Cantidad no válida'; end if;

  for v_product_id in
    select distinct v.product_id from public.product_variants v
    join jsonb_to_recordset(p_items) as x(variant_id uuid) on x.variant_id = v.id
    where v.owner_id = v_owner order by v.product_id
  loop
    perform 1 from public.products where id = v_product_id and owner_id = v_owner for update;
    if not found then raise exception 'Producto no encontrado'; end if;
  end loop;

  for v_item in
    select x.variant_id, sum(x.quantity) as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id order by x.variant_id
  loop
    if v_item.quantity > 2147483647 then raise exception 'Cantidad no válida'; end if;
    select * into v_variant from public.product_variants
      where id = v_item.variant_id and owner_id = v_owner for update;
    if not found then raise exception 'Variante no encontrada'; end if;
    select * into v_product from public.products where id = v_variant.product_id and owner_id = v_owner;
    if v_variant.stock < v_item.quantity then
      raise exception 'No hay suficientes unidades de % · % · Talla %', v_product.name, v_variant.color, v_variant.size;
    end if;
    v_total := v_total + v_product.price::bigint * v_item.quantity;
    v_cost := v_cost + v_product.cost::bigint * v_item.quantity;
  end loop;
  if v_total > 2147483647 or v_cost > 2147483647 then raise exception 'El monto supera el límite permitido'; end if;
  if p_initial_payment > v_total then raise exception 'El pago inicial supera el total'; end if;
  if v_customer_id is null then
    if p_initial_payment <> v_total then raise exception 'Para fiar, selecciona o crea un cliente'; end if;
  elsif not exists (select 1 from public.customers where id = v_customer_id and owner_id = v_owner) then
    raise exception 'Cliente no válido';
  end if;

  insert into public.sales(owner_id, customer_id, total, total_cost)
  values(v_owner, v_customer_id, v_total::integer, v_cost::integer) returning id into v_sale;
  for v_item in
    select x.variant_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id order by x.variant_id
  loop
    select * into v_variant from public.product_variants where id = v_item.variant_id and owner_id = v_owner;
    select * into v_product from public.products where id = v_variant.product_id and owner_id = v_owner;
    insert into public.sale_items(sale_id, product_id, variant_id, product_name, variant_color, variant_size, quantity, unit_price, unit_cost)
    values(v_sale, v_product.id, v_variant.id, v_product.name, v_variant.color, v_variant.size,
           v_item.quantity, v_product.price, v_product.cost);
    update public.product_variants set stock = stock - v_item.quantity where id = v_variant.id;
    update public.products set stock = stock - v_item.quantity where id = v_product.id;
  end loop;
  if p_initial_payment > 0 then
    insert into public.payments(owner_id, sale_id, amount) values(v_owner, v_sale, p_initial_payment);
  end if;
  return v_sale;
end;
$$;

-- Older endpoints only deducted product stock. Prevent them from bypassing variant stock.
revoke execute on function public.create_sale(uuid, jsonb, integer) from authenticated;
revoke execute on function public.create_sale_v2(uuid, text, text, jsonb, integer) from authenticated;
revoke all on function public.create_sale_v3(uuid, text, text, jsonb, integer) from public, anon;
revoke all on function public.save_product_with_variants(uuid, text, text, integer, integer, text, jsonb) from public, anon;
grant execute on function public.create_sale_v3(uuid, text, text, jsonb, integer) to authenticated;
grant execute on function public.save_product_with_variants(uuid, text, text, integer, integer, text, jsonb) to authenticated;
