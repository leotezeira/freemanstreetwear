'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Package, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get products stats
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, active');
      
      const totalProducts = allProducts?.length || 0;
      const activeProducts = allProducts?.filter(p => p.active).length || 0;

      // Get orders stats
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, total, payment_status');

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const totalRevenue = orders
        ?.filter(o => o.payment_status === 'approved')
        .reduce((sum, o) => sum + parseFloat(o.total), 0) || 0;

      setStats({
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Carregando estatísticas...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total de Produtos</p>
              <p className="text-3xl font-bold">{stats.totalProducts}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.activeProducts} ativos
              </p>
            </div>
            <Package className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total de Pedidos</p>
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
              <p className="text-sm text-yellow-600 mt-1">
                {stats.pendingOrders} pendentes
              </p>
            </div>
            <ShoppingBag className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Receita Total</p>
              <p className="text-3xl font-bold">
                R$ {stats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Status</p>
              <p className="text-xl font-bold text-green-600">Online</p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/products?action=new"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-500 hover:bg-green-50 text-center transition-colors"
          >
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold">Adicionar Produto</p>
          </Link>

          <Link
            href="/admin/products"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 text-center transition-colors"
          >
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold">Gerenciar Produtos</p>
          </Link>

          <Link
            href="/admin/orders"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-500 hover:bg-purple-50 text-center transition-colors"
          >
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-semibold">Ver Pedidos</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
