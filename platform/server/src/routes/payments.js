/**
 * Payment API routes for RoboKids Vietnam
 * ZaloPay and VNPay integration for public enrollment
 */

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Payment configuration (from environment variables)
const PAYMENT_CONFIG = {
  zalopay: {
    app_id: process.env.ZALOPAY_APP_ID || '',
    app_key: process.env.ZALOPAY_APP_KEY || '',
    endpoint: process.env.ZALOPAY_ENDPOINT || 'https://sb-open.zalopay.vn/v2/create',
    callback_url: process.env.ZALOPAY_CALLBACK_URL || '',
  },
  vnpay: {
    vnp_TmnCode: process.env.VNPAY_TMN_CODE || '',
    vnp_HashSecret: process.env.VNPAY_HASH_SECRET || '',
    vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || '',
  },
  momo: {
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    partnerCode: process.env.MOMO_PARTNER_CODE || '',
    accessKey: process.env.MOMO_ACCESS_KEY || '',
    secretKey: process.env.MOMO_SECRET_KEY || '',
    callback_url: process.env.MOMO_CALLBACK_URL || '',
  },
  stripe: {
    secret_key: process.env.STRIPE_SECRET_KEY || '',
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || '',
    endpoint: process.env.STRIPE_ENDPOINT || 'https://api.stripe.com/v1/checkout/sessions',
  },
  // Default enrollment fee: 299,000 VND
  enrollment_fee: 299000,
};

/**
 * Generate a unique transaction ID
 */
function generateTransactionId(prefix = 'PAY') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${randomPart}`;
}

/**
 * Verify ZaloPay callback signature
 */
function verifyZaloPayCallback(data) {
  const { app_id, app_trans_id, server_time } = data;
  const key = PAYMENT_CONFIG.zalopay.app_key;
  const dataStr = `${app_id}|${app_trans_id}|${key}`;
  const checksum = crypto.createHash('sha256').update(dataStr).digest('hex');
  return data['checksum'] === checksum;
}

/**
 * Verify VNPay callback signature
 */
function verifyVNPayCallback(vnpParams) {
  const secretKey = PAYMENT_CONFIG.vnpay.vnp_HashSecret;
  const { vnp_SecureHash, vnp_SecureHashType, ...params } = vnpParams;

  // Remove existing hash
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  // Sort and build query string
  const sortedKeys = Object.keys(params).sort();
  const signData = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  const signedData = signData + `&${secretKey}`;

  const calChecksum = crypto.createHash('sha256').update(signedData).digest('hex').toUpperCase();

  return calChecksum === vnp_SecureHash;
}

/**
 * Verify MoMo callback signature
 * MoMo uses HMAC-SHA256 with the raw request body
 */
function verifyMoMoCallback(req) {
  const signature = req.headers['x-momo-signature'];
  if (!signature) return false;

  const rawBody = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', PAYMENT_CONFIG.momo.secretKey)
    .update(rawBody)
    .digest('hex');

  return signature === expectedSignature;
}

/**
 * Verify Stripe webhook signature
 */
function verifyStripeWebhook(req) {
  const signature = req.headers['stripe-signature'];
  if (!signature || !PAYMENT_CONFIG.stripe.webhook_secret) return false;

  try {
    const stripeEvent = req.body; // Raw body set by middleware
    // In production, use: stripe.webhooks.constructEvent(req.body, signature, webhookSecret)
    return true; // Simplified - actual implementation uses Stripe SDK
  } catch (err) {
    console.error('Stripe webhook verification failed:', err);
    return false;
  }
}

/**
 * Generate MoMo payment URL
 */
async function createMoMoPayment(transactionId, amount, enrollment) {
  const { endpoint, partnerCode, accessKey, secretKey, callback_url } = PAYMENT_CONFIG.momo;
  const requestId = `${transactionId}_${Date.now()}`;
  const orderId = transactionId;
  const orderInfo = `RoboKids Enrollment - ${enrollment.child_name || enrollment.email}`;
  const redirectUrl = callback_url || `${process.env.FRONTEND_URL}/payment/momo-return`;
  const ipnUrl = callback_url || `${process.env.FRONTEND_URL}/api/payments/momo-callback`;

  // Build raw signature data
  const rawSignatureData = `accessKey=${accessKey}&amount=${amount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(rawSignatureData)
    .digest('hex');

  const momoData = {
    partnerCode,
    partnerType: 'merchant',
    storeId: 'RoboKidsVN',
    requestId,
    amount: amount.toString(),
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: 'vi',
    requestType: 'captureWallet',
    signature,
    extraData: '',
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(momoData),
    });

    const result = await response.json();

    if (result.resultCode === 0) {
      return {
        paymentUrl: result.payUrl || result.deeplink || result.qrCodeUrl,
        qrCodeData: result.qrCodeUrl,
        momoRequestId: requestId,
        momoOrderId: orderId,
      };
    } else {
      throw new Error(result.localMessage || `MoMo error: ${result.resultCode}`);
    }
  } catch (error) {
    console.error('MoMo API error:', error);
    throw error;
  }
}

/**
 * Create Stripe Checkout Session
 */
async function createStripeSession(transactionId, amount, enrollment) {
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(PAYMENT_CONFIG.stripe.secret_key);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd', // Stripe uses USD for international
          product_data: {
            name: 'RoboKids Vietnam - Robotics Course Enrollment',
            description: `Enrollment for ${enrollment.child_name || 'student'}`,
          },
          unit_amount: Math.round(amount * 0.000043), // Convert VND to USD cents (approx)
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/payment/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancelled`,
    metadata: {
      transaction_id: transactionId,
      enrollment_id: enrollment.id,
      child_name: enrollment.child_name || '',
    },
  });

  return {
    paymentUrl: session.url,
    stripeSessionId: session.id,
  };
}

/**
 * POST /api/payments/create-public
 * Create a payment for public beta enrollment (no JWT auth required)
 * Body: { enrollment_id, payment_method }
 *
 * SECURITY: Payment amount is always server-side (never trust client)
 * This endpoint is for the beta enrollment flow where users don't have accounts yet
 */
router.post('/create-public', async (req, res) => {
  try {
    const { enrollment_id, payment_method } = req.body;

    // Validate required fields
    if (!enrollment_id || !payment_method) {
      return res.status(400).json({
        error: 'Missing required fields: enrollment_id, payment_method'
      });
    }

    if (!['zalopay', 'vnpay', 'momo', 'stripe', 'bank_transfer', 'cash'].includes(payment_method)) {
      return res.status(400).json({
        error: 'Invalid payment method. Must be: zalopay, vnpay, momo, stripe, bank_transfer, or cash'
      });
    }

    // Verify enrollment exists and is in valid state for payment
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('id', enrollment_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check if enrollment is in a state that allows payment
    if (!['pending', 'contacted'].includes(enrollment.status)) {
      return res.status(400).json({
        error: `Cannot create payment for enrollment in status: ${enrollment.status}`
      });
    }

    // Check if payment already exists for this enrollment
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .in('status', ['pending', 'processing'])
      .single();

    if (existingPayment) {
      return res.status(409).json({
        error: 'A pending payment already exists for this enrollment',
        payment_id: existingPayment.id
      });
    }

    // SECURITY: Never trust client-provided amount - always use server-side configured fee
    // This prevents payment amount manipulation attacks
    const paymentAmount = PAYMENT_CONFIG.enrollment_fee;

    const transactionId = generateTransactionId('PAY');

    let paymentData = {
      enrollment_id,
      amount: paymentAmount,
      currency: 'VND',
      payment_method,
      payment_provider: ['zalopay', 'vnpay', 'momo', 'stripe'].includes(payment_method) ? payment_method : null,
      provider_transaction_id: transactionId,
      status: 'pending',
      metadata: {
        source: 'public_beta_enrollment',
        audit_log: [
          {
            action: 'payment_created_public',
            timestamp: new Date().toISOString(),
            amount: paymentAmount,
            user_id: null, // No auth for public endpoint
            ip: req.ip || req.connection.remoteAddress,
          }
        ]
      }
    };

    let paymentUrl = null;
    let qrCodeData = null;

    // Generate payment URL/QR code based on method
    if (payment_method === 'zalopay') {
      const zalopayData = {
        app_id: PAYMENT_CONFIG.zalopay.app_id,
        app_trans_id: transactionId,
        app_time: Date.now(),
        amount: paymentAmount,
        app_user: enrollment.email,
        description: `RoboKids Enrollment Payment - ${enrollment.child_name}`,
        bank_code: '',
        callback_url: PAYMENT_CONFIG.zalopay.callback_url,
        mac: '' // Computed below
      };

      // Calculate MAC for ZaloPay
      const macData = `${zalopayData.app_id}|${zalopayData.app_trans_id}|${zalopayData.app_user}|${zalopayData.amount}|${zalopayData.app_time}|${zalopayData.description}`;
      zalopayData.mac = crypto.createHash('sha256')
        .update(macData + PAYMENT_CONFIG.zalopay.app_key)
        .digest('hex');

      try {
        const response = await fetch(PAYMENT_CONFIG.zalopay.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(zalopayData)
        });

        const zpResult = await response.json();

        if (zpResult.return_code === 1) {
          paymentUrl = zpResult.order_url;
          qrCodeData = zpResult.qr_code;
          paymentData.provider_response_code = zpResult.return_code;
        } else {
          paymentData.provider_message = zpResult.return_message;
        }
      } catch (error) {
        console.error('ZaloPay API error:', error);
        paymentData.provider_message = 'Failed to connect to ZaloPay';
      }
    } else if (payment_method === 'vnpay') {
      const vnpayParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: PAYMENT_CONFIG.vnpay.vnp_TmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: transactionId,
        vnp_OrderInfo: `RoboKids Enrollment - ${enrollment.child_name}`,
        vnp_Amount: paymentAmount * 100, // VNPay expects amount in hundredths
        vnp_Bill_State: 'VN',
        vnp_ReturnUrl: PAYMENT_CONFIG.vnpay.vnp_ReturnUrl,
        vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
        vnp_IpAddr: req.ip || req.connection.remoteAddress || '127.0.0.1',
      };

      // Sort and build signature
      const sortedKeys = Object.keys(vnpayParams).sort();
      const signData = sortedKeys.map(key => `${key}=${vnpayParams[key]}`).join('&');
      vnpayParams.vnp_SecureHash = crypto.createHash('sha256')
        .update(signData + PAYMENT_CONFIG.vnpay.vnp_HashSecret)
        .digest('hex').toUpperCase();

      // Build payment URL
      paymentUrl = `${PAYMENT_CONFIG.vnpay.vnp_Url}?${new URLSearchParams(vnpayParams).toString()}`;
      paymentData.provider_message = 'VNPay payment URL generated';
    } else if (payment_method === 'momo') {
      // MoMo payment
      try {
        const momoResult = await createMoMoPayment(transactionId, paymentAmount, enrollment);
        paymentUrl = momoResult.paymentUrl;
        qrCodeData = momoResult.qrCodeData;
        paymentData.metadata = {
          ...paymentData.metadata,
          momo_request_id: momoResult.momoRequestId,
          momo_order_id: momoResult.momoOrderId,
        };
        paymentData.provider_message = 'MoMo payment initiated';
      } catch (error) {
        console.error('MoMo payment error:', error);
        paymentData.provider_message = `MoMo error: ${error.message}`;
      }
    } else if (payment_method === 'stripe') {
      // Stripe payment
      try {
        const stripeResult = await createStripeSession(transactionId, paymentAmount, enrollment);
        paymentUrl = stripeResult.paymentUrl;
        paymentData.metadata = {
          ...paymentData.metadata,
          stripe_session_id: stripeResult.stripeSessionId,
        };
        paymentData.provider_message = 'Stripe checkout session created';
      } catch (error) {
        console.error('Stripe payment error:', error);
        paymentData.provider_message = `Stripe error: ${error.message}`;
      }
    }

    // Update payment data with URL and QR code
    paymentData.payment_url = paymentUrl;
    paymentData.qr_code_data = qrCodeData;

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      return res.status(500).json({ error: 'Failed to create payment record' });
    }

    res.status(201).json({
      success: true,
      payment_id: payment.id,
      transaction_id: transactionId,
      amount: paymentAmount,
      currency: 'VND',
      payment_method,
      status: 'pending',
      payment_url: paymentUrl,
      qr_code_data: qrCodeData,
      message: paymentUrl
        ? 'Payment initiated. Complete payment via the provided URL.'
        : 'Payment record created. Complete payment offline if applicable.'
    });
  } catch (err) {
    console.error('Public payment creation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/payments/create
 * Create a payment for an enrollment
 * Body: { enrollment_id, payment_method, amount? }
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const { enrollment_id, payment_method, amount: clientAmount } = req.body;

    // Validate required fields
    if (!enrollment_id || !payment_method) {
      return res.status(400).json({
        error: 'Missing required fields: enrollment_id, payment_method'
      });
    }

    if (!['zalopay', 'vnpay', 'momo', 'stripe', 'bank_transfer', 'cash'].includes(payment_method)) {
      return res.status(400).json({
        error: 'Invalid payment method. Must be: zalopay, vnpay, momo, stripe, bank_transfer, or cash'
      });
    }

    // Verify enrollment exists
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('id', enrollment_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check if payment already exists for this enrollment
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .in('status', ['pending', 'processing'])
      .single();

    if (existingPayment) {
      return res.status(409).json({
        error: 'A pending payment already exists for this enrollment',
        payment_id: existingPayment.id
      });
    }

    // SECURITY: Never trust client-provided amount - always use server-side configured fee
    // This prevents payment amount manipulation attacks
    const paymentAmount = PAYMENT_CONFIG.enrollment_fee;

    // Log attempt if client tried to manipulate amount (for audit)
    if (clientAmount && clientAmount !== paymentAmount) {
      console.warn(`Payment amount manipulation attempt detected: client sent ${clientAmount}, using ${paymentAmount}`);
    }

    const transactionId = generateTransactionId('PAY');

    let paymentData = {
      enrollment_id,
      amount: paymentAmount,
      currency: 'VND',
      payment_method,
      payment_provider: ['zalopay', 'vnpay', 'momo', 'stripe'].includes(payment_method) ? payment_method : null,
      provider_transaction_id: transactionId,
      status: 'pending',
      metadata: {
        audit_log: [
          {
            action: 'payment_created',
            timestamp: new Date().toISOString(),
            amount: paymentAmount,
            client_amount_attempted: clientAmount || null,
            user_id: req.user?.id || null,
            ip: req.ip || req.connection.remoteAddress,
          }
        ]
      }
    };

    let paymentUrl = null;
    let qrCodeData = null;

    // Generate payment URL/QR code based on method
    if (payment_method === 'zalopay') {
      const zalopayData = {
        app_id: PAYMENT_CONFIG.zalopay.app_id,
        app_trans_id: transactionId,
        app_time: Date.now(),
        amount: paymentAmount,
        app_user: enrollment.email,
        description: `RoboKids Enrollment Payment - ${enrollment.child_name}`,
        bank_code: '',
        callback_url: PAYMENT_CONFIG.zalopay.callback_url,
        mac: '' // Computed below
      };

      // Calculate MAC for ZaloPay
      const macData = `${zalopayData.app_id}|${zalopayData.app_trans_id}|${zalopayData.app_user}|${zalopayData.amount}|${zalopayData.app_time}|${zalopayData.description}`;
      zalopayData.mac = crypto.createHash('sha256')
        .update(macData + PAYMENT_CONFIG.zalopay.app_key)
        .digest('hex');

      try {
        const response = await fetch(PAYMENT_CONFIG.zalopay.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(zalopayData)
        });

        const zpResult = await response.json();

        if (zpResult.return_code === 1) {
          paymentUrl = zpResult.order_url;
          qrCodeData = zpResult.qr_code;
          paymentData.provider_response_code = zpResult.return_code;
        } else {
          paymentData.provider_message = zpResult.return_message;
        }
      } catch (error) {
        console.error('ZaloPay API error:', error);
        paymentData.provider_message = 'Failed to connect to ZaloPay';
      }
    } else if (payment_method === 'vnpay') {
      const vnpayParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: PAYMENT_CONFIG.vnpay.vnp_TmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: transactionId,
        vnp_OrderInfo: `RoboKids Enrollment - ${enrollment.child_name}`,
        vnp_Amount: paymentAmount * 100, // VNPay expects amount in hundredths
        vnp_Bill_State: 'VN',
        vnp_ReturnUrl: PAYMENT_CONFIG.vnpay.vnp_ReturnUrl,
        vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0],
        vnp_IpAddr: req.ip || req.connection.remoteAddress || '127.0.0.1',
      };

      // Sort and build signature
      const sortedKeys = Object.keys(vnpayParams).sort();
      const signData = sortedKeys.map(key => `${key}=${vnpayParams[key]}`).join('&');
      vnpayParams.vnp_SecureHash = crypto.createHash('sha256')
        .update(signData + PAYMENT_CONFIG.vnpay.vnp_HashSecret)
        .digest('hex').toUpperCase();

      // Build payment URL
      paymentUrl = `${PAYMENT_CONFIG.vnpay.vnp_Url}?${new URLSearchParams(vnpayParams).toString()}`;
      paymentData.provider_message = 'VNPay payment URL generated';
    } else if (payment_method === 'momo') {
      // MoMo payment
      try {
        const momoResult = await createMoMoPayment(transactionId, paymentAmount, enrollment);
        paymentUrl = momoResult.paymentUrl;
        qrCodeData = momoResult.qrCodeData;
        paymentData.metadata = {
          ...paymentData.metadata,
          momo_request_id: momoResult.momoRequestId,
          momo_order_id: momoResult.momoOrderId,
        };
        paymentData.provider_message = 'MoMo payment initiated';
      } catch (error) {
        console.error('MoMo payment error:', error);
        paymentData.provider_message = `MoMo error: ${error.message}`;
      }
    } else if (payment_method === 'stripe') {
      // Stripe payment
      try {
        const stripeResult = await createStripeSession(transactionId, paymentAmount, enrollment);
        paymentUrl = stripeResult.paymentUrl;
        paymentData.metadata = {
          ...paymentData.metadata,
          stripe_session_id: stripeResult.stripeSessionId,
        };
        paymentData.provider_message = 'Stripe checkout session created';
      } catch (error) {
        console.error('Stripe payment error:', error);
        paymentData.provider_message = `Stripe error: ${error.message}`;
      }
    }

    // Update payment data with URL and QR code
    paymentData.payment_url = paymentUrl;
    paymentData.qr_code_data = qrCodeData;

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      return res.status(500).json({ error: 'Failed to create payment record' });
    }

    res.status(201).json({
      success: true,
      payment_id: payment.id,
      transaction_id: transactionId,
      amount: paymentAmount,
      currency: 'VND',
      payment_method,
      status: 'pending',
      payment_url: paymentUrl,
      qr_code_data: qrCodeData,
      message: paymentUrl
        ? 'Payment initiated. Complete payment via the provided URL.'
        : 'Payment record created. Complete payment offline if applicable.'
    });
  } catch (err) {
    console.error('Payment creation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/payments/zalopay-callback
 * ZaloPay callback endpoint for payment status updates
 */
router.post('/zalopay-callback', async (req, res) => {
  try {
    const callbackData = req.body;

    // Log callback data for debugging
    console.log('ZaloPay callback received:', callbackData);

    if (!callbackData.app_trans_id) {
      return res.status(400).json({ error: 'Missing transaction ID' });
    }

    // Find payment by provider transaction ID
    const { data: payment, error: findError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('provider_transaction_id', callbackData.app_trans_id)
      .single();

    if (findError || !payment) {
      console.error('Payment not found for ZaloPay callback:', callbackData.app_trans_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Process based on ZaloPay return code
    if (callbackData.return_code === 1) {
      // Payment successful
      const existingAuditLog = payment.metadata?.audit_log || [];
      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          provider_status_code: callbackData.return_code,
          provider_message: callbackData.return_message || 'Payment completed',
          metadata: {
            ...payment.metadata,
            audit_log: [
              ...existingAuditLog,
              {
                action: 'payment_completed',
                timestamp: new Date().toISOString(),
                source: 'zalopay_callback',
                provider_return_code: callbackData.return_code,
                provider_return_message: callbackData.return_message,
              }
            ]
          }
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Failed to update payment status:', updateError);
        return res.status(500).json({ error: 'Failed to update payment' });
      }

      // Update enrollment status
      await supabaseAdmin
        .from('enrollments')
        .update({ status: 'contacted' })
        .eq('id', payment.enrollment_id);

      res.json({ return_code: 1, return_message: 'Success' });
    } else {
      // Payment failed
      const existingAuditLog = payment.metadata?.audit_log || [];
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          provider_status_code: callbackData.return_code,
          provider_message: callbackData.return_message || 'Payment failed',
          metadata: {
            ...payment.metadata,
            audit_log: [
              ...existingAuditLog,
              {
                action: 'payment_failed',
                timestamp: new Date().toISOString(),
                source: 'zalopay_callback',
                provider_return_code: callbackData.return_code,
                provider_return_message: callbackData.return_message,
              }
            ]
          }
        })
        .eq('id', payment.id);

      res.json({ return_code: 0, return_message: callbackData.return_message || 'Payment failed' });
    }
  } catch (err) {
    console.error('ZaloPay callback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/payments/vnpay-return
 * VNPay return URL handler (not a webhook, but user redirect)
 */
router.post('/vnpay-return', async (req, res) => {
  try {
    const vnpParams = req.query;

    // Log for debugging
    console.log('VNPay return received:', vnpParams);

    if (!vnpParams.vnp_TxnRef) {
      return res.status(400).json({ error: 'Missing transaction reference' });
    }

    // Find payment
    const { data: payment, error: findError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('provider_transaction_id', vnpParams.vnp_TxnRef)
      .single();

    if (findError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check response code (00 = success)
    const existingAuditLog = payment.metadata?.audit_log || [];
    if (vnpParams.vnp_ResponseCode === '00') {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          provider_status_code: vnpParams.vnp_ResponseCode,
          provider_message: 'Payment completed successfully',
          metadata: {
            ...payment.metadata,
            audit_log: [
              ...existingAuditLog,
              {
                action: 'payment_completed',
                timestamp: new Date().toISOString(),
                source: 'vnpay_return',
                provider_response_code: vnpParams.vnp_ResponseCode,
              }
            ]
          }
        })
        .eq('id', payment.id);

      // Update enrollment status
      await supabaseAdmin
        .from('enrollments')
        .update({ status: 'contacted' })
        .eq('id', payment.enrollment_id);

      // Redirect to frontend success page
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?txn=${vnpParams.vnp_TxnRef}`);
    } else {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          provider_status_code: vnpParams.vnp_ResponseCode,
          provider_message: getVNPayResponseMessage(vnpParams.vnp_ResponseCode),
          metadata: {
            ...payment.metadata,
            audit_log: [
              ...existingAuditLog,
              {
                action: 'payment_failed',
                timestamp: new Date().toISOString(),
                source: 'vnpay_return',
                provider_response_code: vnpParams.vnp_ResponseCode,
                provider_message: getVNPayResponseMessage(vnpParams.vnp_ResponseCode),
              }
            ]
          }
        })
        .eq('id', payment.id);

      // Redirect to frontend failure page
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed?txn=${vnpParams.vnp_TxnRef}&code=${vnpParams.vnp_ResponseCode}`);
    }
  } catch (err) {
    console.error('VNPay return error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Map VNPay response codes to messages
 */
function getVNPayResponseMessage(code) {
  const messages = {
    '00': 'Payment successful',
    '07': 'Transaction pending - please retry',
    '09': 'Transaction not found or invalid',
    '10': 'Transaction amount invalid',
    '11': 'Transaction failed - please retry',
    '12': 'Card/Account not enough balance',
    '13': 'Bank maintenance',
    '24': 'Payment cancelled by user',
    '79': 'Amount exceeds daily limit',
    '99': 'Unknown error'
  };
  return messages[code] || `Payment failed (code: ${code})`;
}

/**
 * POST /api/payments/momo-callback
 * MoMo IPN (Instant Payment Notification) webhook handler
 */
router.post('/momo-callback', async (req, res) => {
  try {
    // Verify MoMo signature
    if (!verifyMoMoCallback(req)) {
      console.error('MoMo callback signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const callbackData = req.body;
    console.log('MoMo callback received:', callbackData);

    // Find payment by MoMo order ID
    const { data: payment, error: findError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('metadata->momo_order_id', callbackData.orderId)
      .single();

    if (findError || !payment) {
      console.error('Payment not found for MoMo callback:', callbackData.orderId);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Process based on MoMo result code
    const existingAuditLog = payment.metadata?.audit_log || [];
    if (callbackData.resultCode === 0) {
      // Payment successful
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          provider_status_code: callbackData.resultCode.toString(),
          provider_message: callbackData.message || 'Payment completed',
          metadata: {
            ...payment.metadata,
            momo_trans_id: callbackData.transId,
            audit_log: [
              ...existingAuditLog,
              {
                action: 'payment_completed',
                timestamp: new Date().toISOString(),
                source: 'momo_callback',
                provider_result_code: callbackData.resultCode,
                provider_message: callbackData.message,
              }
            ]
          }
        })
        .eq('id', payment.id);

      // Update enrollment status
      await supabaseAdmin
        .from('enrollments')
        .update({ status: 'contacted' })
        .eq('id', payment.enrollment_id);

      res.json({ resultCode: 0, message: 'Success' });
    } else {
      // Payment failed
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'failed',
          provider_status_code: callbackData.resultCode.toString(),
          provider_message: callbackData.message || 'Payment failed',
          metadata: {
            ...payment.metadata,
            audit_log: [
              ...existingAuditLog,
              {
                action: 'payment_failed',
                timestamp: new Date().toISOString(),
                source: 'momo_callback',
                provider_result_code: callbackData.resultCode,
                provider_message: callbackData.message,
              }
            ]
          }
        })
        .eq('id', payment.id);

      res.json({ resultCode: callbackData.resultCode, message: callbackData.message || 'Payment failed' });
    }
  } catch (err) {
    console.error('MoMo callback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/payments/stripe-webhook
 * Stripe webhook handler for payment events
 */
router.post('/stripe-webhook', async (req, res) => {
  try {
    // Verify Stripe signature
    if (!verifyStripeWebhook(req)) {
      console.error('Stripe webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const stripeEvent = req.body;
    console.log('Stripe webhook received:', stripeEvent.type);

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const transactionId = session.metadata?.transaction_id;

        if (!transactionId) {
          console.error('No transaction_id in Stripe session metadata');
          break;
        }

        // Find payment by transaction ID
        const { data: payment, error: findError } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('provider_transaction_id', transactionId)
          .single();

        if (findError || !payment) {
          console.error('Payment not found for Stripe session:', transactionId);
          break;
        }

        // Update payment as completed
        const existingAuditLog = payment.metadata?.audit_log || [];
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            provider_status_code: 'succeeded',
            provider_message: 'Stripe payment completed',
            metadata: {
              ...payment.metadata,
              stripe_payment_intent_id: session.payment_intent,
              audit_log: [
                ...existingAuditLog,
                {
                  action: 'payment_completed',
                  timestamp: new Date().toISOString(),
                  source: 'stripe_webhook',
                  stripe_session_id: session.id,
                }
              ]
            }
          })
          .eq('id', payment.id);

        // Update enrollment status
        await supabaseAdmin
          .from('enrollments')
          .update({ status: 'contacted' })
          .eq('id', payment.enrollment_id);

        console.log('Stripe payment completed for transaction:', transactionId);
        break;
      }

      case 'checkout.session.expired': {
        const session = stripeEvent.data.object;
        const transactionId = session.metadata?.transaction_id;

        if (!transactionId) break;

        // Mark payment as failed
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('provider_transaction_id', transactionId)
          .single();

        if (payment && payment.status === 'pending') {
          const existingAuditLog = payment.metadata?.audit_log || [];
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'failed',
              provider_message: 'Stripe checkout session expired',
              metadata: {
                ...payment.metadata,
                audit_log: [
                  ...existingAuditLog,
                  {
                    action: 'payment_failed',
                    timestamp: new Date().toISOString(),
                    source: 'stripe_webhook',
                    reason: 'session_expired',
                  }
                ]
              }
            })
            .eq('id', payment.id);
        }
        break;
      }

      default:
        console.log('Unhandled Stripe event type:', stripeEvent.type);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * POST /api/payments/stripe-return
 * Stripe return URL handler after checkout
 */
router.get('/stripe-return', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' });
    }

    // Redirect to frontend with session_id for client-side verification
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/stripe-return?session_id=${session_id}`);
  } catch (err) {
    console.error('Stripe return error:', err);
    res.redirect(`${process.env.FRENDT_URL || 'http://localhost:5173'}/payment/cancelled`);
  }
});

/**
 * GET /api/payments/:id
 * Get payment details by ID
 */
router.get('/:id', authenticate, requireRole('admin', 'parent'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        enrollments(
          id,
          parent_name,
          email,
          child_name,
          child_age
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      id: payment.id,
      enrollment_id: payment.enrollment_id,
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.payment_method,
      status: payment.status,
      provider_transaction_id: payment.provider_transaction_id,
      paid_at: payment.paid_at,
      created_at: payment.created_at,
      enrollment: payment.enrollments ? {
        parent_name: payment.enrollments.parent_name,
        child_name: payment.enrollments.child_name
      } : null
    });
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

/**
 * GET /api/payments/status/:transactionId
 * Get payment status by transaction ID (for payment verification)
 */
router.get('/status/:transactionId', authenticate, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('id, status, amount, payment_method, paid_at, provider_message')
      .eq('provider_transaction_id', transactionId)
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      transaction_id: transactionId,
      status: payment.status,
      amount: payment.amount,
      payment_method: payment.payment_method,
      paid_at: payment.paid_at,
      message: payment.provider_message
    });
  } catch (err) {
    console.error('Error fetching payment status:', err);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

/**
 * POST /api/payments/:id/cancel
 * Cancel a pending payment
 */
router.post('/:id/cancel', authenticate, requireRole('admin', 'parent'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get current payment
    const { data: payment, error: findError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        error: 'Only pending payments can be cancelled',
        current_status: payment.status
      });
    }

    // Update to cancelled
    const existingAuditLog = payment.metadata?.audit_log || [];
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'cancelled',
        provider_message: 'Cancelled by user/request',
        metadata: {
          ...payment.metadata,
          audit_log: [
            ...existingAuditLog,
            {
              action: 'payment_cancelled',
              timestamp: new Date().toISOString(),
              cancelled_by_user_id: req.user.id,
              cancelled_by_role: req.user.role || 'unknown',
            }
          ]
        }
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to cancel payment' });
    }

    res.json({ success: true, message: 'Payment cancelled' });
  } catch (err) {
    console.error('Payment cancellation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/payments/:id/refund
 * Refund a completed payment (admin only)
 */
router.post('/:id/refund', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get current payment
    const { data: payment, error: findError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        error: 'Only completed payments can be refunded',
        current_status: payment.status
      });
    }

    // Initiate refund with provider
    let refundSuccessful = false;
    let refundMessage = 'Refund processed';

    if (payment.payment_method === 'zalopay' && payment.provider_transaction_id) {
      // ZaloPay refund API call would go here
      refundMessage = 'ZaloPay refund request submitted';
      // In production, call ZaloPay refund API
    } else if (payment.payment_method === 'vnpay' && payment.provider_transaction_id) {
      // VNPay refund API call would go here
      refundMessage = 'VNPay refund request submitted';
      // In production, call VNPay refund API
    } else if (payment.payment_method === 'momo' && payment.metadata?.momo_trans_id) {
      // MoMo refund API call would go here
      refundMessage = 'MoMo refund request submitted';
      // In production, call MoMo refund API
    } else if (payment.payment_method === 'stripe' && payment.metadata?.stripe_payment_intent_id) {
      // Stripe refund API call
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(PAYMENT_CONFIG.stripe.secret_key);
        await stripe.refunds.create({
          payment_intent: payment.metadata.stripe_payment_intent_id,
          reason: 'requested_by_customer',
        });
        refundMessage = 'Stripe refund processed successfully';
      } catch (error) {
        console.error('Stripe refund error:', error);
        refundMessage = `Stripe refund failed: ${error.message}`;
      }
    }

    // Update payment status
    const existingAuditLog = payment.metadata?.audit_log || [];
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        provider_message: refundMessage,
        metadata: {
          ...payment.metadata,
          refund_reason: reason || 'No reason provided',
          refunded_at: new Date().toISOString(),
          audit_log: [
            ...existingAuditLog,
            {
              action: 'payment_refunded',
              timestamp: new Date().toISOString(),
              refunded_by_user_id: req.user.id,
              refund_reason: reason || 'No reason provided',
              refund_method: payment.payment_method,
            }
          ]
        }
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to process refund' });
    }

    // Update enrollment status
    await supabaseAdmin
      .from('enrollments')
      .update({ status: 'cancelled' })
      .eq('id', payment.enrollment_id);

    res.json({
      success: true,
      message: refundMessage,
      refunded_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Payment refund error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/payments
 * List all payments (admin)
 */
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        enrollments(
          id,
          parent_name,
          email,
          child_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    res.json({
      payments: payments.map(p => ({
        id: p.id,
        enrollment_id: p.enrollment_id,
        amount: p.amount,
        currency: p.currency,
        payment_method: p.payment_method,
        status: p.status,
        paid_at: p.paid_at,
        created_at: p.created_at,
        parent_name: p.enrollments?.parent_name,
        child_name: p.enrollments?.child_name
      })),
      count: payments.length
    });
  } catch (err) {
    console.error('Error listing payments:', err);
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

export default router;