-- Run in the Supabase SQL editor. All business data belongs to its authenticated owner.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  cost integer not null check (cost >= 0),
  price integer not null check (price >= 0),
  stock integer not null check (stock >= 0),
  image_path text,
  created_at timestamptz not null default now(),
  unique(id, owner_id)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 120),
  phone text not null default '',
  created_at timestamptz not null default now(),
  unique(id, owner_id)
);
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  customer_id uuid not null,
  total integer not null check (total >= 0),
  total_cost integer not null check (total_cost >= 0),
  created_at timestamptz not null default now(),
  foreign key (customer_id, owner_id) references public.customers(id, owner_id)
);
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  unit_cost integer not null check (unit_cost >= 0)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  sale_id uuid not null references public.sales(id),
  amount integer not null check (amount > 0),
  paid_at date not null default (now() at time zone 'America/Bogota')::date,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index on public.products(owner_id);
create index on public.customers(owner_id);
create index on public.sales(owner_id, created_at desc);
create index on public.payments(sale_id);

alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;

create policy "owner products" on public.products for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner customers" on public.customers for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner sales read" on public.sales for select to authenticated using (owner_id = (select auth.uid()));
create policy "owner sale items read" on public.sale_items for select to authenticated using (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())));
create policy "owner payments read" on public.payments for select to authenticated using (owner_id = (select auth.uid()) and exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())));

-- Atomic sale: lock stock, create item snapshots, subtract stock and record optional first payment.
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
  if not exists (select 1 from public.customers where id = p_customer_id and owner_id = v_owner) then raise exception 'Cliente no válido'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Agrega al menos un producto'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Demasiados productos'; end if;
  if p_initial_payment is null or p_initial_payment < 0 then raise exception 'Pago inicial no válido'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    where x.product_id is null or x.quantity is null or x.quantity <= 0
  ) then raise exception 'Cantidad no válida'; end if;

  -- Sorted locks avoid concurrent stock races and deadlocks.
  for v_item in
    select x.product_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
    group by x.product_id order by x.product_id
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then raise exception 'Cantidad no válida'; end if;
    select * into v_product from public.products where id = v_item.product_id and owner_id = v_owner for update;
    if not found then raise exception 'Producto no encontrado'; end if;
    if v_product.stock < v_item.quantity then raise exception 'No hay suficientes unidades de %', v_product.name; end if;
    v_total := v_total + v_product.price::bigint * v_item.quantity;
    v_cost := v_cost + v_product.cost::bigint * v_item.quantity;
  end loop;
  if v_total > 2147483647 or v_cost > 2147483647 then raise exception 'El monto supera el límite permitido'; end if;
  if p_initial_payment > v_total then raise exception 'El pago inicial supera el total'; end if;

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
  if v_paid + p_amount > v_total then raise exception 'El abono supera el saldo pendiente'; end if;
  insert into public.payments(owner_id, sale_id, amount, paid_at, note)
  values(v_owner, p_sale_id, p_amount, p_paid_at, left(coalesce(p_note, ''), 300)) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_sale(uuid, jsonb, integer) from public, anon;
revoke all on function public.add_payment(uuid, integer, date, text) from public, anon;
grant execute on function public.create_sale(uuid, jsonb, integer) to authenticated;
grant execute on function public.add_payment(uuid, integer, date, text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "owners upload product images" on storage.objects for insert to authenticated
with check (bucket_id = 'productos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners update product images" on storage.objects for update to authenticated
using (bucket_id = 'productos' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'productos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners remove product images" on storage.objects for delete to authenticated
using (bucket_id = 'productos' and (storage.foldername(name))[1] = (select auth.uid())::text);
