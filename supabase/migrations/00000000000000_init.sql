-- Enable RLS (Row Level Security)
-- ALTER DATABASE postgres SET "app.settings.jwt_secret" TO 'your-super-secret-jwt-token-with-at-least-32-characters-long';

-- Create necessary schema extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  brand TEXT,
  images TEXT[] NOT NULL,
  thumbnail_image TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL,
  features TEXT[],
  specifications JSONB,
  is_digital BOOLEAN NOT NULL,
  is_new BOOLEAN,
  is_featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  estimated_time TEXT NOT NULL,
  category TEXT NOT NULL,
  image TEXT,
  is_available BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  permissions JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id),
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2),
  total DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  shipping_address_id UUID REFERENCES addresses(id),
  shipping_method TEXT,
  shipping_cost DECIMAL(10, 2),
  notes TEXT,
  is_online BOOLEAN NOT NULL,
  employee_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  is_digital BOOLEAN NOT NULL
);

-- Service bookings table
CREATE TABLE IF NOT EXISTS service_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  service_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  status TEXT NOT NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  description TEXT,
  employee_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  approved_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_order_id ON service_bookings(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);

-- Row Level Security (RLS) policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Products: everyone can view, only authenticated users with proper permissions can modify
CREATE POLICY "Allow select for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Allow insert for admin users" ON products FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow update for admin users" ON products FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow delete for admin users" ON products FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- Services: everyone can view, only authenticated users with proper permissions can modify
CREATE POLICY "Allow select for all users" ON services FOR SELECT USING (true);
CREATE POLICY "Allow insert for admin users" ON services FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow update for admin users" ON services FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow delete for admin users" ON services FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- Users: can view and modify their own data, admins can view and modify all
CREATE POLICY "Allow select own user data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow admin select all users" ON users FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow admin insert users" ON users FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow update own user data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin update all users" ON users FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow admin delete users" ON users FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- Addresses: users can view and modify their own addresses, admins can view all
CREATE POLICY "Allow select own addresses" ON addresses FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Allow admin select all addresses" ON addresses FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow insert own addresses" ON addresses FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Allow update own addresses" ON addresses FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Allow delete own addresses" ON addresses FOR DELETE USING (auth.uid()::text = user_id::text);

-- Orders: users can view their own orders, staff can view and modify all
CREATE POLICY "Allow select own orders" ON orders FOR SELECT USING (auth.uid()::text = customer_id::text);
CREATE POLICY "Allow admin and employee select all orders" ON orders FOR SELECT USING ((auth.jwt() ->> 'role') IN ('admin', 'employee'));
CREATE POLICY "Allow insert orders" ON orders FOR INSERT WITH CHECK (auth.uid()::text = customer_id::text OR (auth.jwt() ->> 'role') IN ('admin', 'employee'));
CREATE POLICY "Allow admin and employee update orders" ON orders FOR UPDATE USING ((auth.jwt() ->> 'role') IN ('admin', 'employee'));
CREATE POLICY "Allow admin delete orders" ON orders FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

-- Order items: policy follows orders
CREATE POLICY "Allow select own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id::text = auth.uid()::text)
);
CREATE POLICY "Allow admin and employee select all order items" ON order_items FOR SELECT USING ((auth.jwt() ->> 'role') IN ('admin', 'employee'));

-- Service bookings: policy follows orders
CREATE POLICY "Allow select own service bookings" ON service_bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = service_bookings.order_id AND orders.customer_id::text = auth.uid()::text)
);
CREATE POLICY "Allow admin and employee select all service bookings" ON service_bookings FOR SELECT USING ((auth.jwt() ->> 'role') IN ('admin', 'employee'));

-- Transactions: only staff can view and modify
CREATE POLICY "Allow admin and employee select all transactions" ON transactions FOR SELECT USING ((auth.jwt() ->> 'role') IN ('admin', 'employee'));
CREATE POLICY "Allow admin and employee insert transactions" ON transactions FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') IN ('admin', 'employee'));

-- Expenses: only staff can view and modify
CREATE POLICY "Allow admin select all expenses" ON expenses FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow admin insert expenses" ON expenses FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow admin update expenses" ON expenses FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "Allow admin delete expenses" ON expenses FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin'); 