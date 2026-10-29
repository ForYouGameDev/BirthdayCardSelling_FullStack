-- seed.sql  DEMO DATA. Run ONCE in the Supabase SQL Editor, after the 4 migrations.
-- Every product is named "[SAMPLE] ..." and has is_sample = true. Sample products have no photos
-- (the shop shows a coloured card instead). Delete them from the admin panel before you launch.

-- ---------- categories ----------
insert into public.categories (slug, name, description, sort_order) values
  ('friends',      'For Friends',        'Cards for your best people', 1),
  ('parents',      'For Parents',        'Say thank you on their day', 2),
  ('children',     'For Children',       'Bright, playful designs', 3),
  ('husband-wife', 'Husband & Wife',     'For your partner', 4),
  ('siblings',     'Brothers & Sisters', 'For the ones who grew up with you', 5),
  ('colleagues',   'Colleagues',         'Office-friendly birthday wishes', 6),
  ('milestone',    'Milestone Birthdays','18, 21, 30, 50 and beyond', 7),
  ('funny',        'Funny Cards',        'Guaranteed smiles', 8),
  ('romantic',     'Romantic Cards',     'Sweet and heartfelt', 9),
  ('customizable', 'Make Your Own',      'Fully personalised designs', 10)
on conflict (slug) do nothing;

-- ---------- products (prices in paise: 14900 = Rs 149) ----------
insert into public.products
  (sku, slug, name, description, category_id, product_type, price_minor, sale_price_minor,
   track_inventory, stock_qty, is_featured, is_sample, personalization_enabled, delivery_min_days, delivery_max_days, sold_count)
select v.sku, v.slug, v.name, v.description, c.id, v.ptype, v.price, v.sale,
       v.track, v.stock, v.featured, true, v.pers, v.dmin, v.dmax, v.sold
from (values
  ('SMP-001','sample-confetti-pop',     '[SAMPLE] Confetti Pop Birthday Card', 'A bright confetti design on thick matte card. Sample product.',                 'friends',      'physical', 14900, 12900, true,  120, true,  true,  4, 7, 42),
  ('SMP-002','sample-worlds-best-mom',  '[SAMPLE] World''s Best Mom',          'A warm thank-you card for mum. Sample product.',                                'parents',      'physical', 19900, null,  true,  60,  false, true,  4, 7, 31),
  ('SMP-003','sample-little-star',      '[SAMPLE] Little Star Kids Card',      'A playful digital card you can send by message. Sample product.',               'children',     'digital',  9900,  null,  false, 0,   false, true,  0, 0, 18),
  ('SMP-004','sample-love-you-always',  '[SAMPLE] Love You Always',            'Soft gold foil lettering for someone special. Sample product.',                 'romantic',     'physical', 24900, null,  true,  45,  true,  true,  4, 8, 27),
  ('SMP-005','sample-bro-code',         '[SAMPLE] Bro Code Funny Card',        'Photo upload is switched off for this card (product-level override). Sample.',  'funny',        'physical', 11900, null,  true,  80,  false, true,  3, 6, 55),
  ('SMP-006','sample-gold-50',          '[SAMPLE] 50th Milestone Gold',        'A gold-edged card for a big birthday. Sample product.',                         'milestone',    'physical', 29900, 24900, true,  30,  true,  true,  5, 9, 12),
  ('SMP-007','sample-office-legend',    '[SAMPLE] Office Legend Card',         'Keep it friendly at work. Sample product.',                                     'colleagues',   'physical', 9900,  null,  true,  200, false, true,  3, 6, 22),
  ('SMP-008','sample-sibling-squad',    '[SAMPLE] Sibling Squad',              'Out of stock on purpose, to show the sold-out state. Sample product.',          'siblings',     'physical', 13900, null,  true,  0,   false, true,  4, 7, 9),
  ('SMP-009','sample-popup-cake',        '[SAMPLE] Pop-up Cake Card (Ready-made)','Personalisation is switched off for this product. Sample product.',          'friends',      'physical', 17900, null,  true,  25,  false, false, 5, 8, 14),
  ('SMP-010','sample-design-your-own',  '[SAMPLE] Design Your Own Card',       'A longer message and an optional photo. Sample product.',                       'customizable', 'both',     21900, null,  true,  100, true,  true,  5, 9, 33)
) as v(sku, slug, name, description, cat, ptype, price, sale, track, stock, featured, pers, dmin, dmax, sold)
join public.categories c on c.slug = v.cat
on conflict (sku) do nothing;

-- ---------- variants ----------
insert into public.product_variants (product_id, label, size, finish, paper, price_delta_minor, position)
select p.id, v.label, v.size, v.finish, v.paper, v.delta, v.pos
from (values
  ('SMP-001','A5 Matte',   'A5','Matte',  '300 gsm', 0,    1),
  ('SMP-001','A5 Glossy',  'A5','Glossy', '300 gsm', 2000, 2),
  ('SMP-001','A4 Premium', 'A4','Matte',  '350 gsm', 5000, 3),
  ('SMP-004','Standard',   'A5','Foil',   '300 gsm', 0,    1),
  ('SMP-004','Large',      'A4','Foil',   '350 gsm', 6000, 2),
  ('SMP-010','Standard',   'A5','Matte',  '300 gsm', 0,    1),
  ('SMP-010','Textured',   'A5','Matte',  'Textured 320 gsm', 3000, 2)
) as v(sku, label, size, finish, paper, delta, pos)
join public.products p on p.sku = v.sku;

-- ---------- quantity pricing ----------
insert into public.product_price_tiers (product_id, min_qty, unit_price_minor)
select p.id, v.minq, v.unit
from (values ('SMP-001', 5, 11000), ('SMP-001', 10, 9900), ('SMP-007', 10, 8500)) as v(sku, minq, unit)
join public.products p on p.sku = v.sku
on conflict (product_id, min_qty) do nothing;

-- ---------- GLOBAL personalisation fields (apply to every product with personalisation on) ----------
insert into public.customization_fields
  (scope, key, label, help_text, field_type, is_required, max_length, extra_price_minor, position)
values
  ('global','recipient_name','Recipient name',       'Who is the card for?',                    'text',     true,  40,  0,    1),
  ('global','sender_name',   'From (your name)',     'Printed at the bottom of the card.',      'text',     false, 40,  0,    2),
  ('global','message',       'Your message',         'We print this inside the card.',          'textarea', true,  300, 0,    3),
  ('global','photo',         'Add a photo',          'JPG, PNG or WebP, up to 5 MB. Optional.', 'photo',    false, null,5000, 4),
  ('global','instructions',  'Special instructions', 'Anything we should know?',                'textarea', false, 200, 0,    5)
on conflict do nothing;

-- ---------- PRODUCT-LEVEL overrides (they win over the global field with the same key) ----------
-- Bro Code: photo switched OFF for this product only.
insert into public.customization_fields
  (scope, product_id, key, label, field_type, is_enabled, position)
select 'product', p.id, 'photo', 'Add a photo', 'photo', false, 4
from public.products p where p.sku = 'SMP-005'
on conflict do nothing;

-- Design Your Own: longer message (500 characters) and the photo becomes required.
insert into public.customization_fields
  (scope, product_id, key, label, help_text, field_type, is_enabled, is_required, max_length, extra_price_minor, position)
select 'product', p.id, 'message', 'Your message', 'Up to 500 characters, printed inside the card.', 'textarea', true, true, 500, 0, 3
from public.products p where p.sku = 'SMP-010'
on conflict do nothing;
insert into public.customization_fields
  (scope, product_id, key, label, help_text, field_type, is_enabled, is_required, extra_price_minor, position)
select 'product', p.id, 'photo', 'Your photo', 'Required for this design. JPG, PNG or WebP, up to 5 MB.', 'photo', true, true, 5000, 4
from public.products p where p.sku = 'SMP-010'
on conflict do nothing;
