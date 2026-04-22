-- API Monetization & Webhooks Schema
-- Parent: ROB-257 API Monetization & Webhooks

-- API Clients table: third-party developers
CREATE TABLE IF NOT EXISTS api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  tier VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Webhook endpoints
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  url VARCHAR(1024) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  event_types TEXT[] NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'failed')),
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook deliveries (for retry logic)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- API Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limits per tier
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(50) NOT NULL UNIQUE,
  requests_per_minute INTEGER NOT NULL DEFAULT 60,
  requests_per_day INTEGER NOT NULL DEFAULT 10000,
  requests_per_month INTEGER NOT NULL DEFAULT 100000,
  concurrent_requests INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rate limits
INSERT INTO rate_limits (tier, requests_per_minute, requests_per_day, requests_per_month, concurrent_requests)
VALUES
  ('free', 15, 1000, 10000, 5),
  ('starter', 60, 10000, 100000, 10),
  ('professional', 300, 100000, 1000000, 25),
  ('enterprise', 1000, 1000000, 10000000, 100)
ON CONFLICT (tier) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_client ON api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_webhooks_client ON webhooks(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';
CREATE INDEX IF NOT EXISTS idx_api_usage_client ON api_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);

-- RLS Policies
ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- API Clients: Admin manages, clients can read own
CREATE POLICY "Admin manage api_clients" ON api_clients
  FOR ALL USING (true);

CREATE POLICY "Clients read own" ON api_clients
  FOR SELECT USING (true);

-- API Keys: Admin manages, clients can read own
CREATE POLICY "Admin manage api_keys" ON api_keys
  FOR ALL USING (true);

CREATE POLICY "Clients read own keys" ON api_keys
  FOR SELECT USING (true);

-- Webhooks: Admin manages, clients can manage own
CREATE POLICY "Admin manage webhooks" ON webhooks
  FOR ALL USING (true);

CREATE POLICY "Clients manage own webhooks" ON webhooks
  FOR ALL USING (true);

-- Webhook deliveries: Admin manages, clients can read own
CREATE POLICY "Admin manage webhook_deliveries" ON webhook_deliveries
  FOR ALL USING (true);

CREATE POLICY "Clients read own deliveries" ON webhook_deliveries
  FOR SELECT USING (true);

-- API Usage: Admin manages, service can insert
CREATE POLICY "Admin manage api_usage" ON api_usage
  FOR ALL USING (true);

CREATE POLICY "Service insert api_usage" ON api_usage
  FOR INSERT WITH CHECK (true);

-- Rate limits: Public read
CREATE POLICY "Public read rate_limits" ON rate_limits
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER api_clients_updated_at
  BEFORE UPDATE ON api_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
