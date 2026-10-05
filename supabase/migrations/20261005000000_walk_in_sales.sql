-- Run this AFTER 20261004000000_initial.sql. Existing customers and sales are preserved.
alter table public.sales alter column customer_id drop not null;

-- A walk-in sale is allowed only if it is paid in full. Stock and payment remain atomic.
create or replace function public.create_sale(p_customer_id uuid, p_items jsonb, p_initial_payment integer default 0)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_item record;
  v_product public.products%rowtype;
  v_total bigint := 0;
  v_cost bigint := 0;
  v_sale uuid;
begin
  if v_owner is null then raise exception 'Debes iniciar sesión'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Agrega al menos un producto'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Demasiados productos'; end if;
  if p_initial_payment is null or p_initial_payment < 0 then raise exception 'Pago inicial no válido'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    where x.product_id is null or x.quantity is null or x.quantity <= 0
  ) then raise exception 'Cantidad no válida'; end if;

  -- Always lock inventory in a stable order, including when products repeat in the request.
  for v_item in
    select x.product_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    group by x.product_id order by x.product_id
  loop
    select * into v_product from public.products where id = v_item.product_id and owner_id = v_owner for update;
    if not found then raise exception 'Producto no encontrado'; end if;
    if v_product.stock < v_item.quantity then raise exception 'No hay suficientes unidades de %', v_product.name; end if;
    v_total := v_total + v_product.price::bigint * v_item.quantity;
    v_cost := v_cost + v_product.cost::bigint * v_item.quantity;
  end loop;
  if v_total > 2147483647 or v_cost > 2147483647 then raise exception 'El monto supera el límite permitido'; end if;
  if p_initial_payment > v_total then raise exception 'El pago inicial supera el total'; end if;
  if p_customer_id is null then
    if p_initial_payment <> v_total then raise exception 'Para fiar, selecciona o crea un cliente'; end if;
  elsif not exists (select 1 from public.customers where id = p_customer_id and owner_id = v_owner) then
    raise exception 'Cliente no válido';
  end if;

  insert into public.sales(owner_id, customer_id, total, total_cost)
  values(v_owner, p_customer_id, v_total::integer, v_cost::integer) returning id into v_sale;
  for v_item in
    select x.product_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    group by x.product_id order by x.product_id
  loop
    select * into v_product from public.products where id = v_item.product_id and owner_id = v_owner;
    insert into public.sale_items(sale_id, product_id, product_name, quantity, unit_price, unit_cost)
    values(v_sale, v_product.id, v_product.name, v_item.quantity, v_product.price, v_product.cost);
    update public.products set stock = stock - v_item.quantity where id = v_product.id;
  end loop;
  if p_initial_payment > 0 then
    insert into public.payments(owner_id, sale_id, amount) values(v_owner, v_sale, p_initial_payment);
  end if;
  return v_sale;
end;
$$;

-- New clients are created in the same database transaction as their first sale.
create or replace function public.create_sale_v2(
  p_customer_id uuid, p_customer_name text, p_customer_phone text,
  p_items jsonb, p_initial_payment integer
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_customer_id uuid := p_customer_id;
  v_name text := trim(coalesce(p_customer_name, ''));
  v_phone text := trim(coalesce(p_customer_phone, ''));
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
  return public.create_sale(v_customer_id, p_items, p_initial_payment);
end;
$$;

revoke all on function public.create_sale_v2(uuid, text, text, jsonb, integer) from public, anon;
grant execute on function public.create_sale_v2(uuid, text, text, jsonb, integer) to authenticated;
