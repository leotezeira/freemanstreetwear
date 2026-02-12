'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
        <div className="relative aspect-square bg-gray-200">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Sem imagem
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
          {product.category && (
            <p className="text-sm text-gray-500 mb-2">{product.category}</p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-green-600">
              {formatPrice(product.price)}
            </span>
            {product.stock > 0 ? (
              <span className="text-sm text-green-600">Em estoque</span>
            ) : (
              <span className="text-sm text-red-600">Esgotado</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
