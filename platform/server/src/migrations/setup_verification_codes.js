// One-time script to create verification_codes table in Supabase
// Run: node src/migrations/setup_verification_codes.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setup() {
  console.log('Creating verification_codes table...');

  // Create table using raw SQL via admin API
  const { error } = await supabaseAdmin.rpc('exec', {
    sql: `
      CREATE TABLE IF NOT EXISTS verification_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (error) {
    // If rpc exec doesn't exist, try via REST
    console.log('RPC exec not available, trying direct table creation...');

    // The table might need to be created via Supabase dashboard
    // For now, let's just verify our code will work
    console.log('Note: verification_codes table must be created manually in Supabase dashboard');
    console.log('SQL to run:');
    console.log(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
    `);
  } else {
    console.log('Table created successfully!');

    // Create index
    await supabaseAdmin.rpc('exec', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);'
    });
    console.log('Index created successfully!');
  }

  // Verify the table structure
  const { data, error: selectError } = await supabaseAdmin
    .from('verification_codes')
    .select('*')
    .limit(1);

  if (selectError) {
    console.error('Table may not exist yet:', selectError.message);
    console.log('Please create the table manually in Supabase dashboard');
  } else {
    console.log('Table verification: OK');
  }
}

setup().catch(console.error);