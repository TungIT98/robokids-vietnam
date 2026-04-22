/**
 * Cloudflare Pages Function: Enrollment API
 *
 * Handles public enrollment form submissions and writes to Supabase.
 * This runs at the edge for minimum latency.
 *
 * Routing:
 * - /enroll -> serves static HTML (public/enroll/index.html)
 * - /enroll-api -> handles POST for enrollment submissions
 */

export async function onRequest(context): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(context.request.url);

  // Health check endpoint
  if (url.pathname === '/enroll-api/health') {
    return new Response(JSON.stringify({ status: 'ok', service: 'enrollment-api' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Handle enrollment POST
  if (context.request.method === 'POST') {
    try {
      const data = await context.request.json();

      // Validate required fields
      if (!data.parent_name || !data.email || !data.phone || !data.child_name || !data.child_age) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: parent_name, email, phone, child_name, child_age',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      if (!data.consent_data_processing) {
        return new Response(JSON.stringify({
          error: 'Consent to data processing is required',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Validate phone (9-11 digits)
      const phoneDigits = data.phone.replace(/\s/g, '');
      if (!/^[0-9]{9,11}$/.test(phoneDigits)) {
        return new Response(JSON.stringify({ error: 'Invalid phone number (9-11 digits required)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Validate child age (6-16)
      const age = parseInt(data.child_age);
      if (isNaN(age) || age < 6 || age > 16) {
        return new Response(JSON.stringify({ error: 'Child age must be between 6 and 16' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Get Supabase credentials from environment
      const supabaseUrl = context.env.SUPABASE_URL;
      const supabaseKey = context.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables');
        return new Response(JSON.stringify({ error: 'Service configuration error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Check for duplicate enrollment
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/enrollments?email=eq.${encodeURIComponent(data.email.toLowerCase())}&status=eq.pending&select=id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      const existingEnrollments = await checkResponse.json();
      if (existingEnrollments && existingEnrollments.length > 0) {
        return new Response(JSON.stringify({
          error: 'An enrollment with this email already exists. We will contact you shortly.',
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Create enrollment record in Supabase
      const insertResponse = await fetch(
        `${supabaseUrl}/rest/v1/enrollments`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            parent_name: data.parent_name.trim(),
            email: data.email.toLowerCase().trim(),
            phone: phoneDigits,
            child_name: data.child_name.trim(),
            child_age: age,
            class_schedule: data.class_schedule || '',
            consent_data_processing: data.consent_data_processing,
            consent_marketing: data.consent_marketing || false,
            status: 'pending',
          }),
        }
      );

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        console.error('Supabase insert error:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to create enrollment record' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const insertedEnrollment = await insertResponse.json();

      return new Response(JSON.stringify({
        success: true,
        enrollment_id: insertedEnrollment[0]?.id || 'pending-review',
        message: 'Enrollment created successfully.',
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (err) {
      console.error('Enrollment error:', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  // Method not allowed for other HTTP methods
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}