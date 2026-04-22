/**
 * Create beta_enrollments table in Supabase using Management API
 * Run with: node scripts/create-beta-enrollments.js
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uciwcnjdomvahtbcvfyg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaXdjbmpkb212YWh0YmN2ZnlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc4OTUxOSwiZXhwIjoyMDkxMzY1NTE5fQ.5mkcsewq8ALfgFjnr2yvTrg48MkohtTTBK1_2UDCmPA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sql = `
  CREATE TABLE IF NOT EXISTS public.beta_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    child_name TEXT NOT NULL,
    child_age INTEGER NOT NULL CHECK (child_age >= 6 AND child_age <= 16),
    class_schedule TEXT NOT NULL,
    consent_data_processing BOOLEAN NOT NULL DEFAULT true,
    consent_marketing BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'enrolled', 'rejected', 'cancelled')),
    notes TEXT,
    enrolled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  ALTER TABLE public.beta_enrollments ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Service role can do everything on beta_enrollments"
    ON public.beta_enrollments FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  CREATE POLICY "Anyone can submit beta enrollment"
    ON public.beta_enrollments FOR INSERT
    TO anon
    WITH CHECK (true);

  CREATE INDEX idx_beta_enrollments_email ON public.beta_enrollments(email);
  CREATE INDEX idx_beta_enrollments_status ON public.beta_enrollments(status);
`;

// Try using the pg_database endpoint to run SQL
async function createTableWithManagementAPI() {
  console.log('Creating beta_enrollments table via Management API...');

  // Use Supabase's project management endpoint
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/pg_execute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql })
    }
  );

  const text = await response.text();
  console.log('Response status:', response.status);
  console.log('Response:', text);
}

// Try with simple insert to test service role works
async function testServiceRole() {
  console.log('Testing service role...');
  const { data, error } = await supabase
    .from('beta_enrollments')
    .insert({
      parent_name: 'Test Parent',
      email: 'test-' + Date.now() + '@example.com',
      phone: '123456789',
      child_name: 'Test Child',
      child_age: 8,
      class_schedule: 'morning',
      consent_data_processing: true,
    })
    .select()
    .single();

  if (error) {
    console.log('Insert failed (expected):', error.message);
  } else {
    console.log('Insert succeeded:', data);
  }
}

async function checkTableExists() {
  // Check via REST API what tables exist
  const response = await fetch(
    `${supabaseUrl}/rest/v1/?apikey=${supabaseServiceKey}`,
    {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    }
  );
  const text = await response.text();
  console.log('API accessible, status:', response.status);
}

async function tryRawSQLViaPostgres() {
  // Try connecting directly to postgres
  console.log('Checking if table was created via raw SQL...');
  const { data, error } = await supabase
    .from('beta_enrollments')
    .select('id')
    .limit(1);

  if (error) {
    console.log('Table does not exist yet. Error:', error.message);
    return false;
  }
  console.log('Table exists!');
  return true;
}

// Let's try a workaround - use the REST API with a proper POST to create the table
// using Supabase's SQL endpoint
async function createTableViaSQLEndpoint() {
  console.log('Trying SQL endpoint...');

  // This is the standard Supabase REST API SQL execution
  const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql })
  });

  console.log('Status:', resp.status);
  console.log('Response:', await resp.text());
}

// Actually the best approach is to use the Supabase management API
// Let's try different approaches
async function main() {
  await checkTableExists();
  const exists = await tryRawSQLViaPostgres();
  if (!exists) {
    console.log('\nCannot create table automatically - Supabase requires manual SQL execution.');
    console.log('Please run this SQL in your Supabase SQL Editor (Project > SQL Editor):\n');
    console.log(sql);
  }
}

main().catch(console.error);