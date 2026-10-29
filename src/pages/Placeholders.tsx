import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';

export function Checkout() {
  return <Empty title="Checkout is coming in Batch 2">Your cart is saved. Addresses, coupons and Razorpay payment are built in the next batch. <Link className="underline" to="/cart">Back to cart</Link></Empty>;
}
export function AdminHome() {
  return <Empty title="Admin panel is coming in Batch 2">You are signed in as admin. Product, order and coupon management are built in the next batch.</Empty>;
}
export function NotFound() {
  return <Empty title="Page not found"><Link className="underline" to="/">Go home</Link></Empty>;
}
