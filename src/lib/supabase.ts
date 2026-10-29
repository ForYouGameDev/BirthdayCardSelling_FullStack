import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/** False when the site was built without Supabase settings. The app then shows a setup notice instead of crashing. */
export const isConfigured = Boolean(url && key);

// Placeholders keep createClient from throwing when unconfigured; no request is made because the UI checks isConfigured first.
export const supabase = createClient(isConfigured ? url : 'https://placeholder.invalid', isConfigured ? key : 'placeholder', {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'Birthday Card Store';
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';
export const imageUrl = (path: string) => supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
