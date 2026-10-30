import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  ['/admin', 'Dashboard', true], ['/admin/orders', 'Orders', false], ['/admin/products', 'Products', false],
  ['/admin/categories', 'Categories', false], ['/admin/personalization', 'Personalisation', false], ['/admin/settings', 'Settings', false],
] as const;

export default function AdminLayout() {
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2" aria-label="Admin">
        {tabs.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `btn ${isActive ? 'bg-accent text-white' : 'border border-line bg-surface'}`}>{label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
