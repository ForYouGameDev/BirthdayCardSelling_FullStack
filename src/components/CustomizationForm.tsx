import { formatPrice } from '../lib/format';
import { formatBytes } from '../lib/format';
import type { FileLike } from '../lib/customization';
import type { Customization, CustomizationField } from '../lib/types';

type Props = {
  fields: CustomizationField[];
  values: Customization;
  files: Record<string, File | undefined>;
  errors: Record<string, string>;
  signedIn: boolean;
  onValue: (key: string, v: string) => void;
  onFile: (key: string, f: File | undefined) => void;
};

export type { FileLike };

export default function CustomizationForm({ fields, values, files, errors, signedIn, onValue, onFile }: Props) {
  if (!fields.length) return null;
  return (
    <fieldset className="card space-y-4 p-4">
      <legend className="px-2 font-display text-lg font-bold">Personalise your card</legend>
      {fields.map((f) => {
        const id = `cf_${f.key}`;
        const price = f.extra_price_minor > 0 ? ` (+${formatPrice(f.extra_price_minor)} per card)` : '';
        return (
          <div key={f.id}>
            <label className="label" htmlFor={id}>{f.label}{f.is_required ? <span className="text-accent"> *</span> : <span className="text-muted"> (optional)</span>}{price}</label>
            {f.field_type === 'text' && <input id={id} className="input" maxLength={f.max_length ?? undefined} value={values[f.key] ?? ''} onChange={(e) => onValue(f.key, e.target.value)} />}
            {f.field_type === 'textarea' && <textarea id={id} rows={4} className="input" maxLength={f.max_length ?? undefined} value={values[f.key] ?? ''} onChange={(e) => onValue(f.key, e.target.value)} />}
            {f.field_type === 'select' && (
              <select id={id} className="input" value={values[f.key] ?? ''} onChange={(e) => onValue(f.key, e.target.value)}>
                <option value="">Choose…</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {f.field_type === 'photo' && (signedIn ? (
              <input id={id} type="file" accept={f.allowed_mime_types.join(',')} className="input" onChange={(e) => onFile(f.key, e.target.files?.[0])} />
            ) : (
              <p className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">Please sign in to upload a photo.</p>
            ))}
            {f.help_text && <p className="mt-1 text-xs text-muted">{f.help_text}</p>}
            {f.field_type === 'photo' && <p className="mt-1 text-xs text-muted">{f.allowed_mime_types.map((t) => t.replace('image/', '').toUpperCase()).join(', ')} up to {formatBytes(f.max_file_bytes)}{files[f.key] ? ` · selected: ${files[f.key]?.name}` : ''}</p>}
            {f.max_length != null && (f.field_type === 'text' || f.field_type === 'textarea') && <p className="mt-1 text-right text-xs text-muted">{(values[f.key] ?? '').length}/{f.max_length}</p>}
            {errors[f.key] && <p className="err" role="alert">{errors[f.key]}</p>}
          </div>
        );
      })}
    </fieldset>
  );
}
