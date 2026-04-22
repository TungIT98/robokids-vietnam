-- Migration 010: Payments table for ZaloPay/VNPay integration
-- Stores payment transactions for public enrollment system

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0), -- Amount in VND
  currency TEXT NOT NULL DEFAULT 'VND',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('zalopay', 'vnpay', 'bank_transfer', 'cash')),
  payment_provider TEXT CHECK (payment_provider IN ('zalopay', 'vnpay', 'manual')),
  provider_transaction_id TEXT,
  provider_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  provider_status_code TEXT,
  provider_response_code TEXT,
  provider_message TEXT,
  payment_url TEXT, -- For redirect-based payment (ZaloPay/VNPay QR codes)
  qr_code_data TEXT, -- Base64 encoded QR code image for scan payments
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_payments_enrollment_id ON payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON payments(provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at) WHERE paid_at IS NOT NULL;

-- RLS policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (for backend API)
CREATE POLICY "Service role can do everything on payments"
  ON payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own payments (via enrollment)
CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.id = payments.enrollment_id
      AND (e.email IN (SELECT email FROM profiles WHERE id = auth.uid()))
    )
  );

-- Allow anon to read payment status by provider transaction ID (for webhook verification)
CREATE POLICY "Anyone can read by provider transaction ID"
  ON payments FOR SELECT
  TO anon
  USING (provider_transaction_id IS NOT NULL);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enrollment status transition trigger
-- When a payment is completed, update enrollment status to 'contacted' if still 'pending'
CREATE OR REPLACE FUNCTION update_enrollment_on_payment_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE enrollments
    SET status = 'contacted', updated_at = now()
    WHERE id = NEW.enrollment_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_complete_enrollment_update
  AFTER UPDATE OF status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_on_payment_complete();