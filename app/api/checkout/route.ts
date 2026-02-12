import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getShippingCost } from '@/lib/utils';
// @ts-ignore - MercadoPago SDK types
import mercadopago from 'mercadopago';

// Configure MercadoPago
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, shipping, items } = body;

    // Validate required fields
    if (!customer?.email || !customer?.name || !shipping?.address || !items?.length) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Fetch products and validate stock
    const productIds = items.map((item: any) => item.product_id);
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', productIds);

    if (productsError || !products) {
      return NextResponse.json(
        { error: 'Erro ao buscar produtos' },
        { status: 500 }
      );
    }

    // Calculate totals and validate stock
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id);
      
      if (!product) {
        return NextResponse.json(
          { error: `Produto ${item.product_id} não encontrado` },
          { status: 400 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Estoque insuficiente para ${product.name}` },
          { status: 400 }
        );
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_image_url: product.image_url,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    const shippingCost = getShippingCost();
    const total = subtotal + shippingCost;

    // Create order in database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_email: customer.email,
        customer_name: customer.name,
        customer_phone: customer.phone,
        shipping_address: shipping.address,
        shipping_city: shipping.city,
        shipping_state: shipping.state,
        shipping_postal_code: shipping.postal_code,
        shipping_country: shipping.country || 'Brasil',
        subtotal,
        shipping_cost: shippingCost,
        total,
        payment_method: 'mercadopago',
        payment_status: 'pending',
        status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Erro ao criar pedido' },
        { status: 500 }
      );
    }

    // Create order items
    const orderItemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsWithOrderId);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback order
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Erro ao criar itens do pedido' },
        { status: 500 }
      );
    }

    // Create MercadoPago preference
    try {
      const preference = {
        items: orderItems.map((item) => ({
          title: item.product_name,
          unit_price: item.product_price,
          quantity: item.quantity,
          currency_id: 'BRL',
        })),
        payer: {
          name: customer.name,
          email: customer.email,
          phone: {
            number: customer.phone,
          },
          address: {
            street_name: shipping.address,
            city: shipping.city,
            state_name: shipping.state,
            zip_code: shipping.postal_code,
          },
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/confirmation?order_id=${order.id}`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?error=payment_failed`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/confirmation?order_id=${order.id}`,
        },
        auto_return: 'approved' as const,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
        external_reference: order.id,
        statement_descriptor: 'FREEMAN STREETWEAR',
      };

      const response = await mercadopago.preferences.create(preference);

      // Update order with payment preference ID
      await supabaseAdmin
        .from('orders')
        .update({ payment_id: response.body.id })
        .eq('id', order.id);

      return NextResponse.json({
        order_id: order.id,
        init_point: response.body.init_point,
        sandbox_init_point: response.body.sandbox_init_point,
      });
    } catch (mpError) {
      console.error('MercadoPago error:', mpError);
      return NextResponse.json({
        order_id: order.id,
        message: 'Pedido criado, mas erro ao configurar pagamento',
      });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
