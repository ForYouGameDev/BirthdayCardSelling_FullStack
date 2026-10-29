import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { RequireAdmin, RequireAuth } from './components/RequireAuth';
import { useAuth } from './context/AuthContext';
import Account from './pages/Account';
import Cart from './pages/Cart';
import Home from './pages/Home';
import Login from './pages/Login';
import { AdminHome, Checkout, NotFound } from './pages/Placeholders';
import ProductPage from './pages/ProductPage';
import ResetPassword from './pages/ResetPassword';
import Shop from './pages/Shop';

/** After Google sign-in the browser lands on the home page; send the person to the page they wanted. */
function AfterLogin() {
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!user) return;
    try {
      const to = sessionStorage.getItem('after_login');
      if (to) { sessionStorage.removeItem('after_login'); if (to.startsWith('/') && !to.startsWith('//')) nav(to, { replace: true }); }
    } catch { /* ignore */ }
  }, [user, nav]);
  return null;
}

export default function App() {
  return (
    <>
      <AfterLogin />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:slug" element={<ProductPage />} />
          <Route path="cart" element={<Cart />} />
          <Route path="login" element={<Login />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="admin" element={<RequireAdmin><AdminHome /></RequireAdmin>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
