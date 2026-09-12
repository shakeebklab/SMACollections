-- Incremental migration. Requires customer-store/202609120001_store.sql.
begin;
create table if not exists public.admin_profiles(id uuid primary key references auth.users(id), name text not null, email text not null, role text not null check(role in ('owner','manager','staff')), active boolean not null default true, created_at timestamptz not null default now());
create table if not exists public.order_status_history(id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders, admin_id uuid references auth.users, previous_status text, status text not null, reason text, created_at timestamptz not null default now());
create table if not exists public.admin_activity_logs(id uuid primary key default gen_random_uuid(), admin_id uuid references auth.users, action text not null, entity_type text not null, entity_id text, summary jsonb, created_at timestamptz not null default now());
create table if not exists public.customer_notes(id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers, admin_id uuid not null default auth.uid() references auth.users, note text not null check(length(note) between 1 and 4000), created_at timestamptz not null default now());
alter table public.brands add column if not exists slug text;
update public.brands set slug=trim(both '-' from regexp_replace(lower(name),'[^a-z0-9]+','-','g'))||'-'||left(id::text,8) where slug is null;
alter table public.brands alter column slug set not null;
create unique index if not exists brands_slug_idx on public.brands(slug);
alter table public.categories add column if not exists image_url text;
alter table public.brands add column if not exists image_url text;
alter table public.products add column if not exists archived boolean not null default false;
alter table public.products add column if not exists product_type text not null default 'shoes' check(product_type in ('shoes','watches'));
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.variant_costs(variant_id uuid primary key references public.product_variants, cost_price numeric(12,2) not null default 0 check(cost_price>=0));
alter table private.variant_costs enable row level security;
alter table public.product_variants add column if not exists low_stock_threshold integer not null default 5 check(low_stock_threshold>=0);
alter table public.order_items add column if not exists cost_price_snapshot numeric(12,2) check(cost_price_snapshot>=0);
-- NULL on historical lines means unknown cost; never invent historical profit.
alter table public.orders add column if not exists inventory_restored boolean not null default false;
alter table public.orders add column if not exists internal_notes text not null default '';
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check(payment_status in ('unpaid','paid','refunded','partially_refunded'));
alter table public.inventory_movements add column if not exists admin_id uuid references auth.users;
alter table public.inventory_movements add column if not exists notes text;
create unique index if not exists one_order_restore_per_variant on public.inventory_movements(order_id,variant_id) where reason in ('cancellation_restore','return_restore');
create index if not exists orders_created_idx on public.orders(created_at);
create index if not exists orders_status_idx on public.orders(order_status);
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists movements_variant_created_idx on public.inventory_movements(variant_id,created_at);
create index if not exists history_order_idx on public.order_status_history(order_id,created_at);
create or replace function public.admin_role() returns text language sql stable security definer set search_path='' as $$ select role from public.admin_profiles where id=auth.uid() and active $$;
revoke all on function public.admin_role() from public;
grant execute on function public.admin_role() to authenticated;
do $$ declare t text; begin
 foreach t in array array['admin_profiles','order_status_history','admin_activity_logs','customer_notes'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['categories','brands','products','product_variants','product_images','customers','orders','order_items','inventory_movements','store_settings','order_status_history','admin_activity_logs','customer_notes'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy admin_read on public.%I for select to authenticated using(public.admin_role() is not null)',t);
 end loop;
 foreach t in array array['categories','brands','products','product_images'] loop
 execute format('grant insert,update on public.%I to authenticated',t);
 execute format('create policy catalog_insert on public.%I for insert to authenticated with check(public.admin_role() in (''owner'',''manager''))',t);
 execute format('create policy catalog_update on public.%I for update to authenticated using(public.admin_role() in (''owner'',''manager'')) with check(public.admin_role() in (''owner'',''manager''))',t);
 end loop;
end $$;
create policy profile_read on public.admin_profiles for select to authenticated using(id=auth.uid() or public.admin_role()='owner');
grant insert,update on public.store_settings to authenticated;
create policy settings_insert on public.store_settings for insert to authenticated with check(public.admin_role()='owner');
create policy settings_update on public.store_settings for update to authenticated using(public.admin_role()='owner') with check(public.admin_role()='owner');
grant insert on public.customer_notes to authenticated;
create policy notes_insert on public.customer_notes for insert to authenticated with check(public.admin_role() is not null and admin_id=auth.uid());
-- Costs stay outside the storefront's wildcard public variant selection.


create view public.admin_variants with (security_barrier=true) as select v.*,coalesce(c.cost_price,0) cost_price from public.product_variants v left join private.variant_costs c on c.variant_id=v.id where public.admin_role() is not null;
revoke all on public.admin_variants from public,anon;
grant select on public.admin_variants to authenticated;
create or replace function public.create_default_variant() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.product_variants(product_id,sku,color,low_stock_threshold) values(new.id,new.sku||'-DEFAULT','Default',coalesce((select (value->>'low_stock_threshold')::integer from public.store_settings where key='store'),5)); return new; end $$;
create trigger product_default_variant after insert on public.products for each row execute function public.create_default_variant();
create or replace function public.audit_admin_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null then
 insert into public.admin_activity_logs(admin_id,action,entity_type,entity_id,summary) values(auth.uid(),lower(TG_OP),TG_TABLE_NAME,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'key'),jsonb_build_object('before',case when TG_OP='UPDATE' then to_jsonb(old)-'email'-'phone'-'address'-'internal_notes' else null end,'after',to_jsonb(new)-'email'-'phone'-'address'-'internal_notes'));
 end if; return new;
end $$;
do $$ declare t text; begin foreach t in array array['products','product_variants','product_images','categories','brands','orders','inventory_movements','store_settings','admin_profiles'] loop
 execute format('create trigger admin_audit after insert or update on public.%I for each row execute function public.audit_admin_change()',t);
end loop; end $$;
create or replace function public.snapshot_order_cost() returns trigger language plpgsql security definer set search_path='' as $$ begin
 select cost_price into new.cost_price_snapshot from private.variant_costs where variant_id=new.variant_id;
 return new; end $$;
create trigger order_cost_snapshot before insert on public.order_items for each row execute function public.snapshot_order_cost();
-- Every stock change, including existing storefront checkout, gets a movement.
-- The existing checkout inserts its own sale movement; suppress that duplicate below.
create or replace function public.stock_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare delta integer; begin
 delta:=new.stock-case when TG_OP='INSERT' then 0 else old.stock end;
 if delta<>0 then
 insert into public.inventory_movements(variant_id,quantity,reason,admin_id,notes,order_id)
 values(new.id,delta,coalesce(nullif(current_setting('app.movement_reason',true),''),case when TG_OP='INSERT' then 'opening_stock' else 'manual_adjustment' end),auth.uid(),nullif(current_setting('app.movement_notes',true),''),nullif(current_setting('app.order_id',true),'')::uuid);
 end if; return new; end $$;
create trigger variant_stock_audit after insert or update of stock on public.product_variants for each row execute function public.stock_audit();
-- Attach the checkout order to its automatic movement and suppress the legacy duplicate.
create or replace function public.checkout_movement_context() returns trigger language plpgsql security definer set search_path='' as $$ begin
 perform set_config('app.movement_reason','sale',true); perform set_config('app.order_id',new.order_id::text,true); return new; end $$;
create trigger checkout_stock_context after insert on public.order_items for each row execute function public.checkout_movement_context();
create or replace function public.suppress_legacy_sale() returns trigger language plpgsql set search_path='' as $$ begin
 if new.reason='sale' and pg_trigger_depth()=1 and exists(select 1 from public.inventory_movements where variant_id=new.variant_id and order_id=new.order_id and reason='sale') then return null; end if; return new; end $$;
create trigger skip_legacy_sale before insert on public.inventory_movements for each row execute function public.suppress_legacy_sale();
create or replace function public.admin_adjust_stock(p_variant uuid,p_quantity integer,p_reason text,p_notes text) returns void language plpgsql security definer set search_path='' as $$ begin
 if public.admin_role() is null then raise exception 'Administrator required'; end if;
 if p_quantity=0 or p_quantity is null or p_reason not in ('purchase','damage','loss','manual_adjustment','opening_stock') or length(trim(coalesce(p_notes,'')))<3 then raise exception 'Quantity, movement type and reason required'; end if;
 if p_reason in ('damage','loss') and p_quantity>0 or p_reason in ('purchase','opening_stock') and p_quantity<0 then raise exception 'Invalid quantity direction'; end if;
 perform set_config('app.movement_reason',p_reason,true); perform set_config('app.movement_notes',p_notes,true); perform set_config('app.order_id','',true);
 update public.product_variants set stock=stock+p_quantity where id=p_variant and stock+p_quantity>=0;
 if not found then raise exception 'Variant missing or insufficient stock'; end if;
end $$;
create or replace function public.admin_order_update(p_order uuid,p_status text,p_payment text,p_restore boolean,p_reason text,p_notes text) returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; line record; begin
 if public.admin_role() is null then raise exception 'Administrator required'; end if;
 select * into o from public.orders where id=p_order for update;
 if not found then raise exception 'Order not found'; end if;
 if p_status<>o.order_status and not ((o.order_status='pending' and p_status in ('confirmed','cancelled')) or (o.order_status='confirmed' and p_status in ('processing','cancelled')) or (o.order_status='processing' and p_status in ('shipped','cancelled')) or (o.order_status='shipped' and p_status in ('delivered','returned')) or (o.order_status='delivered' and p_status='returned' and public.admin_role() in ('owner','manager'))) then raise exception 'Invalid status transition'; end if;
 if p_status in ('cancelled','returned') and p_status<>o.order_status and length(trim(coalesce(p_reason,'')))<3 then raise exception 'Cancellation/return reason required'; end if;
 if p_restore then
 if p_status not in ('cancelled','returned') or o.inventory_restored then raise exception 'Stock cannot be restored twice or for this status'; end if;
 perform set_config('app.movement_reason',case when p_status='cancelled' then 'cancellation_restore' else 'return_restore' end,true);
 perform set_config('app.movement_notes',p_reason,true); perform set_config('app.order_id',p_order::text,true);
 for line in select variant_id,sum(quantity)::integer qty from public.order_items where order_id=p_order group by variant_id order by variant_id loop
 if line.variant_id is null then raise exception 'Missing historical variant'; end if;
 update public.product_variants set stock=stock+line.qty where id=line.variant_id;
 end loop;
 end if;
 update public.orders set order_status=p_status,payment_status=p_payment,inventory_restored=inventory_restored or p_restore,internal_notes=p_notes,updated_at=now() where id=p_order;
 if p_status<>o.order_status then insert into public.order_status_history(order_id,admin_id,previous_status,status,reason) values(p_order,auth.uid(),o.order_status,p_status,p_reason); end if;
end $$;
create or replace function public.admin_save_variant(p_id uuid,p_product uuid,p_sku text,p_size text,p_color text,p_cost numeric,p_price numeric,p_threshold integer) returns uuid language plpgsql security definer set search_path='' as $$ declare vid uuid; begin
 if public.admin_role() not in ('owner','manager') or public.admin_role() is null then raise exception 'Manager required'; end if;
 if length(trim(p_sku))<2 then raise exception 'SKU required'; end if;
 if p_id is null then insert into public.product_variants(product_id,sku,size,color,price,low_stock_threshold) values(p_product,p_sku,nullif(p_size,''),p_color,p_price,p_threshold) returning id into vid;
 else update public.product_variants set sku=p_sku,size=nullif(p_size,''),color=p_color,price=p_price,low_stock_threshold=p_threshold where id=p_id and product_id=p_product returning id into vid; end if;
 if vid is null then raise exception 'Variant not found'; end if; insert into private.variant_costs(variant_id,cost_price) values(vid,p_cost) on conflict(variant_id) do update set cost_price=excluded.cost_price; return vid; end $$;
create or replace function public.admin_set_profile(p_id uuid,p_name text,p_email text,p_role text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$ begin
 perform pg_advisory_xact_lock(937214);
 if public.admin_role() is distinct from 'owner' then raise exception 'Owner required'; end if;
 if exists(select 1 from public.admin_profiles where id=p_id and active and role='owner') and (not p_active or p_role<>'owner') and (select count(*) from public.admin_profiles where active and role='owner')<=1 then raise exception 'Cannot remove last active owner'; end if;
 insert into public.admin_profiles(id,name,email,role,active) values(p_id,p_name,p_email,p_role,p_active) on conflict(id) do update set name=excluded.name,email=excluded.email,role=excluded.role,active=excluded.active;
end $$;
do $$ declare f record; begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('admin_adjust_stock','admin_order_update','admin_save_variant','admin_set_profile') loop
 execute format('revoke all on function %s from public,anon',f.signature); execute format('grant execute on function %s to authenticated',f.signature);
end loop; end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) select b,b,true,5242880,array['image/jpeg','image/png','image/webp','image/avif'] from unnest(array['product-images','category-images','brand-images','store-assets']) b on conflict(id) do update set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/avif'];
create policy admin_asset_read on storage.objects for select to anon,authenticated using(bucket_id in ('category-images','brand-images','store-assets'));
create policy admin_asset_insert on storage.objects for insert to authenticated with check(bucket_id in ('product-images','category-images','brand-images','store-assets') and public.admin_role() in ('owner','manager') and (bucket_id<>'store-assets' or public.admin_role()='owner'));
create policy admin_asset_update on storage.objects for update to authenticated using(bucket_id in ('product-images','category-images','brand-images','store-assets') and public.admin_role() in ('owner','manager') and (bucket_id<>'store-assets' or public.admin_role()='owner')) with check(bucket_id in ('product-images','category-images','brand-images','store-assets') and public.admin_role() in ('owner','manager') and (bucket_id<>'store-assets' or public.admin_role()='owner'));
create policy admin_asset_delete on storage.objects for delete to authenticated using(bucket_id in ('product-images','category-images','brand-images','store-assets') and public.admin_role() in ('owner','manager') and (bucket_id<>'store-assets' or public.admin_role()='owner'));
commit;
