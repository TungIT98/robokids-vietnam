-- RoboKids Vietnam Platform Database Schema
-- Migration 016: School Partnership Billing Module
-- Supports subscription plans, invoices, and billing for school partnerships

-- Subscription Plans table
CREATE TABLE public.subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., 'Basic', 'Standard', 'Premium'
  plan_code TEXT UNIQUE NOT NULL, -- e.g., 'basic', 'standard', 'premium'
  description TEXT,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  base_price_cents INTEGER NOT NULL, -- Base price per billing cycle (in VND cents)
  price_per_student_cents INTEGER NOT NULL, -- Per-student additional cost (in VND cents)
  max_students INTEGER DEFAULT NULL, -- NULL = unlimited
  max_teachers INTEGER DEFAULT NULL, -- NULL = unlimited
  features JSONB DEFAULT '[]', -- Array of feature strings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- School Subscriptions table (links schools to plans with billing info)
CREATE TABLE public.school_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'expired')),
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- School Invoices table
CREATE TABLE public.school_invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL, -- Human-readable invoice number e.g., 'INV-2025-001'
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.school_subscriptions(id) ON DELETE SET NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  student_count INTEGER NOT NULL, -- Number of students at time of invoice
  plan_code TEXT NOT NULL, -- Snapshot of plan code at time of invoice
  base_amount_cents INTEGER NOT NULL, -- Base amount (in VND cents)
  per_student_amount_cents INTEGER NOT NULL, -- Per-student amount (in VND cents)
  student_charges_cents INTEGER NOT NULL, -- student_count * per_student_amount_cents
  total_amount_cents INTEGER NOT NULL, -- Total invoice amount
  amount_paid_cents INTEGER DEFAULT 0, -- Amount actually paid
  currency TEXT DEFAULT 'VND',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'bank_transfer', 'zalopay', 'vnpay', 'cash', 'other'
  payment_reference TEXT, -- Transaction reference from payment provider
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Line Items table (detailed breakdown)
CREATE TABLE public.invoice_line_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES public.school_invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price_cents INTEGER NOT NULL, -- Price per unit in VND cents
  total_price_cents INTEGER NOT NULL, -- quantity * unit_price_cents
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-renewal Notifications log
CREATE TABLE public.renewal_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.school_invoices(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('renewal_reminder_30d', 'renewal_reminder_7d', 'renewal_reminder_1d', 'renewal_expired', 'payment_reminder')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'cancelled')),
  delivery_method TEXT DEFAULT 'email', -- 'email', 'sms', 'push'
  recipient_email TEXT,
  recipient_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read for all authenticated)
CREATE POLICY "Authenticated users can view subscription plans" ON public.subscription_plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage subscription plans" ON public.subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for school_subscriptions
CREATE POLICY "School admins can view own subscription" ON public.school_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_admins
      WHERE school_admins.school_id = school_subscriptions.school_id
      AND school_admins.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      JOIN public.schools s ON s.id = st.school_id
      WHERE st.school_id = school_subscriptions.school_id
      AND st.teacher_id = auth.uid()
      AND st.role IN ('head_teacher', 'coordinator')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage school_subscriptions" ON public.school_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for school_invoices
CREATE POLICY "School admins can view own invoices" ON public.school_invoices
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM public.school_admins
      WHERE school_admins.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.school_teachers st
      JOIN public.schools s ON s.id = st.school_id
      WHERE st.school_id = school_invoices.school_id
      AND st.teacher_id = auth.uid()
      AND st.role IN ('head_teacher', 'coordinator')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage school_invoices" ON public.school_invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for invoice_line_items
CREATE POLICY "School admins can view own invoice line items" ON public.invoice_line_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM public.school_invoices
      WHERE school_id IN (
        SELECT school_id FROM public.school_admins
        WHERE school_admins.profile_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage invoice_line_items" ON public.invoice_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for renewal_notifications
CREATE POLICY "School admins can view own renewal notifications" ON public.renewal_notifications
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM public.school_admins
      WHERE school_admins.profile_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage renewal_notifications" ON public.renewal_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_subscription_plans_code ON public.subscription_plans(plan_code);
CREATE INDEX idx_subscription_plans_active ON public.subscription_plans(is_active);
CREATE INDEX idx_school_subscriptions_school_id ON public.school_subscriptions(school_id);
CREATE INDEX idx_school_subscriptions_status ON public.school_subscriptions(status);
CREATE INDEX idx_school_subscriptions_period ON public.school_subscriptions(current_period_start, current_period_end);
CREATE INDEX idx_school_invoices_school_id ON public.school_invoices(school_id);
CREATE INDEX idx_school_invoices_status ON public.school_invoices(status);
CREATE INDEX idx_school_invoices_due_date ON public.school_invoices(due_date);
CREATE INDEX idx_school_invoices_number ON public.school_invoices(invoice_number);
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_renewal_notifications_school_id ON public.renewal_notifications(school_id);
CREATE INDEX idx_renewal_notifications_scheduled ON public.renewal_notifications(scheduled_for);
CREATE INDEX idx_renewal_notifications_status ON public.renewal_notifications(delivery_status);

-- Triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_school_subscriptions_updated_at
  BEFORE UPDATE ON public.school_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_school_invoices_updated_at
  BEFORE UPDATE ON public.school_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_text TEXT;
  seq_num INTEGER;
  invoice_number TEXT;
BEGIN
  year_text := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || year_text || '-(\d+)') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM public.school_invoices
  WHERE invoice_number LIKE 'INV-' || year_text || '-%';

  invoice_number := 'INV-' || year_text || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate school subscription cost
CREATE OR REPLACE FUNCTION public.calculate_subscription_cost(
  p_plan_id UUID,
  p_student_count INTEGER,
  p_billing_cycle TEXT
)
RETURNS TABLE(
  base_amount_cents INTEGER,
  per_student_cents INTEGER,
  student_charges_cents INTEGER,
  total_cents INTEGER
) AS $$
DECLARE
  v_plan RECORD;
BEGIN
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate based on billing cycle
  IF p_billing_cycle = 'annual' THEN
    -- Annual billing gets 2 months free (10 months instead of 12)
    base_amount_cents := v_plan.base_price_cents * 10;
    per_student_cents := v_plan.price_per_student_cents * 10;
  ELSE
    base_amount_cents := v_plan.base_price_cents;
    per_student_cents := v_plan.price_per_student_cents;
  END IF;

  student_charges_cents := p_student_count * per_student_cents;
  total_cents := base_amount_cents + student_charges_cents;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Seed default subscription plans
INSERT INTO public.subscription_plans (name, plan_code, description, billing_cycle, base_price_cents, price_per_student_cents, max_students, max_teachers, features) VALUES
('Basic', 'basic', 'Essential robotics education for schools', 'monthly', 2990000, 99000, 100, 20, '["Core curriculum access", "Basic analytics", "Email support"]'),
('Basic Annual', 'basic_annual', 'Essential robotics education - annual billing', 'annual', 29900000, 990000, 100, 20, '["Core curriculum access", "Basic analytics", "Email support", "2 months free"]'),
('Standard', 'standard', 'Enhanced robotics program with advanced features', 'monthly', 4990000, 149000, 500, 50, '["Full curriculum access", "Advanced analytics", "Teacher training", "Priority support"]'),
('Standard Annual', 'standard_annual', 'Enhanced program - annual billing', 'annual', 49900000, 1490000, 500, 50, '["Full curriculum access", "Advanced analytics", "Teacher training", "Priority support", "2 months free"]'),
('Premium', 'premium', 'Complete robotics education solution', 'monthly', 7990000, 199000, NULL, NULL, '["Unlimited everything", "Custom curriculum", "On-site training", "Dedicated account manager", "Competition support"]'),
('Premium Annual', 'premium_annual', 'Complete solution - annual billing', 'annual', 79900000, 1990000, NULL, NULL, '["Unlimited everything", "Custom curriculum", "On-site training", "Dedicated account manager", "Competition support", "2 months free"]');
