create extension if not exists pgcrypto;
create table if not exists public.categories (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, active boolean not null default true);
create table if not exists public.brands (id uuid primary key default gen_random_uuid(), name text unique not null, slug text unique not null, active boolean not null default true);
alter table public.brands add column if not exists slug text;
update public.brands set slug=lower(regexp_replace(trim(name),'[^a-zA-Z0-9]+','-','g')) where slug is null or trim(slug)='';
alter table public.brands alter column slug set not null;
create unique index if not exists brands_slug_idx on public.brands(slug);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories, brand_id uuid not null references public.brands,
 name text not null, slug text unique not null, description text not null default '', short_description text not null default '',
 base_price numeric(12,2) not null check(base_price>=0), compare_at_price numeric(12,2), sku text unique not null,
 featured boolean not null default false, active boolean not null default false, new_arrival boolean not null default false, best_seller boolean not null default false,
 primary_image text not null, specifications jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.product_variants (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, sku text unique not null, size text, color text not null default 'Default', stock integer not null default 0 check(stock>=0), price numeric(12,2) check(price>=0));
create table if not exists public.product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, url text not null, position integer not null default 0);
create table if not exists public.customers (id uuid primary key default gen_random_uuid(), name text not null, phone text not null, email text, created_at timestamptz not null default now());
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(), order_number text unique not null, customer_id uuid references public.customers,
 customer_name text not null, phone text not null, alternate_phone text, email text, province text not null, city text not null, address text not null, landmark text, postal_code text, notes text,
 subtotal numeric(12,2) not null, delivery_charge numeric(12,2) not null, discount numeric(12,2) not null default 0, total numeric(12,2) not null,
 payment_method text not null default 'cash_on_delivery' check(payment_method='cash_on_delivery'), payment_status text not null default 'unpaid' check(payment_status in ('unpaid','paid','refunded')),
 order_status text not null default 'pending' check(order_status in ('pending','confirmed','processing','shipped','delivered','cancelled','returned')),
 idempotency_key uuid unique not null, request_hash text not null, receipt_hash text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders on delete cascade, product_id uuid references public.products, variant_id uuid references public.product_variants, product_name text not null, sku text not null, size text, color text not null, unit_price numeric(12,2) not null, quantity integer not null check(quantity>0), line_total numeric(12,2) not null, primary_image text not null);
create table if not exists public.inventory_movements (id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants, order_id uuid references public.orders, quantity integer not null, reason text not null, created_at timestamptz not null default now());
create table if not exists public.store_settings (key text primary key, value jsonb not null);
insert into public.store_settings values ('delivery','{"default":250,"free_above":20000,"cities":{}}') on conflict(key) do nothing;
create table if not exists public.rate_limits (key text primary key, attempts integer not null, expires_at timestamptz not null);
create table if not exists public.newsletter_subscribers (id uuid primary key default gen_random_uuid(), email text unique not null, created_at timestamptz not null default now());
create index if not exists products_category_idx on public.products(category_id);
create index if not exists variants_product_idx on public.product_variants(product_id);
create index if not exists images_product_idx on public.product_images(product_id);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists orders_tracking_idx on public.orders(order_number,phone);
do $$ declare t text; begin
 foreach t in array array['categories','brands','products','product_variants','product_images','customers','orders','order_items','inventory_movements','store_settings','rate_limits','newsletter_subscribers'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.categories, public.brands, public.products, public.product_variants, public.product_images to anon, authenticated;
drop policy if exists active_categories on public.categories;
drop policy if exists active_brands on public.brands;
drop policy if exists active_products on public.products;
drop policy if exists active_variants on public.product_variants;
drop policy if exists active_images on public.product_images;
create policy active_categories on public.categories for select to anon, authenticated using(active);
create policy active_brands on public.brands for select to anon, authenticated using(active);
create policy active_products on public.products for select to anon, authenticated using(active and exists(select 1 from public.categories c where c.id=category_id and c.active) and exists(select 1 from public.brands b where b.id=brand_id and b.active));
create policy active_variants on public.product_variants for select to anon, authenticated using(stock>0 and exists(select 1 from public.products p where p.id=product_id and p.active));
create policy active_images on public.product_images for select to anon, authenticated using(exists(select 1 from public.products p where p.id=product_id and p.active));

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
 delete from public.rate_limits where expires_at < now();
 insert into public.rate_limits(key,attempts,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set attempts=public.rate_limits.attempts+1 returning attempts into n;
 return n<=p_limit;
end $$;

create or replace function public.place_guest_order(p_shipping jsonb,p_items jsonb,p_expected_total numeric,p_key uuid,p_request_hash text,p_receipt_hash text) returns text language plpgsql security definer set search_path='' as $$
declare existing public.orders; line record; rowdata record; subtotal numeric:=0; delivery numeric; settings jsonb; oid uuid; cid uuid; onum text; count_items integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into existing from public.orders where idempotency_key=p_key;
 if found then
   if existing.request_hash<>p_request_hash then raise exception 'Request key already used'; end if;
   return existing.order_number;
 end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then raise exception 'Invalid basket'; end if;
 if (select count(distinct x->>'variantId') from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'Duplicate variants'; end if;
 if coalesce(p_shipping->>'phone','') !~ '^03[0-9]{9}$' or length(coalesce(p_shipping->>'customer_name',''))<2 or length(coalesce(p_shipping->>'address',''))<10 then raise exception 'Invalid delivery details'; end if;
 -- Lock products and variants in a deterministic order, including price rows.
 for line in select (x->>'variantId')::uuid as vid,(x->>'quantity')::integer as qty from jsonb_array_elements(p_items) x order by x->>'variantId' loop
  if line.qty is null or line.qty<1 or line.qty>20 then raise exception 'Invalid quantity'; end if;
  select v.stock,coalesce(v.price,p.base_price) price into rowdata from public.product_variants v join public.products p on p.id=v.product_id join public.categories c on c.id=p.category_id join public.brands b on b.id=p.brand_id where v.id=line.vid and p.active and c.active and b.active for update of v,p;
  if not found then raise exception 'Product no longer available'; end if;
  if rowdata.stock<line.qty then raise exception 'Insufficient stock. Please review your bag.'; end if;
  subtotal:=subtotal+rowdata.price*line.qty; count_items:=count_items+1;
 end loop;
 select value into settings from public.store_settings where key='delivery' for share;
 if settings is null then raise exception 'Delivery is not configured'; end if;
 delivery:=coalesce((settings->'cities'->>lower(p_shipping->>'city'))::numeric,(settings->>'default')::numeric,250);
 if coalesce((settings->>'free_above')::numeric,0)>0 and subtotal>=(settings->>'free_above')::numeric then delivery:=0; end if;
 if subtotal+delivery<>p_expected_total then raise exception 'Prices changed. Please review your order again.'; end if;
 insert into public.customers(name,phone,email) values(p_shipping->>'customer_name',p_shipping->>'phone',nullif(p_shipping->>'email','')) returning id into cid;
 onum:='TS-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 insert into public.orders(order_number,customer_id,customer_name,phone,alternate_phone,email,province,city,address,landmark,postal_code,notes,subtotal,delivery_charge,total,idempotency_key,request_hash,receipt_hash)
 values(onum,cid,p_shipping->>'customer_name',p_shipping->>'phone',p_shipping->>'alternate_phone',p_shipping->>'email',p_shipping->>'province',p_shipping->>'city',p_shipping->>'address',p_shipping->>'landmark',p_shipping->>'postal_code',p_shipping->>'notes',subtotal,delivery,subtotal+delivery,p_key,p_request_hash,p_receipt_hash) returning id into oid;
 for line in select (x->>'variantId')::uuid as vid,(x->>'quantity')::integer as qty from jsonb_array_elements(p_items) x loop
  insert into public.order_items(order_id,product_id,variant_id,product_name,sku,size,color,unit_price,quantity,line_total,primary_image)
  select oid,p.id,v.id,p.name,v.sku,v.size,v.color,coalesce(v.price,p.base_price),line.qty,coalesce(v.price,p.base_price)*line.qty,p.primary_image from public.product_variants v join public.products p on p.id=v.product_id where v.id=line.vid;
  update public.product_variants set stock=stock-line.qty where id=line.vid and stock>=line.qty;
  if not found then raise exception 'Stock changed'; end if;
  insert into public.inventory_movements(variant_id,order_id,quantity,reason) values(line.vid,oid,-line.qty,'sale');
 end loop;
 return onum;
end $$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.place_guest_order(jsonb,jsonb,numeric,uuid,text,text) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer),public.place_guest_order(jsonb,jsonb,numeric,uuid,text,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
-- Uploads and changes are performed by the separate admin application only.
drop policy if exists product_image_read on storage.objects;
create policy product_image_read on storage.objects for select to anon,authenticated using(bucket_id='product-images');
