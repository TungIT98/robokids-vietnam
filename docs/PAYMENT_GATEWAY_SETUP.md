# RoboKids Vietnam - Payment Gateway Setup

## Overview

This document covers the payment gateway setup for RoboKids Vietnam platform. Target: **Payment gateway active by May 15, 2026**.

## Current Status

**Supported Payment Methods:**
- ✅ ZaloPay (integrated in `/api/payments` routes)
- ✅ VNPay (integrated in `/api/payments` routes)
- ✅ Bank transfer (manual confirmation)
- ✅ Cash (manual confirmation)
- ❌ Momo (not yet integrated - requires separate SDK)

## Integration Architecture

```
Frontend (React/Vite)
    ↓
Express Server (port 3200)
    ↓
├── ZaloPay API (sb-open.zalopay.vn - sandbox)
├── VNPay API (sandbox.vnpayment.vn - sandbox)
└── PocketBase/Supabase (payments table)
```

## Environment Variables Required

### ZaloPay Configuration

```env
ZALOPAY_APP_ID=your_zalopay_app_id
ZALOPAY_APP_KEY=your_zalopay_app_key
ZALOPAY_ENDPOINT=https://sb-open.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=https://your-domain.com/api/payments/zalopay-callback
```

**How to get ZaloPay credentials:**
1. Register at https://developer.zalopay.com/
2. Create application for Sandbox
3. Get `app_id` and `app_key` from dashboard
4. Configure callback URL

### VNPay Configuration

```env
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-domain.com/api/payments/vnpay-return
```

**How to get VNPay credentials:**
1. Register at https://vnpay.vn/
2. Apply for sandbox merchant account
3. Get `vnp_TmnCode` and `vnp_HashSecret` from merchant portal

## Testing with Sandbox

The current implementation uses ZaloPay sandbox (`sb-open.zalopay.vn`) and VNPay sandbox URLs. This allows testing without real money transactions.

### Testing Flow

1. Start the server: `npm run dev` (from `platform/server/`)
2. Create enrollment via frontend
3. Select payment method (ZaloPay or VNPay)
4. System generates test payment URL
5. Simulate callback to confirm payment

### Sandbox Test Accounts

**ZaloPay Sandbox:**
- Use test merchant credentials from ZaloPay developer portal
- Test transactions return simulated responses

**VNPay Sandbox:**
- Use test merchant credentials from VNPay portal
- Test card numbers available in VNPay documentation

## Production Deployment Checklist

Before going live with real payments:

- [ ] Move from sandbox to production URLs
- [ ] Get production ZaloPay merchant account
- [ ] Get production VNPay merchant account
- [ ] Configure production callback URLs (HTTPS required)
- [ ] Update environment variables with production credentials
- [ ] Test end-to-end payment flow with test cards
- [ ] Set up payment monitoring and alerts
- [ ] Configure refund procedures

## Momo Integration (Future)

Momo integration requires:
1. Momo Merchant API registration
2. MoMo SDK integration (available for Node.js)
3. Separate payment flow with QR codes

**Estimated effort:** 2-3 days for basic integration

## Payment Confirmation Flow

```
1. User selects payment method
2. Frontend calls POST /api/payments/create-public
3. Server creates payment record (status: pending)
4. Server generates payment URL/QR code
5. User completes payment on payment provider
6. Provider calls webhook (callback URL)
7. Server verifies signature and updates payment status
8. Server updates enrollment status
9. User redirected to success/failure page
```

## Security Measures

1. **Server-side amount:** Payment amount is always set server-side, never trust client
2. **Signature verification:** All callbacks verified with HMAC SHA256
3. **Audit logging:** All payment actions logged in metadata
4. **Idempotency:** Duplicate callback prevention via existing payment checks

## Troubleshooting

### ZaloPay Issues

**Problem:** `return_code` not 1
- Check app_id and app_key are correct
- Verify callback_url is accessible
- Check merchant has sufficient balance

**Problem:** Callback not received
- Verify callback URL is HTTPS (required for production)
- Check firewall allows incoming requests from ZaloPay IPs

### VNPay Issues

**Problem:** Signature verification failed
- Ensure hash secret is correct
- Verify sort order matches VNPay requirements
- Check timestamp format matches requirement

## Monitoring

Set up alerts for:
- Payment failures (high failure rate)
- Large transaction amounts
- Unusual callback patterns
- Refund requests

## Payment Status Flow

```
pending → processing → completed
    ↓          ↓
  cancelled   failed → refunded
```

---

**Last Updated:** 2026-04-15
**Status:** Requires ZaloPay/VNPay sandbox credentials to test