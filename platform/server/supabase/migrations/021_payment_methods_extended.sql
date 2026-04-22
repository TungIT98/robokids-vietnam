-- Migration 021: Add MoMo and Stripe payment methods
-- Extends payment_method and payment_provider to include 'momo' and 'stripe'

-- Drop existing constraints
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_provider_check;

-- Add new payment methods
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('zalopay', 'vnpay', 'momo', 'stripe', 'bank_transfer', 'cash'));

ALTER TABLE payments ADD CONSTRAINT payments_payment_provider_check
  CHECK (payment_provider IN ('zalopay', 'vnpay', 'momo', 'stripe', 'manual'));

-- Add new columns for Stripe and MoMo specific fields if needed
-- These can be stored in metadata JSONB for flexibility
-- Stripe: stripe_payment_intent_id, stripe_session_id
-- MoMo: momo_request_id, momo_order_id

COMMENT ON COLUMN payments.payment_provider IS 'Payment provider: zalopay, vnpay, momo, stripe, manual';
COMMENT ON COLUMN payments.payment_method IS 'Payment method: zalopay, vnpay, momo, stripe, bank_transfer, cash';