/**
 * Billing API routes for RoboKids Vietnam School Partnership Portal
 * Handles subscription plans, invoices, PDF generation, and billing dashboard
 */

import express from 'express';
import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Role helper
function getUserRole(user) {
  return user.role || user.user_metadata?.role || 'student';
}

// ============================================
// SUBSCRIPTION PLANS
// ============================================

/**
 * GET /api/billing/plans
 * List all active subscription plans
 */
router.get('/plans', authenticate, async (req, res) => {
  try {
    const { billing_cycle } = req.query;

    let query = supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('base_price_cents', { ascending: true });

    if (billing_cycle) {
      query = query.eq('billing_cycle', billing_cycle);
    }

    const { data: plans, error } = await query;

    if (error) throw error;

    res.json({
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        planCode: plan.plan_code,
        description: plan.description,
        billingCycle: plan.billing_cycle,
        basePrice: plan.base_price_cents,
        pricePerStudent: plan.price_per_student_cents,
        maxStudents: plan.max_students,
        maxTeachers: plan.max_teachers,
        features: plan.features
      }))
    });
  } catch (error) {
    console.error('List plans error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/plans/:id
 * Get plan details by ID
 */
router.get('/plans/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: plan, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({
      id: plan.id,
      name: plan.name,
      planCode: plan.plan_code,
      description: plan.description,
      billingCycle: plan.billing_cycle,
      basePrice: plan.base_price_cents,
      pricePerStudent: plan.price_per_student_cents,
      maxStudents: plan.max_students,
      maxTeachers: plan.max_teachers,
      features: plan.features
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCHOOL SUBSCRIPTIONS
// ============================================

/**
 * GET /api/billing/schools/:schoolId/subscription
 * Get school's current subscription
 */
router.get('/schools/:schoolId/subscription', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    // Access check
    if (!['admin', 'robokids_staff'].includes(userRole)) {
      const { data: adminSchool } = await supabaseAdmin
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get school
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('school_subscriptions')
      .select('*, subscription_plans(*)')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .single();

    // Get current student count
    const { count: studentCount } = await supabaseAdmin
      .from('student_school_relations')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active');

    // Get recent invoices
    const { data: recentInvoices } = await supabaseAdmin
      .from('school_invoices')
      .select('id, invoice_number, total_amount_cents, status, due_date, paid_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      school: {
        id: school.id,
        name: school.name,
        code: school.code
      },
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.subscription_plans ? {
          id: subscription.subscription_plans.id,
          name: subscription.subscription_plans.name,
          planCode: subscription.subscription_plans.plan_code,
          billingCycle: subscription.subscription_plans.billing_cycle
        } : null,
        billingCycle: subscription.billing_cycle,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        autoRenew: subscription.auto_renew
      } : null,
      studentCount: studentCount || 0,
      recentInvoices: recentInvoices || []
    });
  } catch (error) {
    console.error('Get school subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INVOICES
// ============================================

/**
 * GET /api/billing/schools/:schoolId/invoices
 * List invoices for a school
 */
router.get('/schools/:schoolId/invoices', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;
    const { status, limit = 20, offset = 0 } = req.query;

    // Access check
    if (!['admin', 'robokids_staff'].includes(userRole)) {
      const { data: adminSchool } = await supabaseAdmin
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', schoolId)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    let query = supabaseAdmin
      .from('school_invoices')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error, count } = await query;

    if (error) throw error;

    res.json({
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        billingPeriodStart: inv.billing_period_start,
        billingPeriodEnd: inv.billing_period_end,
        studentCount: inv.student_count,
        planCode: inv.plan_code,
        baseAmount: inv.base_amount_cents,
        perStudentAmount: inv.per_student_amount_cents,
        studentCharges: inv.student_charges_cents,
        totalAmount: inv.total_amount_cents,
        amountPaid: inv.amount_paid_cents,
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.due_date,
        paidAt: inv.paid_at,
        createdAt: inv.created_at
      })),
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: count || 0
      }
    });
  } catch (error) {
    console.error('List school invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/billing/schools/:schoolId/invoices
 * Generate invoice for a school (admin only)
 */
router.post('/schools/:schoolId/invoices', authenticate, requireRole('admin', 'robokids_staff'), async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { billing_period_start, billing_period_end, student_count, notes } = req.body;

    // Get school
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('*, school_subscriptions(*, subscription_plans(*))')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get active subscription
    const subscription = school.school_subscriptions?.find(s => s.status === 'active');
    if (!subscription) {
      return res.status(400).json({ error: 'School has no active subscription' });
    }

    const plan = subscription.subscription_plans;
    if (!plan) {
      return res.status(400).json({ error: 'Subscription plan not found' });
    }

    // Calculate costs
    let baseAmount, perStudentAmount, totalCents;
    if (subscription.billing_cycle === 'annual') {
      baseAmount = plan.base_price_cents * 10;
      perStudentAmount = plan.price_per_student_cents * 10;
    } else {
      baseAmount = plan.base_price_cents;
      perStudentAmount = plan.price_per_student_cents;
    }
    const studentCharges = student_count * perStudentAmount;
    totalCents = baseAmount + studentCharges;

    // Generate invoice number
    const { data: invoiceNumber } = await supabaseAdmin
      .rpc('generate_invoice_number');

    // Due date is 15 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('school_invoices')
      .insert({
        invoice_number: invoiceNumber,
        school_id: schoolId,
        subscription_id: subscription.id,
        billing_period_start: billing_period_start || new Date().toISOString().split('T')[0],
        billing_period_end: billing_period_end || new Date().toISOString().split('T')[0],
        student_count,
        plan_code: plan.plan_code,
        base_amount_cents: baseAmount,
        per_student_amount_cents: perStudentAmount,
        student_charges_cents: studentCharges,
        total_amount_cents: totalCents,
        due_date: dueDate.toISOString().split('T')[0],
        notes
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create line items
    const lineItems = [
      {
        invoice_id: invoice.id,
        description: `${plan.name} - ${subscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} Base Fee`,
        quantity: 1,
        unit_price_cents: baseAmount,
        total_price_cents: baseAmount,
        sort_order: 1
      },
      {
        invoice_id: invoice.id,
        description: `Student Licenses (${student_count} students @ ${(perStudentAmount / 100).toLocaleString()} VND/month)`,
        quantity: student_count,
        unit_price_cents: perStudentAmount,
        total_price_cents: studentCharges,
        sort_order: 2
      }
    ];

    await supabaseAdmin
      .from('invoice_line_items')
      .insert(lineItems);

    res.status(201).json({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      totalAmount: invoice.total_amount_cents,
      dueDate: invoice.due_date,
      status: invoice.status
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/invoices/:id
 * Get invoice details
 */
router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    const { data: invoice, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*, schools(*), invoice_line_items(*)')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Access check
    if (!['admin', 'robokids_staff'].includes(userRole)) {
      const { data: adminSchool } = await supabaseAdmin
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', invoice.school_id)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      school: {
        id: invoice.schools?.id,
        name: invoice.schools?.name,
        code: invoice.schools?.code,
        address: invoice.schools?.address,
        email: invoice.schools?.email
      },
      billingPeriodStart: invoice.billing_period_start,
      billingPeriodEnd: invoice.billing_period_end,
      studentCount: invoice.student_count,
      planCode: invoice.plan_code,
      baseAmount: invoice.base_amount_cents,
      perStudentAmount: invoice.per_student_amount_cents,
      studentCharges: invoice.student_charges_cents,
      totalAmount: invoice.total_amount_cents,
      amountPaid: invoice.amount_paid_cents,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.due_date,
      paidAt: invoice.paid_at,
      paymentMethod: invoice.payment_method,
      paymentReference: invoice.payment_reference,
      notes: invoice.notes,
      lineItems: invoice.invoice_line_items?.sort((a, b) => a.sort_order - b.sort_order),
      createdAt: invoice.created_at
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/invoices/:id/pdf
 * Download invoice as PDF
 */
router.get('/invoices/:id/pdf', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = getUserRole(req.user);
    const userId = req.user.id;

    const { data: invoice, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*, schools(*), invoice_line_items(*)')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Access check
    if (!['admin', 'robokids_staff'].includes(userRole)) {
      const { data: adminSchool } = await supabaseAdmin
        .from('school_admins')
        .select('school_id')
        .eq('profile_id', userId)
        .eq('school_id', invoice.school_id)
        .single();

      if (!adminSchool) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('ROBOKIDS VIETNAM', { align: 'center' });
    doc.fontSize(12).text('Robotics Education Platform', { align: 'center' });
    doc.moveDown();

    // Invoice title
    doc.fontSize(18).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Invoice details
    doc.fontSize(10);
    doc.text(`Invoice Number: ${invoice.invoice_number}`);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('vi-VN')}`);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('vi-VN')}`);
    doc.moveDown();

    // School info
    doc.fontSize(12).text('Bill To:', { underline: true });
    doc.fontSize(10);
    doc.text(invoice.schools?.name || 'N/A');
    doc.text(invoice.schools?.address || '');
    doc.text(invoice.schools?.email || '');
    doc.moveDown();

    // Billing period
    doc.text(`Billing Period: ${new Date(invoice.billing_period_start).toLocaleDateString('vi-VN')} - ${new Date(invoice.billing_period_end).toLocaleDateString('vi-VN')}`);
    doc.moveDown();

    // Line items table header
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, tableTop, { width: 250 });
    doc.text('Qty', 300, tableTop);
    doc.text('Unit Price', 350, tableTop, { width: 80, align: 'right' });
    doc.text('Total', 450, tableTop, { width: 80, align: 'right' });
    doc.moveDown();

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.font('Helvetica');

    // Line items
    const sortedItems = (invoice.invoice_line_items || []).sort((a, b) => a.sort_order - b.sort_order);
    for (const item of sortedItems) {
      doc.text(item.description, 50, doc.y, { width: 250 });
      doc.text(item.quantity.toString(), 300, doc.y);
      doc.text(`${(item.unit_price_cents / 100).toLocaleString('vi-VN')} VND`, 350, doc.y, { width: 80, align: 'right' });
      doc.text(`${(item.total_price_cents / 100).toLocaleString('vi-VN')} VND`, 450, doc.y, { width: 80, align: 'right' });
      doc.moveDown();
    }

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Totals
    doc.font('Helvetica-Bold');
    doc.text('Subtotal:', 350, doc.y, { width: 80, align: 'right' });
    doc.text(`${(invoice.total_amount_cents / 100).toLocaleString('vi-VN')} VND`, 450, doc.y, { width: 80, align: 'right' });
    doc.moveDown();

    if (invoice.amount_paid_cents > 0) {
      doc.text('Amount Paid:', 350, doc.y, { width: 80, align: 'right' });
      doc.text(`-${(invoice.amount_paid_cents / 100).toLocaleString('vi-VN')} VND`, 450, doc.y, { width: 80, align: 'right' });
      doc.moveDown();
    }

    doc.fontSize(12);
    doc.text('TOTAL DUE:', 350, doc.y, { width: 80, align: 'right' });
    doc.text(`${((invoice.total_amount_cents - invoice.amount_paid_cents) / 100).toLocaleString('vi-VN')} VND`, 450, doc.y, { width: 80, align: 'right' });

    // Status
    doc.moveDown(2);
    doc.fontSize(14);
    const statusColor = invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'orange';
    doc.fillColor(statusColor).text(`Status: ${invoice.status.toUpperCase()}`, { align: 'center' });

    // Footer
    doc.fillColor('black');
    doc.fontSize(8);
    doc.text('Thank you for your partnership with RoboKids Vietnam!', 50, 700, { align: 'center' });
    doc.text('For questions, contact billing@robokids.vn', 50, 710, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/billing/invoices/:id/mark-paid
 * Mark invoice as paid
 */
router.post('/invoices/:id/mark-paid', authenticate, requireRole('admin', 'robokids_staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, payment_reference } = req.body;

    const { data: invoice, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('school_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount_paid_cents: invoice.total_amount_cents,
        payment_method,
        payment_reference
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Invoice marked as paid' });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/billing/invoices/:id/cancel
 * Cancel an invoice
 */
router.post('/invoices/:id/cancel', authenticate, requireRole('admin', 'robokids_staff'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: invoice, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel a paid invoice' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('school_invoices')
      .update({
        status: 'cancelled',
        notes: invoice.notes ? `${invoice.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Invoice cancelled' });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BILLING DASHBOARD (Admin only)
// ============================================

/**
 * GET /api/billing/dashboard
 * Billing dashboard for RoboKids staff
 */
router.get('/dashboard', authenticate, requireRole('admin', 'robokids_staff'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Get totals
    const { data: allInvoices } = await supabaseAdmin
      .from('school_invoices')
      .select('*');

    // Calculate billing period
    let periodStart = new Date();
    if (period === 'year') {
      periodStart = new Date(periodStart.getFullYear(), 0, 1);
    } else if (period === 'month') {
      periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    }

    const periodInvoices = allInvoices?.filter(inv =>
      new Date(inv.created_at) >= periodStart
    ) || [];

    const totalRevenue = periodInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount_paid_cents, 0);

    const totalOutstanding = allInvoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.total_amount_cents, 0);

    const totalOverdue = allInvoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total_amount_cents, 0);

    // Get counts
    const { count: activeSchools } = await supabaseAdmin
      .from('schools')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: activeSubscriptions } = await supabaseAdmin
      .from('school_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: pendingInvoices } = await supabaseAdmin
      .from('school_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: overdueInvoices } = await supabaseAdmin
      .from('school_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue');

    // Get recent invoices
    const { data: recentInvoices } = await supabaseAdmin
      .from('school_invoices')
      .select('*, schools(name)')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get expiring subscriptions (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringSubscriptions } = await supabaseAdmin
      .from('school_subscriptions')
      .select('*, schools(name), subscription_plans(name)')
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lte('current_period_end', thirtyDaysFromNow.toISOString().split('T')[0])
      .order('current_period_end', { ascending: true })
      .limit(10);

    // Revenue by plan
    const revenueByPlan = {};
    for (const inv of periodInvoices.filter(inv => inv.status === 'paid')) {
      if (!revenueByPlan[inv.plan_code]) {
        revenueByPlan[inv.plan_code] = 0;
      }
      revenueByPlan[inv.plan_code] += inv.amount_paid_cents;
    }

    res.json({
      period,
      periodStart: periodStart.toISOString(),
      summary: {
        totalRevenue: totalRevenue,
        totalOutstanding: totalOutstanding,
        totalOverdue: totalOverdue,
        activeSchools: activeSchools || 0,
        activeSubscriptions: activeSubscriptions || 0,
        pendingInvoices: pendingInvoices || 0,
        overdueInvoices: overdueInvoices || 0
      },
      revenueByPlan,
      recentInvoices: recentInvoices?.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        schoolName: inv.schools?.name,
        totalAmount: inv.total_amount_cents,
        status: inv.status,
        dueDate: inv.due_date,
        paidAt: inv.paid_at
      })),
      expiringSubscriptions: expiringSubscriptions?.map(sub => ({
        id: sub.id,
        schoolName: sub.schools?.name,
        planName: sub.subscription_plans?.name,
        currentPeriodEnd: sub.current_period_end,
        daysUntilExpiry: Math.ceil((new Date(sub.current_period_end) - new Date()) / (1000 * 60 * 60 * 24))
      }))
    });
  } catch (error) {
    console.error('Billing dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/overdue
 * List all overdue invoices (admin only)
 */
router.get('/overdue', authenticate, requireRole('admin', 'robokids_staff'), async (req, res) => {
  try {
    const { data: invoices, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*, schools(name, code, contact_email)')
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });

    if (error) throw error;

    // Update status for any pending invoices past due date
    const today = new Date().toISOString().split('T')[0];
    const overduePending = invoices?.filter(inv =>
      inv.status === 'pending' && inv.due_date < today
    ) || [];

    for (const inv of overduePending) {
      await supabaseAdmin
        .from('school_invoices')
        .update({ status: 'overdue' })
        .eq('id', inv.id);
    }

    // Re-fetch with updated status
    const { data: updatedInvoices } = await supabaseAdmin
      .from('school_invoices')
      .select('*, schools(name, code, contact_email)')
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });

    res.json({
      invoices: updatedInvoices?.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        schoolName: inv.schools?.name,
        schoolCode: inv.schools?.code,
        contactEmail: inv.schools?.contact_email,
        totalAmount: inv.total_amount_cents,
        dueDate: inv.due_date,
        daysOverdue: Math.ceil((new Date() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24)),
        createdAt: inv.created_at
      }))
    });
  } catch (error) {
    console.error('Get overdue invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AUTO-RENEWAL NOTIFICATIONS
// ============================================

/**
 * POST /api/billing/renewal-notifications/send
 * Send renewal reminder notifications (called by cron or manually)
 */
router.post('/renewal-notifications/send', authenticate, requireRole('admin', 'robokids_staff'), async (req, res) => {
  try {
    const today = new Date();
    const notifications = [];

    // Find subscriptions expiring in 30, 7, and 1 days
    const { data: expiringSubscriptions } = await supabaseAdmin
      .from('school_subscriptions')
      .select('*, schools(name, contact_email, contact_person)')
      .eq('status', 'active')
      .eq('auto_renew', true);

    for (const sub of expiringSubscriptions || []) {
      const daysUntilExpiry = Math.ceil(
        (new Date(sub.current_period_end) - today) / (1000 * 60 * 60 * 24)
      );

      let notificationType = null;
      if (daysUntilExpiry === 30) notificationType = 'renewal_reminder_30d';
      else if (daysUntilExpiry === 7) notificationType = 'renewal_reminder_7d';
      else if (daysUntilExpiry === 1) notificationType = 'renewal_reminder_1d';
      else if (daysUntilExpiry <= 0) notificationType = 'renewal_expired';

      if (!notificationType) continue;

      // Check if notification already sent
      const { data: existing } = await supabaseAdmin
        .from('renewal_notifications')
        .select('id')
        .eq('school_id', sub.school_id)
        .eq('notification_type', notificationType)
        .gte('sent_at', today.toISOString().split('T')[0]);

      if (existing?.length > 0) continue;

      // Create notification record
      const { data: notif, error: notifError } = await supabaseAdmin
        .from('renewal_notifications')
        .insert({
          school_id: sub.school_id,
          notification_type: notificationType,
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          delivery_status: 'sent',
          delivery_method: 'email',
          recipient_email: sub.schools?.contact_email,
          recipient_name: sub.schools?.contact_person
        })
        .select()
        .single();

      if (!notifError && notif) {
        notifications.push({
          id: notif.id,
          schoolName: sub.schools?.name,
          type: notificationType,
          email: sub.schools?.contact_email
        });

        // TODO: Actually send email via sendEmail function
        console.log(`Renewal notification sent: ${notificationType} for school ${sub.schools?.name}`);
      }
    }

    res.json({
      success: true,
      sent: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Send renewal notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/billing/renewal-notifications
 * Get renewal notifications history
 */
router.get('/renewal-notifications', authenticate, requireRole('admin', 'robokids_staff'), async (req, res) => {
  try {
    const { school_id, limit = 50 } = req.query;

    let query = supabaseAdmin
      .from('renewal_notifications')
      .select('*, schools(name)')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    res.json({
      notifications: notifications?.map(n => ({
        id: n.id,
        schoolName: n.schools?.name,
        notificationType: n.notification_type,
        scheduledFor: n.scheduled_for,
        sentAt: n.sent_at,
        deliveryStatus: n.delivery_status,
        recipientEmail: n.recipient_email
      }))
    });
  } catch (error) {
    console.error('Get renewal notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
