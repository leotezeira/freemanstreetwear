import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import nodemailer from 'nodemailer';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendOrderConfirmationEmail(order: any, items: any[]) {
  try {
    const itemsList = items
      .map(
        (item) =>
          `${item.product_name} - Quantidade: ${item.quantity} - ${(item.subtotal).toFixed(2)} BRL`
      )
      .join('\n');

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: order.customer_email,
      subject: `Pedido Confirmado - Freeman Streetwear #${order.id.substring(0, 8)}`,
      text: `
Olá ${order.customer_name},

Seu pedido foi confirmado e está sendo processado!

Número do Pedido: ${order.id}

Itens:
${itemsList}

Subtotal: ${order.subtotal.toFixed(2)} BRL
Frete: ${order.shipping_cost.toFixed(2)} BRL
Total: ${order.total.toFixed(2)} BRL

Endereço de Entrega:
${order.shipping_address}
${order.shipping_city}, ${order.shipping_state} - ${order.shipping_postal_code}
${order.shipping_country}

Obrigado por comprar na Freeman Streetwear!

---
Freeman Streetwear
      `,
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // MercadoPago sends different types of notifications
    if (body.type === 'payment') {
      const paymentId = body.data.id;

      // Get payment details from MercadoPago
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });
      
      if (!paymentData) {
        return NextResponse.json({ received: true });
      }

      const orderId = paymentData.external_reference;
      const status = paymentData.status;

      // Get order from database
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Order not found:', orderId);
        return NextResponse.json({ received: true });
      }

      // Update order payment status
      const updateData: any = {
        payment_id: paymentId.toString(),
        payment_status: status,
      };

      if (status === 'approved') {
        updateData.status = 'processing';
        updateData.paid_at = new Date().toISOString();

        // Reduce stock for each product
        const { data: orderItems } = await supabaseAdmin
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (orderItems) {
          for (const item of orderItems) {
            if (item.product_id) {
              // Get current stock
              const { data: product } = await supabaseAdmin
                .from('products')
                .select('stock')
                .eq('id', item.product_id)
                .single();

              if (product) {
                // Update stock
                await supabaseAdmin
                  .from('products')
                  .update({ stock: Math.max(0, product.stock - item.quantity) })
                  .eq('id', item.product_id);
              }
            }
          }

          // Send confirmation email
          await sendOrderConfirmationEmail(order, orderItems);
        }
      } else if (status === 'rejected' || status === 'cancelled') {
        updateData.status = 'cancelled';
      }

      // Update order
      await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// Handle GET requests (MercadoPago sends GET to verify webhook)
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
