-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create enum for pricing tiers
CREATE TYPE public.pricing_tier AS ENUM ('starter', 'growth', 'pro');

-- Create orders table to track all customer orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  city TEXT NOT NULL,
  tier public.pricing_tier NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  leads_count INTEGER,
  sheet_url TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create leads table to store scraped lead data
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  seller_name TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  price TEXT,
  contact TEXT,
  url TEXT,
  source TEXT NOT NULL,
  date_listed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_leads_order_id ON public.leads(order_id);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders - customers can only view their own orders
CREATE POLICY "Customers can view their own orders"
  ON public.orders
  FOR SELECT
  USING (customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- RLS Policies for leads - customers can only view leads for their orders
CREATE POLICY "Customers can view their own leads"
  ON public.leads
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();