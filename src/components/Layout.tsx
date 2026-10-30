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
  const link = ({ isActive }: { isActive: boolean }) => `rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-accent/5 hover:text-accent ${isActive ? 'bg-accent/10 text-accent' : 'text-muted'}`;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="bg-ink px-4 py-2 text-center text-[11px] font-semibold tracking-[.16em] text-bg sm:text-xs">CELEBRATE THE LITTLE MOMENTS · MAKE IT PERSONAL</div>
      <header className="no-print sticky top-0 z-30 border-b border-line/80 bg-bg/90 shadow-sm shadow-ink/[.03] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="mr-2 flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-lg text-white shadow-md shadow-accent/20" aria-hidden="true">✦</span>
            {SITE_NAME}
          </Link>
          <nav className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
            <NavLink to="/shop" className={link}>Shop</NavLink>
            {isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
          </nav>
          <form className="order-4 w-full sm:order-none sm:ml-auto sm:max-w-xs" onSubmit={(e) => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q.trim())}`); }} role="search">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">⌕</span>
              <input className="input rounded-full border-transparent bg-surface py-2.5 pl-10 shadow-inner shadow-ink/[.02] focus:border-accent" placeholder="Find a card…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cards" />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <button className="btn-ghost h-10 w-10 rounded-full px-0" onClick={toggleTheme} aria-label="Toggle dark mode">◐</button>
            <Link to="/cart" className="btn-ghost h-10 rounded-full px-4" aria-label={`Cart, ${count} items`}><span aria-hidden="true">♡</span><span className="hidden sm:inline">Bag</span>{count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] text-white">{count}</span>}</Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/orders" className="text-sm font-semibold text-muted hover:text-accent">Orders</Link>
                <Link to="/account" className="text-sm font-semibold text-muted hover:text-accent">{profile?.full_name?.split(' ')[0] || 'Account'}</Link>
                <button className="btn-primary px-4 py-2.5" onClick={() => signOut().then(() => nav('/'))}>Sign out</button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary px-5 py-2.5">Sign in</Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <SetupNotice />
        <Outlet />
      </main>
      <footer className="no-print mt-10 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div><Link to="/" className="font-display text-lg font-extrabold text-ink">{SITE_NAME} <span className="text-accent">✦</span></Link><p className="mt-1 text-xs text-muted">Thoughtful cards for life's happiest moments.</p></div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted"><Link to="/shop" className="hover:text-accent">Shop cards</Link>{user && <Link to="/orders" className="hover:text-accent">My orders</Link>}{CONTACT_EMAIL && <a className="hover:text-accent" href={`mailto:${CONTACT_EMAIL}`}>Get in touch</a>}</div>
          <p className="text-xs text-muted">© {new Date().getFullYear()} {SITE_NAME}</p>
        </div>
      </footer>
    </div>
  );
}
