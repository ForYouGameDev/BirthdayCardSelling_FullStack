import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CustomizationForm from '../components/CustomizationForm';
import { CardImage, Empty, ErrorBox, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getFieldsFor, getProductBySlug, uploadPersonalPhoto } from '../lib/api';
import { cleanCustomization, resolveFields, validateCustomization } from '../lib/customization';
import { deliveryText, formatPrice } from '../lib/format';
import { clampQty, lineTotals, maxQuantity } from '../lib/pricing';
import { imageUrl } from '../lib/supabase';
import type { Customization, CustomizationField, Product } from '../lib/types';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const nav = useNavigate();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [allFields, setAllFields] = useState<CustomizationField[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [values, setValues] = useState<Customization>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    let live = true;
    setProduct(undefined); setErr(null);
    getProductBySlug(slug)
      .then(async (p) => {
        if (!live) return;
        setProduct(p);
        if (p) {
          setAllFields(await getFieldsFor([p.id]));
          const v = p.product_variants?.[0];
          setVariantId(v?.id ?? '');
        }
      })
      .catch((e: Error) => { if (live) setErr(e.message); });
    return () => { live = false; };
  }, [slug]);

  const fields = useMemo(() => (product ? resolveFields(product, allFields) : []), [product, allFields]);
  const variant = product?.product_variants?.find((v) => v.id === variantId) ?? null;

  if (err) return <ErrorBox message={err} />;
  if (product === undefined) return <Spinner />;
  if (product === null) return <Empty title="Card not found"><Link className="underline" to="/shop">Back to the shop</Link></Empty>;

  const max = maxQuantity(product, variant);
  const soldOut = max === 0;
  const q = clampQty(qty, Math.max(1, max));
  const filledValues: Customization = { ...values };
  for (const k of Object.keys(files)) if (files[k]) filledValues[k] = 'pending-upload';
  const totals = lineTotals(product, variant, q, fields, filledValues);
  const images = product.product_images ?? [];
  const delivery = deliveryText(product.delivery_min_days, product.delivery_max_days);

  async function addToCart() {
    if (!product) return;
    setErr(null);
    const e = validateCustomization(fields, values, Object.fromEntries(Object.entries(files).map(([k, f]) => [k, f ? { type: f.type, size: f.size } : undefined])));
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const clean = cleanCustomization(fields.filter((f) => f.field_type !== 'photo'), values);
      const withPhotos: Customization = { ...clean };
      for (const f of fields) {
        const file = files[f.key];
        if (f.field_type === 'photo' && file) {
          if (!user) throw new Error('Please sign in to upload a photo.');
          withPhotos[f.key] = await uploadPersonalPhoto(user.id, file);
        }
      }
      await add({ product_id: product.id, variant_id: variant?.id ?? null, quantity: q, customization: withPhotos });
      nav('/cart');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not add to cart.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="card aspect-[4/5] overflow-hidden">
          {images[imgIdx] ? <img src={imageUrl(images[imgIdx].path)} alt={images[imgIdx].alt || product.name} className="h-full w-full object-cover" /> : <CardImage product={product} className="h-full w-full" />}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {images.map((im, i) => (
              <button key={im.id} onClick={() => setImgIdx(i)} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === imgIdx ? 'border-accent' : 'border-line'}`} aria-label={`Show image ${i + 1}`}>
                <img src={imageUrl(im.path)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          {product.categories && <Link to={`/shop?category=${product.categories.slug}`} className="text-sm text-accent">{product.categories.name}</Link>}
          <h1 className="text-3xl font-extrabold">{product.name}</h1>
          {product.is_sample && <p className="mt-1 text-sm text-muted">Sample product for testing.</p>}
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold">{formatPrice(totals.unit, product.currency)}</span>
            {product.sale_price_minor != null && <span className="text-muted line-through">{formatPrice(product.price_minor, product.currency)}</span>}
          </div>
          {delivery && <p className="mt-1 text-sm text-muted">{delivery}</p>}
        </div>
        {product.description && <p className="whitespace-pre-line text-muted">{product.description}</p>}

        {(product.product_variants?.length ?? 0) > 0 && (
          <div>
            <label className="label" htmlFor="variant">Option</label>
            <select id="variant" className="input" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              {product.product_variants?.map((v) => <option key={v.id} value={v.id}>{v.label}{v.price_delta_minor ? ` (+${formatPrice(v.price_delta_minor)})` : ''}</option>)}
            </select>
          </div>
        )}

        {(product.product_price_tiers?.length ?? 0) > 0 && (
          <p className="text-sm text-muted">Bulk price: {product.product_price_tiers?.map((t) => `${t.min_qty}+ cards ${formatPrice(t.unit_price_minor)} each`).join(' · ')}</p>
        )}

        <CustomizationForm fields={fields} values={values} files={files} errors={errors} signedIn={Boolean(user)}
          onValue={(k, v) => setValues((s) => ({ ...s, [k]: v }))} onFile={(k, f) => setFiles((s) => ({ ...s, [k]: f }))} />

        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="qty">Quantity</label>
          <input id="qty" type="number" min={1} max={Math.max(1, max)} className="input w-24" value={q} disabled={soldOut} onChange={(e) => setQty(Number(e.target.value))} />
          <button className="btn-primary flex-1" disabled={busy || soldOut} onClick={addToCart}>
            {soldOut ? 'Sold out' : busy ? 'Adding…' : `Add to cart · ${formatPrice(totals.total, product.currency)}`}
          </button>
        </div>
        {product.track_inventory && max > 0 && max <= 5 && <p className="text-sm text-amber-600">Only {max} left.</p>}
        {totals.charge > 0 && <p className="text-sm text-muted">Includes {formatPrice(totals.charge)} per card for personalisation.</p>}
        {err && <ErrorBox message={err} />}
      </div>
    </div>
  );
}
