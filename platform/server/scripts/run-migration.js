/**
 * Run Supabase migrations against the live database
 * Usage: node scripts/run-migration.js <migration_number>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const migrationNum = process.argv[2] || '009';
const migrationPath = join(__dirname, `../supabase/migrations/${migrationNum.padStart(3, '0')}_enrollments_table.sql`);

let sql;
try {
  sql = readFileSync(migrationPath, 'utf8');
} catch (err) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

console.log(`Running migration ${migrationNum}...`);

// Use rpc to execute SQL (requires pg_execute_server_configure)
async function runSQL() {
  const statements = sql.split(';').filter(s => s.trim());

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    const { data, error } = await supabase.rpc('exec', { sql: trimmed });
    if (error) {
      console.error('Error:', error.message);
      // Try alternative approach
      console.log('Trying direct insert...');
    }
  }
}

// Actually we can use the REST API with service role to create tables
// Check if table exists first
async function checkTable() {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id')
    .limit(1);

  if (error) {
    console.log('Table does not exist or error:', error.message);
    return false;
  }
  console.log('Table exists:', data);
  return true;
}

// Create table using raw SQL via pg endpoint
async function createTableWithSQL() {
  console.log('Creating enrollments table via SQL...');

  // Supabase SQL Editor endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ sql: sql })
  });

  console.log('Response:', response.status, await response.text());
}

checkTable().then(exists => {
  if (!exists) {
    console.log('\nMigration 009 needs to be applied to create enrollments table.');
    console.log('Run this SQL in your Supabase SQL Editor:\n');
    console.log(sql);
  }
});