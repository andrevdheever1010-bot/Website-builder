'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PRODUCTS } from '@/lib/products';
import type { Order, OrderStatus } from '@/types';

type Tab = 'orders' | 'products' | 'settings';

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700 border-amber-200',
  paid:       'bg-emerald-100 text-emerald-700 border-emerald-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  ready:      'bg-purple-100 text-purple-700 border-purple-200',
  delivered:  'bg-green-100 text-green-700 border-green-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
};

const STATUS_NEXT: Record<string, OrderStatus[]> = {
  pending:    ['paid', 'cancelled'],
  paid:       ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready:      ['delivered', 'cancelled'],
  delivered:  [],
  cancelled:  [],
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, todayOrders: 0, paidOrders: 0, totalRevenue: 0 });
  const [products, setProducts] = useState<Array<{ slug: string; name: string; soldOut: boolean }>>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    const url = statusFilter ? `/api/orders?status=${statusFilter}&limit=50` : '/api/orders?limit=50';
    const res = await fetch(url);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoadingOrders(false);
  }, [statusFilter]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Order marked as ${status}`);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder((o) => o ? { ...o, status } : o);
    } else {
      toast.error('Failed to update order status');
    }
  };

  const toggleSoldOut = async (slug: string, soldOut: boolean) => {
    const res = await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, soldOut }),
    });
    if (res.ok) {
      setProducts((prev) => prev.map((p) => p.slug === slug ? { ...p, soldOut } : p));
      toast.success(soldOut ? 'Product marked as sold out' : 'Product marked as available');
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setPwLoading(true);
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Password changed successfully');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } else {
      toast.error(data.error || 'Failed to change password');
    }
    setPwLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    fetch('/api/admin/stats').then((r) => r.json()).then(setStats).catch(console.error);
    fetch('/api/products')
      .then((r) => r.json())
      .then((data: Array<{ slug: string; soldOut: boolean }>) => {
        setProducts(
          PRODUCTS.map((p) => ({
            slug: p.slug,
            name: p.name,
            soldOut: data.find((d) => d.slug === p.slug)?.soldOut ?? false,
          }))
        );
      })
      .catch(console.error);
  }, []);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'orders', label: 'Orders', icon: '📋' },
    { id: 'products', label: 'Products', icon: '🍗' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Header */}
      <div className="bg-bark-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-ember-500 rounded-xl flex items-center justify-center font-display font-bold text-lg shadow-ember">
            A+
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-none">A+Market</p>
            <p className="text-white/50 text-xs">Admin Console</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Orders', value: stats.totalOrders, icon: '📋' },
            { label: "Today's Orders", value: stats.todayOrders, icon: '📅' },
            { label: 'Paid Orders', value: stats.paidOrders, icon: '✅' },
            { label: 'Revenue', value: `R${stats.totalRevenue.toFixed(0)}`, icon: '💰' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-card">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-2xl font-display font-bold text-bark-900">{s.value}</p>
              <p className="text-bark-700/60 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-card w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-ember-500 text-white shadow-ember'
                  : 'text-bark-700 hover:bg-cream-100'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {tab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Filter */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {['', 'pending', 'paid', 'processing', 'ready', 'delivered', 'cancelled'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      statusFilter === s
                        ? 'bg-bark-900 text-white border-bark-900'
                        : 'bg-white text-bark-700 border-cream-300 hover:border-bark-900'
                    }`}
                  >
                    {s || 'All'}
                  </button>
                ))}
              </div>

              {loadingOrders ? (
                <div className="text-center py-12 text-bark-700/50">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-bark-700/50">No orders found.</div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`bg-white rounded-2xl p-4 shadow-card cursor-pointer hover:shadow-card-hover transition-all border-2 ${
                        selectedOrder?.id === order.id ? 'border-ember-500' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-bark-900 text-sm">#{order.orderNumber}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status] || ''}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-bark-700/80 text-sm">{order.name} · {order.phone}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-bark-700/60 text-xs">{new Date(order.createdAt).toLocaleDateString('en-ZA')}</p>
                        <p className="font-bold text-ember-600 text-sm font-display">R{order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Detail */}
            <div>
              <AnimatePresence mode="wait">
                {selectedOrder ? (
                  <motion.div
                    key={selectedOrder.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-white rounded-2xl shadow-card p-5 sticky top-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-bold text-bark-900">#{selectedOrder.orderNumber}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[selectedOrder.status] || ''}`}>
                        {selectedOrder.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-bark-700/60">Customer</span>
                        <span className="font-semibold text-bark-900">{selectedOrder.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bark-700/60">Phone</span>
                        <a href={`tel:${selectedOrder.phone}`} className="font-semibold text-ember-600">{selectedOrder.phone}</a>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bark-700/60">Delivery</span>
                        <span className="font-semibold text-bark-900 capitalize">{selectedOrder.deliveryType}</span>
                      </div>
                      {selectedOrder.deliveryType === 'delivery' && (
                        <div>
                          <span className="text-bark-700/60">Address</span>
                          <p className="text-bark-900 text-xs mt-0.5">{selectedOrder.address}</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-cream-200 pt-4 mb-4">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm py-1">
                          <span className="text-bark-700">{item.quantity}x {item.productName} ({item.size})</span>
                          <span className="font-semibold text-bark-900">R{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                      <div className="border-t border-cream-200 pt-2 mt-2 flex justify-between font-bold text-bark-900">
                        <span className="font-display">Total</span>
                        <span className="text-ember-600 font-display">R{selectedOrder.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {STATUS_NEXT[selectedOrder.status]?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-bark-700/60 font-semibold uppercase tracking-wider">Update Status</p>
                        {STATUS_NEXT[selectedOrder.status].map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => updateOrderStatus(selectedOrder.id, nextStatus)}
                            className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                              nextStatus === 'cancelled'
                                ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                                : 'bg-ember-500 hover:bg-ember-600 text-white'
                            }`}
                          >
                            Mark as {nextStatus}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl shadow-card p-8 text-center text-bark-700/40"
                  >
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-sm">Select an order to view details</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {tab === 'products' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product.slug} className="bg-white rounded-2xl p-5 shadow-card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-bark-900">{product.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border inline-block mt-1 ${
                    product.soldOut ? STATUS_COLORS.cancelled : STATUS_COLORS.paid
                  }`}>
                    {product.soldOut ? 'Sold Out' : 'Available'}
                  </span>
                </div>
                <button
                  onClick={() => toggleSoldOut(product.slug, !product.soldOut)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    product.soldOut ? 'bg-red-400' : 'bg-emerald-400'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      product.soldOut ? 'translate-x-0.5' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="max-w-md">
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="font-display font-bold text-bark-900 mb-5">Change Password</h3>
              <form onSubmit={changePassword} className="space-y-4">
                {[
                  { field: 'current' as const, label: 'Current Password' },
                  { field: 'newPw' as const, label: 'New Password' },
                  { field: 'confirm' as const, label: 'Confirm New Password' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-bark-800 mb-1.5">{label}</label>
                    <input
                      type="password"
                      value={pwForm[field]}
                      onChange={(e) => setPwForm((p) => ({ ...p, [field]: e.target.value }))}
                      required
                      className="w-full border border-cream-300 rounded-xl px-4 py-3 text-bark-900 text-sm focus:border-ember-400 focus:ring-2 focus:ring-ember-400/20 outline-none transition-all"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="w-full bg-ember-500 hover:bg-ember-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  {pwLoading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
