# Birthday Party Lead Tracking - Supabase Schema

## Purpose
Track paid ad leads from Facebook/Zalo ads for Birthday Party bookings.

## Required Table: `birthday_party_leads`

```sql
CREATE TABLE birthday_party_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Lead source tracking
  source TEXT NOT NULL, -- 'facebook', 'zalo', 'organic', 'referral'
  utm_source TEXT, -- 'facebook', 'zalo', 'google'
  utm_medium TEXT, -- 'paid_ad', 'organic', 'social'
  utm_campaign TEXT, -- campaign name for A/B testing

  -- Ad variation tracking (for A/B testing)
  ad_variation TEXT, -- 'variation_a', 'variation_b', 'variation_c'
  ad_set_id TEXT,

  -- Parent information
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_zalo TEXT,
  parent_email TEXT,

  -- Child info
  child_age_group TEXT, -- '6-8', '9-12', '13-16'

  -- Lead status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'booked', 'lost', 'unqualified')),
  contacted_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,

  -- Booking reference (if converted)
  booking_id UUID REFERENCES birthday_party_bookings(id),

  -- Cost tracking (for ROI analysis)
  ad_spend_cents INTEGER,
  cost_per_lead_cents INTEGER,

  -- Notes
  notes TEXT,

  -- Sales agent assigned
  assigned_agent_id UUID REFERENCES auth.users(id)
);

-- Indexes for fast querying
CREATE INDEX idx_leads_source ON birthday_party_leads(source);
CREATE INDEX idx_leads_status ON birthday_party_leads(status);
CREATE INDEX idx_leads_utm_campaign ON birthday_party_leads(utm_campaign);
CREATE INDEX idx_leads_created_at ON birthday_party_leads(created_at);
```

## Required API Endpoints

### 1. Create Lead from Ad (Public)
```
POST /api/birthday-parties/leads
Content-Type: application/json

Body:
{
  "source": "facebook",
  "utm_source": "facebook",
  "utm_medium": "paid_ad",
  "utm_campaign": "birthday_party_april_2026",
  "ad_variation": "variation_a",
  "parent_name": "Nguyễn Văn A",
  "parent_phone": "0912345678",
  "parent_zalo": "0912345678",
  "child_age_group": "9-12"
}

Response: 201 Created
{
  "lead_id": "uuid",
  "message": "Lead captured successfully"
}
```

### 2. Update Lead Status (Internal)
```
PATCH /api/birthday-parties/leads/:id/status
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "status": "contacted",
  "notes": "Called 2 times, no answer"
}

Response: 200 OK
{ "lead": {...} }
```

### 3. Convert Lead to Booking (Internal)
```
POST /api/birthday-parties/leads/:id/convert
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "booking_id": "uuid"
}

Response: 200 OK
```

### 4. Get Lead Statistics (Admin)
```
GET /api/birthday-parties/leads/stats?from_date=2026-04-01&to_date=2026-04-30
Authorization: Bearer <token>

Response:
{
  "total_leads": 25,
  "by_source": { "facebook": 15, "zalo": 10 },
  "by_status": { "new": 5, "contacted": 10, "booked": 5 },
  "conversion_rate": 0.2,
  "cost_per_booking_cents": 150000
}
```

### 5. List Leads (Admin)
```
GET /api/birthday-parties/leads?status=new&limit=20&offset=0
Authorization: Bearer <token>

Response:
{
  "leads": [...],
  "total": 50,
  "page": 1
}
```

## Supabase RLS Policies
- Users with `birthday_parties:write` role can insert/update leads
- Agents can view leads assigned to them
- Admins can view and update all leads

## Metrics to Track
1. Total leads by source (facebook, zalo)
2. Conversion rate by ad variation (A/B test)
3. Cost per lead
4. Time to contact (lead created → first contact)
5. Booking conversion rate
6. Revenue per lead

## Dashboard Queries

### Daily Lead Volume
```sql
SELECT date(created_at) as date, count(*) as leads
FROM birthday_party_leads
WHERE created_at >= now() - interval '30 days'
GROUP BY date(created_at)
ORDER BY date desc;
```

### Lead Quality by Ad Variation
```sql
SELECT ad_variation, count(*) as total,
  count(CASE WHEN status = 'booked' THEN 1 END) as booked,
  round(count(CASE WHEN status = 'booked' THEN 1 END)::numeric / count(*), 2) as conversion_rate
FROM birthday_party_leads
WHERE utm_campaign = 'birthday_party_april_2026'
GROUP BY ad_variation;
```

### Cost Per Lead by Source
```sql
SELECT utm_source, count(*) as leads, avg(cost_per_lead_cents) as avg_cpl
FROM birthday_party_leads
WHERE created_at >= now() - interval '30 days'
  AND cost_per_lead_cents IS NOT NULL
GROUP BY utm_source;
```

## Lead Status Flow
```
new → contacted → qualified → booked
              ↘           ↘
               lost      unqualified
```

## Implementation Notes
- Lead creation should be idempotent (check for duplicate phone within 24h)
- Track UTM parameters from landing page URL
- Auto-assign leads to sales agent using round-robin