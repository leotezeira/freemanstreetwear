-- Freeman Streetwear E-commerce Database Schema
-- Supabase PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  category VARCHAR(100),
  size VARCHAR(50),
  color VARCHAR(50),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for active products
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_category ON products(category);

-- Customers Table (optional, can use auth.users for basic info)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  
  -- Shipping info
  shipping_address TEXT NOT NULL,
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100) DEFAULT 'Brasil',
  
  -- Order details
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Payment info
  payment_method VARCHAR(50) DEFAULT 'mercadopago',
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  payment_id VARCHAR(255), -- MercadoPago payment ID
  
  -- Order status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for orders
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order Items Table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  
  -- Snapshot of product info at time of order
  product_name VARCHAR(255) NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  product_image_url TEXT,
  
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for order items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- Admin Users Table (for admin panel access)
-- We'll use Supabase Auth, but this table tracks admin permissions
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Products: Public read access, admin write access
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone" 
  ON products FOR SELECT 
  USING (active = true);

CREATE POLICY "Products are insertable by admins" 
  ON products FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Products are updatable by admins" 
  ON products FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Products are deletable by admins" 
  ON products FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

-- Orders: Users can view their own orders, admins can view all
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" 
  ON orders FOR SELECT 
  USING (
    customer_email = auth.jwt()->>'email' 
    OR EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Orders can be created by anyone (for checkout)" 
  ON orders FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Orders are updatable by admins" 
  ON orders FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

-- Order Items: Follow order access rules
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items are viewable with their orders" 
  ON order_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND (
        orders.customer_email = auth.jwt()->>'email'
        OR EXISTS (
          SELECT 1 FROM admin_users 
          WHERE id = auth.uid() AND active = true
        )
      )
    )
  );

CREATE POLICY "Order items can be created during checkout" 
  ON order_items FOR INSERT 
  WITH CHECK (true);

-- Customers: Users can view/update their own data
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own data" 
  ON customers FOR SELECT 
  USING (
    email = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Customers can insert their own data" 
  ON customers FOR INSERT 
  WITH CHECK (email = auth.jwt()->>'email');

CREATE POLICY "Customers can update their own data" 
  ON customers FOR UPDATE 
  USING (email = auth.jwt()->>'email');

-- Admin Users: Only viewable by other admins
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users are viewable by admins" 
  ON admin_users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

-- Sample data for testing (optional)
-- INSERT INTO products (name, description, price, stock, category, size, color, image_url) VALUES
-- ('Camiseta Freeman Classic', 'Camiseta 100% algodão com logo Freeman', 89.90, 50, 'camisetas', 'M', 'Preto', 'https://placeholder.com/300'),
-- ('Moletom Freeman Street', 'Moletom com capuz e bolso canguru', 189.90, 30, 'moletons', 'G', 'Cinza', 'https://placeholder.com/300'),
-- ('Boné Freeman Snapback', 'Boné snapback com logo bordado', 69.90, 100, 'acessorios', 'Único', 'Preto', 'https://placeholder.com/300');

-- Note: To create an admin user, after they sign up through Supabase Auth:
-- INSERT INTO admin_users (id, email, full_name) VALUES ('user-uuid-from-auth-users', 'admin@example.com', 'Admin Name');
