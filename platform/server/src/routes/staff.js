/**
 * Staff Portal API routes for RoboKids Vietnam
 * Aggregates data across ALL schools for platform staff
 */

import express from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Role helper
function getUserRole(user) {
  return user.role || user.user_metadata?.role || 'student';
}

// Require robokids_staff or admin role for all routes
function requireStaffAccess(req, res, next) {
  const userRole = getUserRole(req.user);
  if (userRole !== 'robokids_staff' && userRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Staff or admin role required.' });
  }
  next();
}

/**
 * GET /api/staff/billing
 * Returns all school subscriptions and invoice data
 * Aggregates across all schools in platform
 */
router.get('/billing', authenticate, requireStaffAccess, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, school_id } = req.query;
    const offset = (page - 1) * limit;

    // Get school subscriptions with school and plan details
    let query = supabaseAdmin
      .from('school_subscriptions')
      .select(`
        *,
        school:schools(id, name, code, email, is_active),
        plan:subscription_plans(id, name, plan_code, base_price_cents)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data: subscriptions, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get invoices for these subscriptions
    const subscriptionIds = subscriptions?.map((s) => s.id) || [];
    const { data: invoices } = subscriptionIds.length > 0
      ? await supabaseAdmin
          .from('school_invoices')
          .select('*')
          .in('subscription_id', subscriptionIds)
          .order('created_at', { ascending: false })
      : { data: [] };

    // Group invoices by subscription
    const invoicesBySubscription = {};
    invoices?.forEach((inv) => {
      if (!invoicesBySubscription[inv.subscription_id]) {
        invoicesBySubscription[inv.subscription_id] = [];
      }
      invoicesBySubscription[inv.subscription_id].push({
        id: inv.id,
        invoice_number: inv.invoice_number,
        billing_period_start: inv.billing_period_start,
        billing_period_end: inv.billing_period_end,
        total_amount_cents: inv.total_amount_cents,
        amount_paid_cents: inv.amount_paid_cents,
        status: inv.status,
        due_date: inv.due_date,
        paid_at: inv.paid_at,
      });
    });

    // Calculate summary stats
    const allInvoices = invoices || [];
    const totalRevenue = allInvoices.reduce((sum, inv) => sum + (inv.amount_paid_cents || 0), 0);
    const pendingAmount = allInvoices
      .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total_amount_cents - inv.amount_paid_cents), 0);
    const overdueCount = allInvoices.filter((inv) => inv.status === 'overdue').length;

    const subscriptionsWithInvoices = subscriptions?.map((sub) => ({
      id: sub.id,
      school: sub.school ? {
        id: sub.school.id,
        name: sub.school.name,
        code: sub.school.code,
        email: sub.school.email,
        is_active: sub.school.is_active,
      } : null,
      plan: sub.plan ? {
        id: sub.plan.id,
        name: sub.plan.name,
        code: sub.plan.plan_code,
      } : null,
      billing_cycle: sub.billing_cycle,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      auto_renew: sub.auto_renew,
      invoices: invoicesBySubscription[sub.id] || [],
    })) || [];

    res.json({
      subscriptions: subscriptionsWithInvoices,
      summary: {
        total_subscriptions: count || 0,
        active_count: subscriptions?.filter((s) => s.status === 'active').length || 0,
        total_revenue_cents: totalRevenue,
        pending_amount_cents: pendingAmount,
        overdue_count: overdueCount,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('Error fetching staff billing data:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/staff/reports
 * Returns platform-wide analytics
 * Includes: total students, total schools, revenue reports, popular lessons, completion rates
 */
router.get('/reports', authenticate, requireStaffAccess, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Get total schools count
    const { count: totalSchools } = await supabaseAdmin
      .from('schools')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Get total students count
    const { count: totalStudents } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact' });

    // Get active subscriptions count
    const { count: activeSubscriptions } = await supabaseAdmin
      .from('school_subscriptions')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    // Get total teachers
    const { count: totalTeachers } = await supabaseAdmin
      .from('teachers')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Get revenue data from invoices
    let revenueQuery = supabaseAdmin
      .from('school_invoices')
      .select('total_amount_cents, amount_paid_cents, status, paid_at, created_at');

    if (start_date) {
      revenueQuery = revenueQuery.gte('created_at', start_date);
    }
    if (end_date) {
      revenueQuery = revenueQuery.lte('created_at', end_date);
    }

    const { data: invoices } = await revenueQuery;

    const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount_paid_cents || 0), 0) || 0;
    const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount_cents || 0), 0) || 0;
    const pendingRevenue = invoices
      ?.filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total_amount_cents - inv.amount_paid_cents), 0) || 0;

    // Get monthly revenue (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: monthlyInvoices } = await supabaseAdmin
      .from('school_invoices')
      .select('total_amount_cents, amount_paid_cents, paid_at, created_at')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .not('paid_at', 'is', null);

    const monthlyRevenue = {};
    monthlyInvoices?.forEach((inv) => {
      if (inv.paid_at) {
        const month = inv.paid_at.substring(0, 7); // YYYY-MM
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (inv.amount_paid_cents || 0);
      }
    });

    // Get popular lessons (by enrollment/completion)
    const { data: popularLessons } = await supabaseAdmin
      .from('lessons')
      .select(`
        id,
        title,
        course:courses(id, title)
      `)
      .order('order_index', { ascending: true })
      .limit(10);

    // Get completion stats
    const { data: progressData } = await supabaseAdmin
      .from('user_progress')
      .select('current_level, total_xp, lessons_completed, courses_completed');

    const avgLevel = progressData?.length > 0
      ? Math.round(progressData.reduce((sum, p) => sum + p.current_level, 0) / progressData.length * 10) / 10
      : 0;
    const avgXp = progressData?.length > 0
      ? Math.round(progressData.reduce((sum, p) => sum + p.total_xp, 0) / progressData.length)
      : 0;
    const totalLessonsCompleted = progressData?.reduce((sum, p) => sum + (p.lessons_completed || 0), 0) || 0;
    const totalCoursesCompleted = progressData?.reduce((sum, p) => sum + (p.courses_completed || 0), 0) || 0;

    // Get completion rate (completed lessons / total enrollments)
    const { count: totalEnrollments } = await supabaseAdmin
      .from('enrollments')
      .select('*', { count: 'exact' });

    const { count: completedEnrollments } = await supabaseAdmin
      .from('enrollments')
      .select('*', { count: 'exact' })
      .not('completed_at', 'is', null);

    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments || 0) / totalEnrollments * 100)
      : 0;

    // Get school distribution by subscription plan
    const { data: schoolsByPlan } = await supabaseAdmin
      .from('schools')
      .select('subscription_plan')
      .eq('is_active', true);

    const planDistribution = {};
    schoolsByPlan?.forEach((school) => {
      const plan = school.subscription_plan || 'none';
      planDistribution[plan] = (planDistribution[plan] || 0) + 1;
    });

    // Get recent activity (enrollments in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentEnrollments } = await supabaseAdmin
      .from('enrollments')
      .select('*', { count: 'exact' })
      .gte('enrolled_at', thirtyDaysAgo.toISOString());

    res.json({
      overview: {
        total_schools: totalSchools || 0,
        total_students: totalStudents || 0,
        total_teachers: totalTeachers || 0,
        active_subscriptions: activeSubscriptions || 0,
        avg_student_level: avgLevel,
        avg_student_xp: avgXp,
      },
      revenue: {
        total_revenue_cents: totalRevenue,
        total_invoiced_cents: totalInvoiced,
        pending_revenue_cents: pendingRevenue,
        monthly_revenue: monthlyRevenue,
        currency: 'VND',
      },
      lessons: {
        total_lessons_completed: totalLessonsCompleted,
        total_courses_completed: totalCoursesCompleted,
        completion_rate: completionRate,
        popular_lessons: popularLessons?.map((l) => ({
          id: l.id,
          title: l.title,
          course: l.course?.title,
        })) || [],
      },
      school_distribution: {
        by_subscription_plan: planDistribution,
      },
      activity: {
        recent_enrollments_30d: recentEnrollments || 0,
      },
    });
  } catch (err) {
    console.error('Error generating staff reports:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
