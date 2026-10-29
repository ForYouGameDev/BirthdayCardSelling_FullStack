import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

/** UI guard only. The real protection is Row Level Security in the database. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading } = useAuth();
  if (loading || (user && !profile)) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  if (!isAdmin) return <div className="card p-8 text-center">This area is for store admins only.</div>;
  return <>{children}</>;
}
