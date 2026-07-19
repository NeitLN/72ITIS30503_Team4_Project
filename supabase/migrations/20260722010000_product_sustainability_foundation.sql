-- Phase 11 — seller-declared Product Journey foundation.
-- Existing products are intentionally not backfilled: absence means unknown.

create table if not exists public.product_sustainability (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  lifecycle_type text not null default 'not_specified'
    check (lifecycle_type in ('new', 'deadstock', 'pre_loved', 'repaired', 'upcycled', 'not_specified')),
  material text,
  repair_history text,
  upcycle_details text,
  product_story text,
  reuse_packaging boolean not null default false,
  claim_source text not null default 'seller_declared'
    check (claim_source = 'seller_declared'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_sustainability_product_unique unique (product_id),
  constraint product_sustainability_material_length check (material is null or char_length(material) <= 120),
  constraint product_sustainability_repair_length check (repair_history is null or char_length(repair_history) <= 1000),
  constraint product_sustainability_upcycle_length check (upcycle_details is null or char_length(upcycle_details) <= 1000),
  constraint product_sustainability_story_length check (product_story is null or char_length(product_story) <= 1500),
  constraint product_sustainability_repaired_requires_history check (
    lifecycle_type <> 'repaired' or char_length(btrim(coalesce(repair_history, ''))) >= 8
  ),
  constraint product_sustainability_upcycled_requires_details check (
    lifecycle_type <> 'upcycled' or char_length(btrim(coalesce(upcycle_details, ''))) >= 8
  ),
  constraint product_sustainability_unspecified_is_empty check (
    lifecycle_type <> 'not_specified'
    or (
      material is null
      and repair_history is null
      and upcycle_details is null
      and product_story is null
      and reuse_packaging = false
    )
  ),
  constraint product_sustainability_no_unsafe_markup check (
    lower(coalesce(material, '')) !~ '<[[:space:]]*/?[[:space:]]*(script|iframe|object|embed|style)|javascript[[:space:]]*:'
    and lower(coalesce(repair_history, '')) !~ '<[[:space:]]*/?[[:space:]]*(script|iframe|object|embed|style)|javascript[[:space:]]*:'
    and lower(coalesce(upcycle_details, '')) !~ '<[[:space:]]*/?[[:space:]]*(script|iframe|object|embed|style)|javascript[[:space:]]*:'
    and lower(coalesce(product_story, '')) !~ '<[[:space:]]*/?[[:space:]]*(script|iframe|object|embed|style)|javascript[[:space:]]*:'
  )
);

create index if not exists product_sustainability_lifecycle_idx
  on public.product_sustainability(lifecycle_type, product_id);

drop trigger if exists product_sustainability_set_updated_at on public.product_sustainability;
create trigger product_sustainability_set_updated_at
before update on public.product_sustainability
for each row execute function public.set_updated_at();

alter table public.product_sustainability enable row level security;
revoke all on table public.product_sustainability from public, anon, authenticated;
grant select, insert, update, delete on table public.product_sustainability to service_role;

-- Product and Product Journey edits share one transaction and one products.updated_at
-- optimistic-concurrency token. The backend supplies p_seller_id from req.user.id;
-- ordinary clients cannot execute this function.
create or replace function public.stylehub_update_listing_with_sustainability(
  p_seller_id uuid,
  p_product_id uuid,
  p_expected_updated_at timestamptz,
  p_product_updates jsonb,
  p_sustainability jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current_updated_at timestamptz;
  v_updated_at timestamptz;
  v_unknown_product_keys text[];
  v_unknown_sustainability_keys text[];
begin
  if p_product_updates is null or jsonb_typeof(p_product_updates) <> 'object'
     or p_sustainability is null or jsonb_typeof(p_sustainability) <> 'object' then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_LISTING_UPDATE',
      'message', 'Dữ liệu cập nhật sản phẩm không hợp lệ.'
    )::text;
  end if;

  select array_agg(key order by key)
  into v_unknown_product_keys
  from jsonb_object_keys(p_product_updates) as key
  where key not in (
    'name', 'description', 'category_slug', 'brand', 'brand_id', 'condition',
    'size', 'price', 'sale_price', 'stock', 'location', 'is_negotiable'
  );

  select array_agg(key order by key)
  into v_unknown_sustainability_keys
  from jsonb_object_keys(p_sustainability) as key
  where key not in (
    'lifecycle_type', 'material', 'repair_history', 'upcycle_details',
    'product_story', 'reuse_packaging'
  );

  if v_unknown_product_keys is not null or v_unknown_sustainability_keys is not null then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'INVALID_LISTING_UPDATE',
      'message', 'Yêu cầu chứa trường không được phép.'
    )::text;
  end if;

  select p.updated_at
  into v_current_updated_at
  from public.products p
  where p.id = p_product_id
    and p.seller_id = p_seller_id
    and p.listing_source = 'user'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'LISTING_NOT_FOUND',
      'message', 'Không tìm thấy sản phẩm.'
    )::text;
  end if;

  if p_expected_updated_at is not null and v_current_updated_at <> p_expected_updated_at then
    raise exception using errcode = 'P0001', message = jsonb_build_object(
      'code', 'LISTING_STALE',
      'message', 'Sản phẩm đã được cập nhật ở một nơi khác. Vui lòng tải lại trang.'
    )::text;
  end if;

  update public.products p
  set
    name = case when p_product_updates ? 'name' then p_product_updates ->> 'name' else p.name end,
    description = case when p_product_updates ? 'description' then p_product_updates ->> 'description' else p.description end,
    category_slug = case when p_product_updates ? 'category_slug' then p_product_updates ->> 'category_slug' else p.category_slug end,
    brand = case when p_product_updates ? 'brand' then p_product_updates ->> 'brand' else p.brand end,
    brand_id = case when p_product_updates ? 'brand_id' then nullif(p_product_updates ->> 'brand_id', '')::uuid else p.brand_id end,
    condition = case when p_product_updates ? 'condition' then p_product_updates ->> 'condition' else p.condition end,
    size = case when p_product_updates ? 'size' then p_product_updates ->> 'size' else p.size end,
    price = case when p_product_updates ? 'price' then (p_product_updates ->> 'price')::numeric else p.price end,
    sale_price = case when p_product_updates ? 'sale_price' then (p_product_updates ->> 'sale_price')::numeric else p.sale_price end,
    stock = case when p_product_updates ? 'stock' then (p_product_updates ->> 'stock')::integer else p.stock end,
    location = case when p_product_updates ? 'location' then p_product_updates ->> 'location' else p.location end,
    is_negotiable = case when p_product_updates ? 'is_negotiable' then (p_product_updates ->> 'is_negotiable')::boolean else p.is_negotiable end,
    updated_at = clock_timestamp()
  where p.id = p_product_id
    and p.seller_id = p_seller_id
    and p.listing_source = 'user'
  returning p.updated_at into v_updated_at;

  insert into public.product_sustainability (
    product_id,
    lifecycle_type,
    material,
    repair_history,
    upcycle_details,
    product_story,
    reuse_packaging,
    claim_source
  ) values (
    p_product_id,
    p_sustainability ->> 'lifecycle_type',
    nullif(p_sustainability ->> 'material', ''),
    nullif(p_sustainability ->> 'repair_history', ''),
    nullif(p_sustainability ->> 'upcycle_details', ''),
    nullif(p_sustainability ->> 'product_story', ''),
    coalesce((p_sustainability ->> 'reuse_packaging')::boolean, false),
    'seller_declared'
  )
  on conflict (product_id) do update
  set lifecycle_type = excluded.lifecycle_type,
      material = excluded.material,
      repair_history = excluded.repair_history,
      upcycle_details = excluded.upcycle_details,
      product_story = excluded.product_story,
      reuse_packaging = excluded.reuse_packaging,
      claim_source = 'seller_declared';

  return v_updated_at;
end;
$$;

revoke all on function public.stylehub_update_listing_with_sustainability(uuid, uuid, timestamptz, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.stylehub_update_listing_with_sustainability(uuid, uuid, timestamptz, jsonb, jsonb)
  to service_role;
