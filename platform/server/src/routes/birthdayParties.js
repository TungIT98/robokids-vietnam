/**
 * Birthday Party Bookings API routes for RoboKids Vietnam
 * Handles inquiries, booking management, and revenue tracking
 */

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Pricing in cents (VND)
const PACKAGE_PRICING = {
  bronze: 1500000,
  silver: 2000000,
  gold: 2500000,
};

/**
 * POST /api/birthday-parties/inquiries
 * Submit a birthday party inquiry (public - no auth required)
 */
router.post('/inquiries', async (req, res) => {
  const {
    parent_name,
    parent_phone,
    parent_zalo,
    package_tier,
    preferred_date,
    preferred_time,
    num_children,
    notes,
  } = req.body;

  // Validate required fields
  if (!parent_name || !parent_phone || !package_tier || !preferred_date || !num_children) {
    return res.status(400).json({
      error: 'Missing required fields: parent_name, parent_phone, package_tier, preferred_date, num_children',
    });
  }

  if (!PACKAGE_PRICING[package_tier]) {
    return res.status(400).json({
      error: `Invalid package_tier. Must be one of: ${Object.keys(PACKAGE_PRICING).join(', ')}`,
    });
  }

  const parsedChildren = parseInt(num_children, 10);
  if (isNaN(parsedChildren) || parsedChildren <= 0) {
    return res.status(400).json({ error: 'num_children must be a positive integer' });
  }

  const total_amount_cents = PACKAGE_PRICING[package_tier];

  const { data, error } = await supabaseAdmin
    .from('birthday_party_bookings')
    .insert({
      parent_name: parent_name.trim(),
      parent_phone: parent_phone.trim(),
      parent_zalo: parent_zalo ? parent_zalo.trim() : null,
      package_tier,
      preferred_date,
      preferred_time: preferred_time || null,
      num_children: parsedChildren,
      total_amount_cents,
      status: 'pending',
      notes: notes ? notes.trim() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Birthday party inquiry error:', error);
    return res.status(500).json({ error: 'Failed to submit inquiry' });
  }

  res.status(201).json({
    message: 'Inquiry submitted successfully. Our team will contact you within 24 hours.',
    booking_id: data.id,
    package: data.package_tier,
    total_amount_cents: data.total_amount_cents,
  });
});

/**
 * GET /api/birthday-parties/bookings
 * List all bookings (COO/admin only)
 */
router.get('/bookings', authenticate, requireRole('coo', 'admin'), async (req, res) => {
  const { status, from_date, to_date, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from('birthday_party_bookings')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (from_date) {
    query = query.gte('preferred_date', from_date);
  }
  if (to_date) {
    query = query.lte('preferred_date', to_date);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('List birthday bookings error:', error);
    return res.status(500).json({ error: 'Failed to retrieve bookings' });
  }

  res.json({ bookings: data, total: count });
});

/**
 * PATCH /api/birthday-parties/bookings/:id/status
 * Update booking status (COO/admin only)
 */
router.patch('/bookings/:id/status', authenticate, requireRole('coo', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['pending', 'confirmed', 'scheduled', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  const updateData = { status };
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const { data, error } = await supabaseAdmin
    .from('birthday_party_bookings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update birthday booking status error:', error);
    return res.status(500).json({ error: 'Failed to update booking status' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  res.json({ message: 'Status updated', booking: data });
});

/**
 * GET /api/birthday-parties/revenue
 * Get revenue summary (COO/admin only)
 */
router.get('/revenue', authenticate, requireRole('coo', 'admin'), async (req, res) => {
  const { from_date, to_date } = req.query;

  let query = supabaseAdmin
    .from('birthday_party_bookings')
    .select('package_tier, total_amount_cents, status, preferred_date')
    .in('status', ['confirmed', 'scheduled', 'completed']);

  if (from_date) {
    query = query.gte('preferred_date', from_date);
  }
  if (to_date) {
    query = query.lte('preferred_date', to_date);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Revenue query error:', error);
    return res.status(500).json({ error: 'Failed to retrieve revenue data' });
  }

  // Aggregate totals
  const summary = {
    total_bookings: data.length,
    total_revenue_cents: 0,
    by_package: { bronze: { count: 0, revenue_cents: 0 }, silver: { count: 0, revenue_cents: 0 }, gold: { count: 0, revenue_cents: 0 } },
    by_status: {},
  };

  for (const booking of data) {
    summary.total_revenue_cents += booking.total_amount_cents;

    if (summary.by_package[booking.package_tier]) {
      summary.by_package[booking.package_tier].count += 1;
      summary.by_package[booking.package_tier].revenue_cents += booking.total_amount_cents;
    }

    summary.by_status[booking.status] = (summary.by_status[booking.status] || 0) + 1;
  }

  res.json(summary);
});

/**
 * POST /api/birthday-parties/leads
 * Create a new lead from paid ads (public - no auth required)
 */
router.post('/leads', async (req, res) => {
  const {
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    ad_variation,
    ad_set_id,
    parent_name,
    parent_phone,
    parent_zalo,
    parent_email,
    child_age_group,
    ad_spend_cents,
    cost_per_lead_cents,
  } = req.body;

  // Validate required fields
  if (!source || !parent_name || !parent_phone) {
    return res.status(400).json({
      error: 'Missing required fields: source, parent_name, parent_phone',
    });
  }

  const validSources = ['facebook', 'zalo', 'organic', 'referral'];
  if (!validSources.includes(source)) {
    return res.status(400).json({
      error: `Invalid source. Must be one of: ${validSources.join(', ')}`,
    });
  }

  // Check for duplicate phone within 24 hours (idempotency)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existingLead } = await supabaseAdmin
    .from('birthday_party_leads')
    .select('id')
    .eq('parent_phone', parent_phone.trim())
    .gte('created_at', twentyFourHoursAgo)
    .single();

  if (existingLead) {
    return res.status(409).json({
      error: 'Lead already captured within last 24 hours',
      lead_id: existingLead.id,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('birthday_party_leads')
    .insert({
      source,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      ad_variation: ad_variation || null,
      ad_set_id: ad_set_id || null,
      parent_name: parent_name.trim(),
      parent_phone: parent_phone.trim(),
      parent_zalo: parent_zalo ? parent_zalo.trim() : null,
      parent_email: parent_email ? parent_email.trim() : null,
      child_age_group: child_age_group || null,
      status: 'new',
      ad_spend_cents: ad_spend_cents ? parseInt(ad_spend_cents, 10) : null,
      cost_per_lead_cents: cost_per_lead_cents ? parseInt(cost_per_lead_cents, 10) : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Birthday party lead creation error:', error);
    return res.status(500).json({ error: 'Failed to capture lead' });
  }

  res.status(201).json({
    lead_id: data.id,
    message: 'Lead captured successfully',
  });
});

/**
 * GET /api/birthday-parties/leads
 * List leads with filtering and pagination (COO/admin only)
 */
router.get('/leads', authenticate, requireRole('coo', 'admin', 'marketing'), async (req, res) => {
  const { status, source, utm_campaign, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from('birthday_party_leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (source) {
    query = query.eq('source', source);
  }
  if (utm_campaign) {
    query = query.eq('utm_campaign', utm_campaign);
  }

  const { data, count, error } = await query.then(({ data, count, error }) => ({ data, count, error }));

  if (error) {
    console.error('List leads error:', error);
    return res.status(500).json({ error: 'Failed to retrieve leads' });
  }

  res.json({ leads: data, total: count, page: Math.floor(offset / limit) + 1 });
});

/**
 * PATCH /api/birthday-parties/leads/:id/status
 * Update lead status (COO/admin only)
 */
router.patch('/leads/:id/status', authenticate, requireRole('coo', 'admin', 'marketing'), async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['new', 'contacted', 'qualified', 'booked', 'lost', 'unqualified'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  // Build update data with timestamp tracking
  const updateData = { status };
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  // Set appropriate timestamp when status changes
  if (status === 'contacted' && !updateData.contacted_at) {
    updateData.contacted_at = new Date().toISOString();
  } else if (status === 'qualified' && !updateData.qualified_at) {
    updateData.qualified_at = new Date().toISOString();
  } else if (status === 'booked' && !updateData.booked_at) {
    updateData.booked_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('birthday_party_leads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update lead status error:', error);
    return res.status(500).json({ error: 'Failed to update lead status' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  res.json({ lead: data });
});

/**
 * POST /api/birthday-parties/leads/:id/convert
 * Convert lead to booking (COO/admin only)
 */
router.post('/leads/:id/convert', authenticate, requireRole('coo', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { booking_id } = req.body;

  if (!booking_id) {
    return res.status(400).json({ error: 'Missing required field: booking_id' });
  }

  // Verify booking exists
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('birthday_party_bookings')
    .select('id')
    .eq('id', booking_id)
    .single();

  if (bookingError || !booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const { data, error } = await supabaseAdmin
    .from('birthday_party_leads')
    .update({
      status: 'booked',
      booking_id,
      booked_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Convert lead error:', error);
    return res.status(500).json({ error: 'Failed to convert lead' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  res.json({ lead: data, booking_id });
});

/**
 * GET /api/birthday-parties/leads/stats
 * Get lead statistics for marketing analysis (COO/admin only)
 */
router.get('/leads/stats', authenticate, requireRole('coo', 'admin', 'marketing'), async (req, res) => {
  const { from_date, to_date } = req.query;

  let query = supabaseAdmin
    .from('birthday_party_leads')
    .select('source, status, utm_campaign, ad_variation, cost_per_lead_cents, booked_at, created_at');

  if (from_date) {
    query = query.gte('created_at', from_date);
  }
  if (to_date) {
    query = query.lte('created_at', to_date + 'T23:59:59.999Z');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Lead stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve statistics' });
  }

  // Calculate stats
  const stats = {
    total_leads: data.length,
    by_source: {},
    by_status: {},
    by_ad_variation: {},
    conversion_rate: 0,
    cost_per_booking_cents: null,
  };

  let bookedLeads = 0;
  let totalCostPerLead = 0;
  let leadsWithCost = 0;

  for (const lead of data) {
    // Count by source
    stats.by_source[lead.source] = (stats.by_source[lead.source] || 0) + 1;

    // Count by status
    stats.by_status[lead.status] = (stats.by_status[lead.status] || 0) + 1;

    // Count by ad variation
    if (lead.ad_variation) {
      if (!stats.by_ad_variation[lead.ad_variation]) {
        stats.by_ad_variation[lead.ad_variation] = { total: 0, booked: 0 };
      }
      stats.by_ad_variation[lead.ad_variation].total += 1;
      if (lead.status === 'booked') {
        stats.by_ad_variation[lead.ad_variation].booked += 1;
      }
    }

    // Track booked leads
    if (lead.status === 'booked') {
      bookedLeads += 1;
    }

    // Track cost per lead for average calculation
    if (lead.cost_per_lead_cents && lead.cost_per_lead_cents > 0) {
      totalCostPerLead += lead.cost_per_lead_cents;
      leadsWithCost += 1;
    }
  }

  // Calculate conversion rate
  stats.conversion_rate = data.length > 0 ? bookedLeads / data.length : 0;

  // Calculate cost per booking
  if (bookedLeads > 0 && totalCostPerLead > 0) {
    stats.cost_per_booking_cents = Math.round(totalCostPerLead / bookedLeads);
  }

  // Add average cost per lead
  if (leadsWithCost > 0) {
    stats.avg_cost_per_lead_cents = Math.round(totalCostPerLead / leadsWithCost);
  }

  // Add conversion rate by ad variation
  for (const variation of Object.keys(stats.by_ad_variation)) {
    const v = stats.by_ad_variation[variation];
    v.conversion_rate = v.total > 0 ? v.booked / v.total : 0;
  }

  res.json(stats);
});

export default router;
