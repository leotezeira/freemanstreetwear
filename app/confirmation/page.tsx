'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear cart after successful order
    if (orderId) {
      localStorage.removeItem('cart');
      // Trigger a storage event to update cart state across components
      window.dispatchEvent(new Event('storage'));
    }
    setLoading(false);
  }, [orderId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Pedido não encontrado</h1>
        <Link href="/" className="text-green-600 hover:underline">
          Voltar para a loja
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <CheckCircle className="w-24 h-24 text-green-600 mx-auto mb-6" />
        
        <h1 className="text-4xl font-bold mb-4">Pedido Confirmado!</h1>
        
        <p className="text-xl text-gray-600 mb-4">
          Obrigado pela sua compra!
        </p>

        <div className="bg-gray-100 rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-600 mb-2">Número do Pedido</p>
          <p className="text-2xl font-mono font-bold">
            #{orderId.substring(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-gray-700">
            Você receberá um email de confirmação com os detalhes do seu pedido.
          </p>
          <p className="text-gray-700">
            Seu pedido será processado e enviado em breve.
          </p>
        </div>

        <div className="space-x-4">
          <Link
            href="/"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            Continuar Comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
