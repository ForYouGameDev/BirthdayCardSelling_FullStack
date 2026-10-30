import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CONTACT_EMAIL, SITE_NAME } from '../lib/supabase';
import { SetupNotice } from './ui';

function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
}

export default function Layout() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const link = ({ isActive }: { isActive: boolean }) => `text-sm font-medium hover:text-accent ${isActive ? 'text-accent' : ''}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link to="/" className="font-display text-xl font-extrabold text-accent">{SITE_NAME}</Link>
          <nav className="flex gap-4">
            <NavLink to="/shop" className={link}>Shop</NavLink>
            {isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
          </nav>
          <form className="ml-auto min-w-[10rem] flex-1 sm:max-w-xs" onSubmit={(e) => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q.trim())}`); }} role="search">
            <input className="input py-2" placeholder="Search cards…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cards" />
          </form>
          <button className="btn-ghost px-3" onClick={toggleTheme} aria-label="Toggle dark mode">◐</button>
          <Link to="/cart" className="btn-ghost" aria-label={`Cart, ${count} items`}>Cart{count > 0 && <span className="rounded-full bg-accent px-2 text-xs text-white">{count}</span>}</Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/orders" className="text-sm font-medium hover:text-accent">Orders</Link>
              <Link to="/account" className="text-sm font-medium hover:text-accent">{profile?.full_name?.split(' ')[0] || 'Account'}</Link>
              <button className="btn-ghost" onClick={() => signOut().then(() => nav('/'))}>Sign out</button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">Sign in</Link>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <SetupNotice />
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} {SITE_NAME}{CONTACT_EMAIL && <> · <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></>}
      </footer>
    </div>
  );
}
