import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ui/ProductCard";
import { Product } from "@/types";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">Freeman Streetwear</h1>
        <p className="text-xl text-gray-600">Streetwear autêntico e de qualidade</p>
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">Nossos Produtos</h2>
        
        {!products || products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Nenhum produto disponível no momento.</p>
            <p className="text-sm text-gray-500">
              Configure seu banco de dados Supabase e adicione produtos através do painel admin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-16 text-center">
        <Link 
          href="/admin" 
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Acessar Painel Admin
        </Link>
      </section>
    </div>
  );
}
