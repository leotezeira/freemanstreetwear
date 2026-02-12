'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/components/cart/CartProvider';
import { ShoppingCart } from 'lucide-react';

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const router = useRouter();

  const handleAddToCart = () => {
    addItem(product, quantity);
    router.push('/cart');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Product Image */}
        <div className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Sem imagem
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
          
          {product.category && (
            <p className="text-gray-500 mb-4 capitalize">{product.category}</p>
          )}

          <div className="text-3xl font-bold text-green-600 mb-6">
            {formatPrice(product.price)}
          </div>

          {product.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Descrição</h2>
              <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-4">
            {product.size && (
              <div>
                <span className="font-semibold">Tamanho:</span>
                <span className="ml-2">{product.size}</span>
              </div>
            )}
            {product.color && (
              <div>
                <span className="font-semibold">Cor:</span>
                <span className="ml-2">{product.color}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <span className="font-semibold">Disponibilidade:</span>
            {product.stock > 0 ? (
              <span className="ml-2 text-green-600">
                {product.stock} em estoque
              </span>
            ) : (
              <span className="ml-2 text-red-600">Esgotado</span>
            )}
          </div>

          {product.stock > 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="quantity" className="block font-semibold mb-2">
                  Quantidade:
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                  className="border rounded px-4 py-2 w-24"
                />
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                Adicionar ao Carrinho
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
