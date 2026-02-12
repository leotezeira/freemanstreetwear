'use client';

import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { ShoppingCart } from 'lucide-react';

export default function Navbar() {
  const { totalItems } = useCart();

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold">
            Freeman Streetwear
          </Link>

          <div className="flex items-center space-x-6">
            <Link href="/" className="hover:text-gray-300">
              Produtos
            </Link>
            <Link href="/cart" className="hover:text-gray-300 relative">
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
