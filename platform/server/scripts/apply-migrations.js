/**
 * Apply all Supabase migrations using pg_execute RPC
 * This script attempts to execute SQL via Supabase's RPC function
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
  process.exit(1);
}

console.log('=== RoboKids Supabase Migration Tool ===');
console.log(`Project: ${supabaseUrl.split('//')[1].split('.')[0]}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function executeSQL(sql) {
  try {
    const result = await supabase.rpc('exec', { sql });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, data: result.data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .limit(1)
    .maybeSingle();

  return !error && data !== null;
}

async function getTableInfo(tableName) {
  // Try to query table info via information_schema
  const result = await executeSQL(
    `SELECT table_name, rowsecurity FROM information_schema.tables WHERE table_name = '${tableName}' AND table_schema = 'public'`
  );
  return result;
}

async function checkExistingTables() {
  console.log('\n=== Existing Core Tables ===');
  const tables = [
    'profiles', 'students', 'courses', 'lessons',
    'enrollments', 'lesson_progress', 'robot_sessions',
    'badges', 'earned_badges', 'parent_dashboard', 'certificates',
    'mobile_device_tokens', 'payments', 'beta_feedback',
    'challenges', 'school_portal', 'parent_invitations',
    'school_admins', 'school_billing', 'parent_notifications',
    'mentors', 'team_mentors', 'live_classes'
  ];

  for (const table of tables) {
    const exists = await checkTableExists(table);
    console.log(`  ${exists ? '✓' : '✗'} ${table}`);
  }
}

async function runMigrationFile(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  console.log(`\n--- Processing ${fileName} ---`);

  const sql = readFileSync(filePath, 'utf8');

  // Extract table name
  const tableMatch = sql.match(/CREATE TABLE.*?public\.(\w+)/i);
  const tableName = tableMatch ? tableMatch[1] : 'unknown';
  console.log(`  Target table: ${tableName}`);

  // Check if table exists
  const exists = await checkTableExists(tableName);
  if (exists) {
    console.log(`  Table ${tableName} already exists - SKIPPING`);
    return { fileName, tableName, status: 'skipped', reason: 'already exists' };
  }

  // Split SQL into executable statements
  const statements = sql.split(';').map(s => s.trim()).filter(s => {
    return s.length > 0 && !s.startsWith('--');
  });

  console.log(`  Executing ${statements.length} statements...`);

  const results = [];
  for (const stmt of statements) {
    if (!stmt) continue;

    const result = await executeSQL(stmt);
    if (result.success) {
      results.push({ sql: stmt.substring(0, 50), status: 'ok' });
    } else {
      results.push({ sql: stmt.substring(0, 50), status: 'error', error: result.error });
      console.log(`  Error in: ${stmt.substring(0, 60)}...`);
      console.log(`  Message: ${result.error}`);
    }
  }

  const errors = results.filter(r => r.status === 'error').length;
  console.log(`  Results: ${results.length - errors} OK, ${errors} errors`);

  return { fileName, tableName, status: errors > 0 ? 'partial' : 'ok', errors };
}

async function main() {
  console.log('Connecting to Supabase...');

  // Test connection
  let dbConnected = false;
  try {
    const versionResult = await supabase.rpc('exec', { sql: 'SELECT version()' });
    if (versionResult.error) {
      console.log('Note: Cannot execute SQL directly via RPC');
      console.log('Error:', versionResult.error.message);
    } else {
      console.log('Database connection: OK');
      dbConnected = true;
    }
  } catch (e) {
    console.log('Note: Cannot execute SQL directly via RPC (expected for managed Supabase)');
    console.log('Error:', e.message);
  }

  await checkExistingTables();

  const migrationsDir = join(__dirname, '../supabase/migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n=== Applying ${files.length} Migrations ===`);

  const results = [];
  for (const file of files) {
    const result = await runMigrationFile(join(migrationsDir, file));
    results.push(result);
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`  ${r.status === 'ok' ? '✓' : r.status === 'skipped' ? '→' : '⚠'} ${r.fileName}: ${r.status}${r.reason ? ` (${r.reason})` : ''}`);
  }

  const skipped = results.filter(r => r.status === 'skipped').length;
  const ok = results.filter(r => r.status === 'ok').length;
  const partial = results.filter(r => r.status === 'partial').length;

  console.log(`\nTotal: ${files.length} migrations | ${ok} applied | ${skipped} skipped | ${partial} partial`);

  if (partial > 0) {
    console.log('\n⚠ Some migrations had errors. Manual review may be required in Supabase Dashboard.');
  }

  // Final check
  console.log('\n=== Final Table Check ===');
  await checkExistingTables();
}

main().catch(console.error);