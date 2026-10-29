-- 0003_functions.sql  Small helpers.

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();

-- Keep the cart's updated_at fresh whenever its items change (handy for "abandoned cart" reports later).
create or replace function public.touch_cart() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.carts set updated_at = now() where id = coalesce(new.cart_id, old.cart_id);
  return null;
end $$;

create trigger cart_items_touch after insert or update or delete on public.cart_items
for each row execute function public.touch_cart();
