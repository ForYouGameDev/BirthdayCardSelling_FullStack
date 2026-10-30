
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CONTACT_EMAIL, SITE_NAME } from '../lib/supabase';
import { SetupNotice } from './ui';
import { Cake, Search, ShoppingBag, MoonSun, User, Package } from './icons';

function toggleTheme() {
  const dark = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
}

export default function Layout() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const link = ({ isActive }: { isActive: boolean }) => `rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-[#fff0f5] hover:text-[#c45e86] ${isActive ? 'bg-[#fff0f5] text-[#c45e86]' : 'text-muted'}`;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-[#f1dce4] bg-bg/95 shadow-[0_4px_24px_rgba(174,110,139,0.05)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:gap-x-5">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-[#c45e86]">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0f5]">
              <Cake className="h-6 w-6" />
            </span>
            {SITE_NAME}
          </Link>

          <nav className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
            <NavLink to="/shop" className={link}>Shop</NavLink>
            {isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
          </nav>

          <form className="order-2 ml-auto flex min-w-[10rem] flex-1 sm:order-none sm:max-w-xs" onSubmit={(e) => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q.trim())}`); }} role="search">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b58a9c]" />
              <input className="input rounded-full border-[#f0dce4] bg-white py-2.5 pl-10 shadow-sm placeholder:text-[#bd9eae] focus:border-[#d66d98] focus:ring-2 focus:ring-[#f9dce8]" placeholder="Search cards…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cards" />
            </div>
          </form>

          <div className="order-1 ml-auto flex items-center gap-2 sm:order-none">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0dce4] bg-white text-[#b86c8d] transition hover:border-[#d66d98] hover:bg-[#fff0f5]" onClick={toggleTheme} aria-label="Toggle dark mode">
              <MoonSun className="h-5 w-5" />
            </button>

            <Link to="/cart" className="relative flex h-10 items-center gap-2 rounded-full border border-[#f0dce4] bg-white px-4 text-sm font-semibold text-[#98647c] transition hover:border-[#d66d98] hover:bg-[#fff0f5]" aria-label={`Cart, ${count} items`}>
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && <span className="absolute -right-1 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d66d98] px-1 text-xs text-white">{count}</span>}
            </Link>

            {user ? (
              <div className="flex items-center gap-1">
                <Link to="/orders" className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-[#fff0f5] hover:text-[#c45e86] sm:flex">
                  <Package className="h-4 w-4" />
                  Orders
                </Link>
                <Link to="/account" className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-[#fff0f5] hover:text-[#c45e86]">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                </Link>
                <button className="rounded-full border border-[#f0dce4] bg-white px-3 py-2 text-xs font-semibold text-[#98647c] transition hover:border-[#d66d98] hover:bg-[#fff0f5]" onClick={() => signOut().then(() => nav('/'))}>Sign out</button>
              </div>
            ) : (
              <Link to="/login" className="rounded-full bg-[#d66d98] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#d66d98]/20 transition hover:-translate-y-0.5 hover:bg-[#bd557f]">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:py-10">
        <SetupNotice />
        <Outlet />
      </main>

      <footer className="mt-10 border-t border-[#f1dce4] bg-[#fff8fa] px-4 py-8 text-center text-sm text-[#a18494]">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fceaf1] text-[#d66d98]">
          <Cake className="h-5 w-5" />
        </div>
        <p className="font-display font-semibold text-[#95667d]">Made with love for life's sweetest moments.</p>
        <p className="mt-2">© {new Date().getFullYear()} {SITE_NAME}{CONTACT_EMAIL && <> · <a className="underline decoration-[#d6a5ba] underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></>}</p>
      </footer>
    </div>
  );
}
