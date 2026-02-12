'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Package, ShoppingBag, LogOut, LayoutDashboard } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session && pathname !== '/admin/login') {
      router.push('/admin/login');
      return;
    }

    if (session) {
      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .eq('active', true)
        .single();

      if (!adminUser && pathname !== '/admin/login') {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      setUser(session.user);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Navbar */}
      <nav className="bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/admin/dashboard" className="text-xl font-bold">
                Admin - Freeman
              </Link>
              
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/admin/dashboard"
                  className={`flex items-center gap-2 px-3 py-2 rounded ${
                    pathname === '/admin/dashboard'
                      ? 'bg-gray-700'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  href="/admin/products"
                  className={`flex items-center gap-2 px-3 py-2 rounded ${
                    pathname.startsWith('/admin/products')
                      ? 'bg-gray-700'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Produtos
                </Link>
                <Link
                  href="/admin/orders"
                  className={`flex items-center gap-2 px-3 py-2 rounded ${
                    pathname.startsWith('/admin/orders')
                      ? 'bg-gray-700'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Pedidos
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-sm hover:text-gray-300"
                target="_blank"
              >
                Ver Loja
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 hover:text-gray-300"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
