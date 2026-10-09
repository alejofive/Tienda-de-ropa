-- Run AFTER 20261006000000_product_variants.sql. Existing sales and payments are preserved.
-- A request ID makes retries of the same sale atomic and idempotent, even across connections.
create table public.sale_requests (
  owner_id uuid not null references auth.users(id),
  id uuid not null,
  payload jsonb not null,
  sale_id uuid references public.sales(id),
  primary key (owner_id, id)
);
alter table public.sale_requests enable row level security;

alter table public.sales add column cancelled_at timestamptz;

create table public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  sale_id uuid not null references public.sales(id),
  request_id uuid not null,
  request_payload jsonb not null,
  reason text not null check (reason in ('error', 'return')),
  total integer not null check (total >= 0),
  total_cost integer not null check (total_cost >= 0),
  refund integer not null check (refund >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, request_id)
);
create index on public.sale_returns(sale_id);
create table public.sale_return_items (
  return_id uuid not null references public.sale_returns(id),
  item_id uuid not null references public.sale_items(id),
  quantity integer not null check (quantity > 0),
  primary key (return_id, item_id)
);
create index on public.sale_return_items(item_id);
alter table public.sale_returns enable row level security;
alter table public.sale_return_items enable row level security;
create policy "owner returns read" on public.sale_returns for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "owner return items read" on public.sale_return_items for select to authenticated
  using (exists (select 1 from public.sale_returns r where r.id = return_id and r.owner_id = (select auth.uid())));

-- Replace the five-argument endpoint: old callers must not bypass request deduplication.
revoke execute on function public.create_sale_v3(uuid, text, text, jsonb, integer) from authenticated;
create or replace function public.create_sale_v3(
  p_customer_id uuid, p_customer_name text, p_customer_phone text,
  p_items jsonb, p_initial_payment integer, p_request_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_customer_id uuid := p_customer_id;
  v_name text := trim(coalesce(p_customer_name, ''));
  v_phone text := trim(coalesce(p_customer_phone, ''));
  v_payload jsonb := jsonb_build_object('customer_id', p_customer_id, 'name', v_name, 'phone', v_phone,
                                         'items', p_items, 'payment', p_initial_payment);
  v_previous public.sale_requests%rowtype;
  v_product_id uuid;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_item record;
  v_total bigint := 0;
  v_cost bigint := 0;
  v_sale uuid;
begin
  if v_owner is null then raise exception 'Debes iniciar sesión'; end if;
  if p_request_id is null then raise exception 'Falta el identificador del intento de venta'; end if;
  insert into public.sale_requests(owner_id, id, payload) values(v_owner, p_request_id, v_payload)
    on conflict do nothing;
  if not found then
    select * into v_previous from public.sale_requests where owner_id = v_owner and id = p_request_id;
    if v_previous.payload is distinct from v_payload then raise exception 'Este intento de venta ya se usó con otros datos'; end if;
    if v_previous.sale_id is null then raise exception 'No se pudo completar la venta. Inténtalo de nuevo'; end if;
    return v_previous.sale_id;
  end if;

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
  update public.sale_requests set sale_id = v_sale where owner_id = v_owner and id = p_request_id;
  return v_sale;
end;
$$;
revoke all on function public.create_sale_v3(uuid, text, text, jsonb, integer, uuid) from public, anon;
grant execute on function public.create_sale_v3(uuid, text, text, jsonb, integer, uuid) to authenticated;

-- Lock the sale first. Payments use the same lock, so balances cannot race a return.
create function public.process_sale_return(
  p_sale_id uuid, p_items jsonb, p_refund integer, p_reason text, p_request_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_payload jsonb := jsonb_build_object('sale_id', p_sale_id, 'items', p_items, 'refund', p_refund, 'reason', p_reason);
  v_previous public.sale_returns%rowtype;
  v_sale public.sales%rowtype;
  v_line public.sale_items%rowtype;
  v_variant public.product_variants%rowtype;
  v_item record;
  v_product_id uuid;
  v_taken bigint;
  v_total bigint := 0;
  v_cost bigint := 0;
  v_paid bigint;
  v_remaining bigint;
  v_return uuid;
begin
  if v_owner is null then raise exception 'Debes iniciar sesión'; end if;
  if p_request_id is null then raise exception 'Falta el identificador de la devolución'; end if;
  select * into v_previous from public.sale_returns where owner_id = v_owner and request_id = p_request_id;
  if found then
    if v_previous.request_payload is distinct from v_payload then raise exception 'Esta devolución ya se usó con otros datos'; end if;
    return v_previous.id;
  end if;
  select * into v_sale from public.sales where id = p_sale_id and owner_id = v_owner for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  select * into v_previous from public.sale_returns where owner_id = v_owner and request_id = p_request_id;
  if found then
    if v_previous.request_payload is distinct from v_payload then raise exception 'Esta devolución ya se usó con otros datos'; end if;
    return v_previous.id;
  end if;
  if v_sale.cancelled_at is not null then raise exception 'Esta venta ya está anulada'; end if;
  if p_reason not in ('error', 'return') or p_reason is null then raise exception 'Selecciona el motivo de la devolución'; end if;
  if p_refund is null or p_refund < 0 then raise exception 'Reembolso no válido'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Selecciona las unidades a devolver'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Selecciona las unidades a devolver'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer)
    where x.item_id is null or x.quantity is null or x.quantity < 1
  ) then raise exception 'Cantidad no válida'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer)
    group by x.item_id having count(*) > 1
  ) then raise exception 'Hay prendas repetidas en la devolución'; end if;

  for v_item in select * from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer) order by x.item_id loop
    select * into v_line from public.sale_items where id = v_item.item_id and sale_id = p_sale_id;
    if not found then raise exception 'Prenda no encontrada en esta venta'; end if;
    select coalesce(sum(quantity), 0) into v_taken from public.sale_return_items where item_id = v_line.id;
    if v_item.quantity > v_line.quantity - v_taken then raise exception 'Ya se devolvieron esas unidades de %', v_line.product_name; end if;
    v_total := v_total + v_item.quantity::bigint * v_line.unit_price;
    v_cost := v_cost + v_item.quantity::bigint * v_line.unit_cost;
  end loop;
  if v_total > v_sale.total or v_cost > v_sale.total_cost then raise exception 'El valor de la devolución supera la venta'; end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where sale_id = p_sale_id;
  select v_paid - coalesce(sum(refund), 0) into v_paid from public.sale_returns where sale_id = p_sale_id;
  if p_refund > v_paid or p_refund > v_total then raise exception 'El reembolso supera lo pagado o lo devuelto'; end if;
  if v_paid - p_refund > v_sale.total - v_total then raise exception 'Debes reembolsar al menos el excedente del nuevo total'; end if;

  -- Product locks in stable order serialize against edits and simultaneous stock changes.
  for v_product_id in
    select distinct i.product_id from public.sale_items i
    join jsonb_to_recordset(p_items) as x(item_id uuid) on x.item_id = i.id
    where i.sale_id = p_sale_id order by i.product_id
  loop
    perform 1 from public.products where id = v_product_id and owner_id = v_owner for update;
    if not found then raise exception 'El producto ya no existe; no se puede reponer automáticamente'; end if;
  end loop;
  if exists (
    select 1 from public.sale_items i
    join jsonb_to_recordset(p_items) as x(item_id uuid) on x.item_id = i.id
    where i.sale_id = p_sale_id and i.product_id is null
  ) then raise exception 'El producto ya no existe; no se puede reponer automáticamente'; end if;

  insert into public.sale_returns(owner_id, sale_id, request_id, request_payload, reason, total, total_cost, refund)
    values(v_owner, p_sale_id, p_request_id, v_payload, p_reason, v_total::integer, v_cost::integer, p_refund)
    returning id into v_return;
  for v_item in select * from jsonb_to_recordset(p_items) as x(item_id uuid, quantity integer) order by x.item_id loop
    select * into v_line from public.sale_items where id = v_item.item_id and sale_id = p_sale_id;
    insert into public.sale_return_items(return_id, item_id, quantity) values(v_return, v_line.id, v_item.quantity);
    select * into v_variant from public.product_variants
      where id = v_line.variant_id and product_id = v_line.product_id and owner_id = v_owner for update;
    if not found then
      select * into v_variant from public.product_variants
        where product_id = v_line.product_id and owner_id = v_owner
          and lower(color) = lower(coalesce(nullif(v_line.variant_color, ''), 'Único'))
          and lower(size) = lower(coalesce(nullif(v_line.variant_size, ''), 'Única')) for update;
    end if;
    if found then
      if v_variant.stock > 2147483647 - v_item.quantity then raise exception 'Las existencias superarían el máximo permitido'; end if;
      update public.product_variants set stock = stock + v_item.quantity where id = v_variant.id;
    else
      insert into public.product_variants(owner_id, product_id, color, size, stock)
      values(v_owner, v_line.product_id, coalesce(nullif(v_line.variant_color, ''), 'Único'),
             coalesce(nullif(v_line.variant_size, ''), 'Única'), v_item.quantity);
    end if;
    update public.products set stock = stock + v_item.quantity
      where id = v_line.product_id and owner_id = v_owner and stock <= 2147483647 - v_item.quantity;
    if not found then raise exception 'Las existencias superarían el máximo permitido'; end if;
  end loop;

  select coalesce(sum(i.quantity - coalesce(r.quantity, 0)), 0) into v_remaining
  from public.sale_items i
  left join (select item_id, sum(quantity) as quantity from public.sale_return_items group by item_id) r on r.item_id = i.id
  where i.sale_id = p_sale_id;
  update public.sales set total = total - v_total::integer, total_cost = total_cost - v_cost::integer,
    cancelled_at = case when v_remaining = 0 then now() else null end
  where id = p_sale_id and owner_id = v_owner;
  return v_return;
end;
$$;
revoke all on function public.process_sale_return(uuid, jsonb, integer, text, uuid) from public, anon;
grant execute on function public.process_sale_return(uuid, jsonb, integer, text, uuid) to authenticated;

-- Subsequent payments use what has actually been kept after refunds, not gross receipts.
create or replace function public.add_payment(p_sale_id uuid, p_amount integer, p_paid_at date, p_note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_total integer;
  v_paid bigint;
  v_id uuid;
begin
  if v_owner is null then raise exception 'Debes iniciar sesión'; end if;
  select total into v_total from public.sales where id = p_sale_id and owner_id = v_owner for update;
  if not found then raise exception 'Venta no encontrada'; end if;
  if p_amount is null or p_amount <= 0 or p_paid_at is null or p_paid_at > (now() at time zone 'America/Bogota')::date then raise exception 'Abono o fecha no válidos'; end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where sale_id = p_sale_id;
  select v_paid - coalesce(sum(refund), 0) into v_paid from public.sale_returns where sale_id = p_sale_id;
  if v_paid + p_amount > v_total then raise exception 'El abono supera el saldo pendiente'; end if;
  insert into public.payments(owner_id, sale_id, amount, paid_at, note)
  values(v_owner, p_sale_id, p_amount, p_paid_at, left(coalesce(p_note, ''), 300)) returning id into v_id;
  return v_id;
end;
$$;
