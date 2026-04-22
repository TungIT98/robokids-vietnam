/**
 * ApiKeysPage - Developer Portal for API Monetization
 * Features: API key CRUD, webhook management, usage stats, API docs
 */

import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive';
  event_types: string[];
  created_at: string;
  secret?: string;
}

interface WebhookDelivery {
  id: string;
  status: string;
  event_type: string;
  response_code: number | null;
  created_at: string;
}

interface UsageStats {
  today: number;
  this_month: number;
  per_day: number;
  per_month: number;
  remaining: number;
  endpoint_breakdown?: Record<string, number>;
}

interface Plan {
  id: string;
  name: string;
  requests_per_day: number;
  requests_per_month: number;
  price_usd: number;
}

const AVAILABLE_EVENTS = [
  { value: 'enrollment.created', label: 'Enrollment Created' },
  { value: 'enrollment.updated', label: 'Enrollment Updated' },
  { value: 'enrollment.cancelled', label: 'Enrollment Cancelled' },
  { value: 'lesson.completed', label: 'Lesson Completed' },
  { value: 'mission.completed', label: 'Mission Completed' },
  { value: 'badge.earned', label: 'Badge Earned' },
  { value: 'level.up', label: 'Level Up' },
  { value: 'streak.updated', label: 'Streak Updated' },
  { value: 'student.registered', label: 'Student Registered' },
  { value: 'course.completed', label: 'Course Completed' },
];

const API_DOCS = [
  {
    section: 'Authentication',
    items: [
      { method: 'POST', endpoint: '/api/public/students', desc: 'List students', auth: 'API Key' },
      { method: 'GET', endpoint: '/api/public/students/:id', desc: 'Get student details', auth: 'API Key' },
    ]
  },
  {
    section: 'Public Data',
    items: [
      { method: 'GET', endpoint: '/api/public/courses', desc: 'List all courses', auth: 'None' },
      { method: 'GET', endpoint: '/api/public/lessons', desc: 'List lessons', auth: 'None' },
      { method: 'GET', endpoint: '/api/public/lessons/:id', desc: 'Get lesson details', auth: 'None' },
    ]
  },
  {
    section: 'Enrollments',
    items: [
      { method: 'GET', endpoint: '/api/public/enrollments', desc: 'List enrollments', auth: 'API Key' },
      { method: 'GET', endpoint: '/api/public/enrollments/:id', desc: 'Get enrollment details', auth: 'API Key' },
    ]
  },
  {
    section: 'Usage',
    items: [
      { method: 'GET', endpoint: '/api/public/usage', desc: 'Get your API usage stats', auth: 'API Key' },
      { method: 'GET', endpoint: '/api/public/rate-limits', desc: 'View rate limit tiers', auth: 'API Key' },
    ]
  },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'usage' | 'docs' | 'register'>('keys');
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  const [showWebhookDetailModal, setShowWebhookDetailModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDelivery[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', plan: 'free' });
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', event_types: [] });
  const [testWebhookResult, setTestWebhookResult] = useState<string | null>(null);

  useEffect(() => {
    checkRegistration();
    loadData();
    loadPlans();
  }, []);

  const checkRegistration = async () => {
    try {
      const token = localStorage.getItem('robokids_token');
      const res = await fetch(`${API_BASE}/api/webhooks/clients/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsRegistered(res.ok);
    } catch {
      setIsRegistered(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('robokids_token');

      const [keysRes, hooksRes, usageRes] = await Promise.all([
        fetch(`${API_BASE}/api/webhooks/clients/api-keys`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/webhooks/endpoints`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/public/usage`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.api_keys || []);
      }
      if (hooksRes.ok) {
        const data = await hooksRes.json();
        setWebhooks(data.webhooks || []);
      }
      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data.usage);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('robokids_token');
      const res = await fetch(`${API_BASE}/api/public/rate-limits`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.tiers || []);
      }
    } catch {
      // silently fail
    }
  };

  const registerDeveloper = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('robokids_token');

      // The registration endpoint needs admin privileges - notify user
      // In production, this would call a self-service registration endpoint
      const res = await fetch(`${API_BASE}/api/webhooks/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(registerForm),
      });

      if (res.status === 401 || res.status === 403) {
        // Not registered as API client yet - contact admin
        setError('Developer registration requires admin approval. Please contact support@robokids.vn');
      } else if (res.ok) {
        setIsRegistered(true);
        loadData();
      } else {
        const err = await res.json();
        setError(err.error || 'Registration failed');
      }
    } catch {
      setError('Registration failed - please try again');
    }
  };

  const createApiKey = async () => {
    try {
      const token = localStorage.getItem('robokids_token');
      const body: any = { name: newKeyName };
      if (newKeyExpiry) body.expires_at = new Date(newKeyExpiry).toISOString();

      const res = await fetch(`${API_BASE}/api/webhooks/clients/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.api_key.key);
        loadData();
      }
    } catch {
      setError('Failed to create API key');
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      const token = localStorage.getItem('robokids_token');
      const res = await fetch(`${API_BASE}/api/webhooks/clients/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadData();
    } catch {
      setError('Failed to revoke API key');
    }
  };

  const createWebhook = async () => {
    try {
      const token = localStorage.getItem('robokids_token');
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newWebhook),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.webhook?.secret || 'Webhook created');
        setShowCreateWebhookModal(false);
        setNewWebhook({ name: '', url: '', event_types: [] });
        loadData();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to create webhook');
      }
    } catch {
      setError('Failed to create webhook');
    }
  };

  const updateWebhook = async () => {
    if (!editingWebhook) return;
    try {
      const token = localStorage.getItem('robokids_token');
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints/${editingWebhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editingWebhook.name, event_types: editingWebhook.event_types }),
      });

      if (res.ok) {
        setEditingWebhook(null);
        loadData();
      } else {
        setError('Failed to update webhook');
      }
    } catch {
      setError('Failed to update webhook');
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      const token = localStorage.getItem('robokids_token');
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints/${webhookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSelectedWebhook(null);
        setShowWebhookDetailModal(false);
        loadData();
      }
    } catch {
      setError('Failed to delete webhook');
    }
  };

  const toggleWebhookStatus = async (webhook: Webhook) => {
    try {
      const token = localStorage.getItem('robokids_token');
      const newStatus = webhook.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints/${webhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) loadData();
    } catch {
      setError('Failed to toggle webhook status');
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      setTestWebhookResult(null);
      const token = localStorage.getItem('robokids_token');
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints/${webhookId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTestWebhookResult(data.message || (data.triggered ? 'Test delivered!' : 'No active webhook receivers'));
    } catch {
      setTestWebhookResult('Test failed');
    }
  };

  const viewWebhookDetails = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setShowWebhookDetailModal(true);
    // Load deliveries
    try {
      const token = localStorage.getItem('robokids_token');
      const res = await fetch(`${API_BASE}/api/webhooks/endpoints/${webhook.id}/deliveries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWebhookDeliveries(data.deliveries || []);
      }
    } catch {
      setWebhookDeliveries([]);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const usagePercent = usage ? Math.min(100, (usage.today / usage.per_day) * 100) : 0;

  if (isRegistered === null) {
    return <div style={styles.container}><div style={styles.loadingState}>Loading...</div></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Developer Portal</h1>
          <p style={styles.pageSubtitle}>Manage API keys, webhooks, and view usage</p>
        </div>
        {!isRegistered && (
          <button style={styles.registerBtn} onClick={() => setActiveTab('register')}>
            Register as Developer
          </button>
        )}
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(activeTab === 'keys' ? styles.tabActive : {}) }} onClick={() => setActiveTab('keys')}>
          Keys ({apiKeys.length})
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'webhooks' ? styles.tabActive : {}) }} onClick={() => setActiveTab('webhooks')}>
          Webhooks ({webhooks.length})
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'usage' ? styles.tabActive : {}) }} onClick={() => setActiveTab('usage')}>
          Usage
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'docs' ? styles.tabActive : {}) }} onClick={() => setActiveTab('docs')}>
          API Docs
        </button>
        {!isRegistered && (
          <button style={{ ...styles.tab, ...(activeTab === 'register' ? styles.tabActive : {}) }} onClick={() => setActiveTab('register')}>
            Register
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={styles.loadingState}>Loading...</div>
      ) : !isRegistered && activeTab === 'register' ? (
        <div style={styles.content}>
          <div style={styles.registerForm}>
            <h2 style={{ color: '#fff', marginBottom: '24px' }}>Register as API Developer</h2>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Developer Name *</label>
              <input
                style={styles.formInput}
                value={registerForm.name}
                onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                placeholder="Your company or app name"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Email *</label>
              <input
                style={styles.formInput}
                type="email"
                value={registerForm.email}
                onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder="developer@company.com"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>Plan</label>
              <div style={styles.planGrid}>
                <div style={{ ...styles.planCard, borderColor: registerForm.plan === 'free' ? '#8b5cf6' : 'transparent' }}
                     onClick={() => setRegisterForm({ ...registerForm, plan: 'free' })}>
                  <div style={styles.planName}>Free</div>
                  <div style={styles.planLimit}>1,000 req/day</div>
                  <div style={styles.planPrice}>$0/mo</div>
                </div>
                <div style={{ ...styles.planCard, borderColor: registerForm.plan === 'developer' ? '#8b5cf6' : 'transparent' }}
                     onClick={() => setRegisterForm({ ...registerForm, plan: 'developer' })}>
                  <div style={styles.planName}>Developer</div>
                  <div style={styles.planLimit}>10,000 req/day</div>
                  <div style={styles.planPrice}>$29/mo</div>
                </div>
                <div style={{ ...styles.planCard, borderColor: registerForm.plan === 'business' ? '#8b5cf6' : 'transparent' }}
                     onClick={() => setRegisterForm({ ...registerForm, plan: 'business' })}>
                  <div style={styles.planName}>Business</div>
                  <div style={styles.planLimit}>100,000 req/day</div>
                  <div style={styles.planPrice}>$99/mo</div>
                </div>
              </div>
            </div>
            <button
              style={styles.submitBtn}
              onClick={registerDeveloper}
              disabled={!registerForm.name.trim() || !registerForm.email.trim()}
            >
              Register
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* API Keys Tab */}
          {activeTab === 'keys' && (
            <div style={styles.content}>
              <div style={styles.sectionHeader}>
                <p style={styles.sectionDesc}>API keys allow external services to access RoboKids API on your behalf.</p>
                <button style={styles.createBtn} onClick={() => setShowCreateKeyModal(true)}>+ Create Key</button>
              </div>

              {apiKeys.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🔑</div>
                  <p>No API keys created yet</p>
                </div>
              ) : (
                <div style={styles.table}>
                  <div style={styles.tableHeader}>
                    <div style={{ ...styles.col, flex: 2 }}>Name</div>
                    <div style={{ ...styles.col, flex: 1.5 }}>Key Prefix</div>
                    <div style={{ ...styles.col, flex: 1 }}>Created</div>
                    <div style={{ ...styles.col, flex: 1 }}>Expires</div>
                    <div style={{ ...styles.col, flex: 1 }}>Last Used</div>
                    <div style={{ ...styles.col, flex: 1 }}>Actions</div>
                  </div>
                  {apiKeys.map(key => (
                    <div key={key.id} style={styles.tableRow}>
                      <div style={{ ...styles.col, flex: 2 }}><span style={styles.keyName}>{key.name}</span></div>
                      <div style={{ ...styles.col, flex: 1.5 }}><code style={styles.keyPrefix}>{key.key_prefix}...</code></div>
                      <div style={{ ...styles.col, flex: 1 }}>{formatDate(key.created_at)}</div>
                      <div style={{ ...styles.col, flex: 1 }}>{key.expires_at ? formatDate(key.expires_at) : 'Never'}</div>
                      <div style={{ ...styles.col, flex: 1 }}>{formatDate(key.last_used_at)}</div>
                      <div style={{ ...styles.col, flex: 1 }}>
                        <button style={styles.revokeBtn} onClick={() => revokeApiKey(key.id)}>Revoke</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div style={styles.content}>
              <div style={styles.sectionHeader}>
                <p style={styles.sectionDesc}>Webhooks let external services receive real-time event notifications.</p>
                <button style={styles.createBtn} onClick={() => setShowCreateWebhookModal(true)}>+ Create Webhook</button>
              </div>

              {webhooks.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🪝</div>
                  <p>No webhooks configured yet</p>
                </div>
              ) : (
                <div style={styles.webhookCards}>
                  {webhooks.map(webhook => (
                    <div key={webhook.id} style={styles.webhookCard}>
                      <div style={styles.webhookHeader}>
                        <span style={styles.webhookName}>{webhook.name}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <label style={styles.toggle}>
                            <input type="checkbox" checked={webhook.status === 'active'} onChange={() => toggleWebhookStatus(webhook)} />
                            <span style={{ ...styles.toggleTrack, backgroundColor: webhook.status === 'active' ? '#22c55e' : '#6b7280' }}></span>
                          </label>
                          <span style={{ ...styles.webhookStatus, backgroundColor: webhook.status === 'active' ? '#22c55e' : '#6b7280' }}>
                            {webhook.status}
                          </span>
                        </div>
                      </div>
                      <div style={styles.webhookUrl}>{webhook.url}</div>
                      <div style={styles.webhookEvents}>
                        {webhook.event_types.map(event => (
                          <span key={event} style={styles.eventBadge}>{event}</span>
                        ))}
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                        <button style={styles.smallBtn} onClick={() => { setEditingWebhook(webhook); setNewWebhook({ name: webhook.name, url: webhook.url, event_types: webhook.event_types }); setShowCreateWebhookModal(true); }}>Edit</button>
                        <button style={styles.smallBtn} onClick={() => testWebhook(webhook.id)}>Test</button>
                        <button style={styles.smallBtn} onClick={() => viewWebhookDetails(webhook)}>Deliveries</button>
                        <button style={{ ...styles.smallBtn, backgroundColor: '#dc2626' }} onClick={() => deleteWebhook(webhook.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div style={styles.content}>
              {usage ? (
                <>
                  <div style={styles.usageGrid}>
                    <div style={styles.usageCard}>
                      <div style={styles.usageLabel}>Today</div>
                      <div style={styles.usageValue}>{usage.today.toLocaleString()}</div>
                      <div style={styles.usageLimit}>Limit: {usage.per_day.toLocaleString()}/day</div>
                    </div>
                    <div style={styles.usageCard}>
                      <div style={styles.usageLabel}>This Month</div>
                      <div style={styles.usageValue}>{usage.this_month.toLocaleString()}</div>
                      <div style={styles.usageLimit}>Limit: {usage.per_month.toLocaleString()}/month</div>
                    </div>
                    <div style={styles.usageCard}>
                      <div style={styles.usageLabel}>Remaining</div>
                      <div style={{ ...styles.usageValue, color: '#22c55e' }}>{usage.remaining.toLocaleString()}</div>
                      <div style={styles.usageLimit}>requests</div>
                    </div>
                  </div>

                  {/* Daily usage bar */}
                  <div style={styles.usageSection}>
                    <h3 style={styles.sectionTitle}>Daily Usage</h3>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${usagePercent}%`, backgroundColor: usagePercent > 80 ? '#ef4444' : '#8b5cf6' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ color: '#71717a', fontSize: '12px' }}>{usage.today} used</span>
                      <span style={{ color: '#71717a', fontSize: '12px' }}>{usage.per_day - usage.today} remaining</span>
                    </div>
                  </div>

                  {/* Endpoint breakdown */}
                  {usage.endpoint_breakdown && Object.keys(usage.endpoint_breakdown).length > 0 && (
                    <div style={styles.usageSection}>
                      <h3 style={styles.sectionTitle}>Requests by Endpoint (Today)</h3>
                      <div style={styles.endpointList}>
                        {Object.entries(usage.endpoint_breakdown).map(([endpoint, count]) => (
                          <div key={endpoint} style={styles.endpointRow}>
                            <code style={styles.endpointCode}>{endpoint}</code>
                            <span style={styles.endpointCount}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📊</div>
                  <p>Unable to load usage statistics</p>
                </div>
              )}
            </div>
          )}

          {/* API Docs Tab */}
          {activeTab === 'docs' && (
            <div style={styles.content}>
              <div style={styles.docsSection}>
                <h2 style={{ color: '#fff', marginBottom: '24px' }}>API Documentation</h2>
                <p style={{ color: '#71717a', marginBottom: '32px' }}>Base URL: <code style={{ color: '#8b5cf6' }}>{API_BASE}</code></p>

                {API_DOCS.map(section => (
                  <div key={section.section} style={styles.docsCategory}>
                    <h3 style={styles.docsCategoryTitle}>{section.section}</h3>
                    <div style={styles.docsTable}>
                      <div style={styles.docsTableHeader}>
                        <div style={{ flex: '0.5' }}>Method</div>
                        <div style={{ flex: 2 }}>Endpoint</div>
                        <div style={{ flex: 1.5 }}>Description</div>
                        <div style={{ flex: 1 }}>Auth</div>
                      </div>
                      {section.items.map((item, i) => (
                        <div key={i} style={styles.docsTableRow}>
                          <div style={{ flex: '0.5' }}>
                            <span style={{
                              ...styles.methodBadge,
                              backgroundColor: item.method === 'GET' ? '#22c55e' : item.method === 'POST' ? '#3b82f6' : '#f59e0b'
                            }}>{item.method}</span>
                          </div>
                          <div style={{ flex: 2 }}><code style={styles.endpointCode}>{item.endpoint}</code></div>
                          <div style={{ flex: 1.5, color: '#a1a1aa' }}>{item.desc}</div>
                          <div style={{ flex: 1 }}>
                            <span style={{ ...styles.authBadge, backgroundColor: item.auth === 'None' ? '#374151' : '#8b5cf6' }}>{item.auth}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Code examples */}
                <div style={styles.docsCategory}>
                  <h3 style={styles.docsCategoryTitle}>Code Examples</h3>
                  <div style={styles.codeBlock}>
                    <div style={styles.codeHeader}>JavaScript (fetch)</div>
                    <pre style={styles.code}>{`// List students
fetch('${API_BASE}/api/public/students', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));`}</pre>
                  </div>
                  <div style={styles.codeBlock}>
                    <div style={styles.codeHeader}>Python (requests)</div>
                    <pre style={styles.code}>{`import requests

# List courses (no auth required)
response = requests.get('${API_BASE}/api/public/courses')
courses = response.json()

# Authenticated request
headers = {'Authorization': 'Bearer YOUR_API_KEY'}
students = requests.get('${API_BASE}/api/public/students', headers=headers).json()`}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Key Modal */}
      {showCreateKeyModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Create New API Key</h2>
            {createdKey ? (
              <div style={styles.keyCreated}>
                <p style={styles.keyWarning}>⚠️ Copy this key now. You won't be able to see it again.</p>
                <code style={styles.createdKey}>{createdKey}</code>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(createdKey); }}>📋 Copy</button>
                  <button style={styles.closeBtn} onClick={() => { setShowCreateKeyModal(false); setCreatedKey(null); }}>Done</button>
                </div>
              </div>
            ) : (
              <>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Key Name *</label>
                  <input style={styles.formInput} value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g., Production App" />
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Expires At (optional)</label>
                  <input style={styles.formInput} type="date" value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)} />
                </div>
                <div style={styles.modalActions}>
                  <button style={styles.cancelBtn} onClick={() => setShowCreateKeyModal(false)}>Cancel</button>
                  <button style={styles.submitBtn} onClick={createApiKey} disabled={!newKeyName.trim()}>Create Key</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Webhook Modal */}
      {showCreateWebhookModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}</h2>

            {createdKey && editingWebhook === null ? (
              <div style={styles.keyCreated}>
                <p style={{ ...styles.keyWarning, backgroundColor: '#dcfce7', color: '#166534' }}>✓ Webhook created! Save this secret:</p>
                <code style={styles.createdKey}>{createdKey}</code>
                <button style={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(createdKey); }}>📋 Copy</button>
                <button style={styles.closeBtn} onClick={() => { setShowCreateWebhookModal(false); setCreatedKey(null); }}>Done</button>
              </div>
            ) : (
              <>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Webhook Name *</label>
                  <input style={styles.formInput} value={editingWebhook ? editingWebhook.name : newWebhook.name}
                    onChange={e => editingWebhook ? setEditingWebhook({ ...editingWebhook, name: e.target.value }) : setNewWebhook({ ...newWebhook, name: e.target.value })}
                    placeholder="e.g., My App Events" />
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Endpoint URL *</label>
                  <input style={styles.formInput} value={editingWebhook ? editingWebhook.url : newWebhook.url}
                    onChange={e => editingWebhook ? setEditingWebhook({ ...editingWebhook, url: e.target.value }) : setNewWebhook({ ...newWebhook, url: e.target.value })}
                    placeholder="https://your-app.com/webhook" disabled={!!editingWebhook} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Events *</label>
                  <div style={styles.eventGrid}>
                    {AVAILABLE_EVENTS.map(event => {
                      const selected = editingWebhook ? editingWebhook.event_types : newWebhook.event_types;
                      const isSelected = selected.includes(event.value);
                      return (
                        <label key={event.value} style={{ ...styles.eventCheckbox, backgroundColor: isSelected ? '#8b5cf6' : '#0f0f23' }}
                               onClick={() => {
                                 if (editingWebhook) {
                                   const newTypes = isSelected ? editingWebhook.event_types.filter(t => t !== event.value) : [...editingWebhook.event_types, event.value];
                                   setEditingWebhook({ ...editingWebhook, event_types: newTypes });
                                 } else {
                                   const newTypes = isSelected ? newWebhook.event_types.filter(t => t !== event.value) : [...newWebhook.event_types, event.value];
                                   setNewWebhook({ ...newWebhook, event_types: newTypes });
                                 }
                               }}>
                          <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ display: 'none' }} />
                          {event.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div style={styles.modalActions}>
                  <button style={styles.cancelBtn} onClick={() => { setShowCreateWebhookModal(false); setEditingWebhook(null); setNewWebhook({ name: '', url: '', event_types: [] }); setCreatedKey(null); }}>Cancel</button>
                  <button style={styles.submitBtn} onClick={() => editingWebhook ? updateWebhook() : createWebhook()}
                    disabled={!(editingWebhook ? editingWebhook.name.trim() : newWebhook.name.trim()) || !(editingWebhook ? editingWebhook.event_types.length : newWebhook.event_types.length)}>
                    {editingWebhook ? 'Update' : 'Create'} Webhook
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Webhook Detail Modal */}
      {showWebhookDetailModal && selectedWebhook && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={styles.modalTitle}>{selectedWebhook.name} - Deliveries</h2>
              <button onClick={() => { setShowWebhookDetailModal(false); setSelectedWebhook(null); }} style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            {testWebhookResult && (
              <div style={{ ...styles.keyWarning, backgroundColor: testWebhookResult.includes('delivered') ? '#dcfce7' : '#fef3c7', color: testWebhookResult.includes('delivered') ? '#166534' : '#92400e', marginBottom: '16px' }}>
                {testWebhookResult}
              </div>
            )}
            {webhookDeliveries.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📦</div>
                <p>No deliveries yet</p>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {webhookDeliveries.map(delivery => (
                  <div key={delivery.id} style={styles.deliveryRow}>
                    <div>
                      <span style={{ ...styles.statusDot, backgroundColor: getStatusColor(delivery.status) }}></span>
                      <span style={{ color: '#fff', marginLeft: '8px' }}>{delivery.event_type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {delivery.response_code && (
                        <span style={{ ...styles.codeTag, backgroundColor: delivery.response_code < 400 ? '#22c55e' : '#ef4444' }}>
                          {delivery.response_code}
                        </span>
                      )}
                      <span style={{ color: '#71717a', fontSize: '12px' }}>{formatDate(delivery.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#0f0f23', color: '#e4e4e7', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  pageTitle: { fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#fff' },
  pageSubtitle: { fontSize: '14px', color: '#a1a1aa', margin: '4px 0 0' },
  registerBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  errorBanner: { backgroundColor: '#ef4444', color: 'white', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #2d2d5a', paddingBottom: '8px', flexWrap: 'wrap' },
  tab: { backgroundColor: 'transparent', color: '#a1a1aa', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' },
  tabActive: { backgroundColor: '#8b5cf6', color: 'white' },
  loadingState: { textAlign: 'center', padding: '60px', color: '#71717a' },
  content: { backgroundColor: '#1e1e3f', borderRadius: '12px', padding: '20px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  sectionDesc: { color: '#71717a', fontSize: '14px', margin: 0 },
  createBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#71717a' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  table: { backgroundColor: '#0f0f23', borderRadius: '8px', overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '12px 16px', fontWeight: 600, fontSize: '13px', color: '#71717a', borderBottom: '1px solid #2d2d5a' },
  tableRow: { display: 'flex', padding: '14px 16px', borderBottom: '1px solid #2d2d5a', alignItems: 'center' },
  col: { display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '14px' },
  keyName: { fontWeight: 600, color: '#fff' },
  keyPrefix: { backgroundColor: '#2d2d5a', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#a1a1aa' },
  revokeBtn: { backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' },
  webhookCards: { display: 'grid', gap: '16px' },
  webhookCard: { backgroundColor: '#0f0f23', borderRadius: '8px', padding: '16px' },
  webhookHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  webhookName: { fontWeight: 600, color: '#fff' },
  webhookStatus: { padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: 'white' },
  webhookUrl: { fontSize: '12px', color: '#71717a', marginBottom: '12px', wordBreak: 'break-all' },
  webhookEvents: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  eventBadge: { backgroundColor: '#2d2d5a', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#a1a1aa' },
  usageGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  usageCard: { backgroundColor: '#0f0f23', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  usageLabel: { fontSize: '14px', color: '#71717a', marginBottom: '8px' },
  usageValue: { fontSize: '32px', fontWeight: 'bold', color: '#fff' },
  usageLimit: { fontSize: '12px', color: '#71717a', marginTop: '8px' },
  usageSection: { marginTop: '24px' },
  sectionTitle: { color: '#fff', fontSize: '16px', marginBottom: '12px' },
  progressBar: { height: '8px', backgroundColor: '#2d2d5a', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
  endpointList: { display: 'grid', gap: '8px' },
  endpointRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f0f23', padding: '12px 16px', borderRadius: '8px' },
  endpointCode: { fontSize: '13px', color: '#8b5cf6' },
  endpointCount: { fontWeight: 600, color: '#fff' },
  docsSection: { maxWidth: '900px' },
  docsCategory: { marginBottom: '32px' },
  docsCategoryTitle: { color: '#fff', fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid #2d2d5a', paddingBottom: '8px' },
  docsTable: { backgroundColor: '#0f0f23', borderRadius: '8px', overflow: 'hidden' },
  docsTableHeader: { display: 'flex', padding: '12px 16px', fontWeight: 600, fontSize: '13px', color: '#71717a', borderBottom: '1px solid #2d2d5a' },
  docsTableRow: { display: 'flex', padding: '14px 16px', borderBottom: '1px solid #2d2d5a', alignItems: 'center' },
  methodBadge: { padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'white' },
  authBadge: { padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: 'white' },
  codeBlock: { backgroundColor: '#0f0f23', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' },
  codeHeader: { backgroundColor: '#2d2d5a', padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#a1a1aa' },
  code: { padding: '16px', margin: 0, fontSize: '13px', color: '#e4e4e7', overflowX: 'auto', whiteSpace: 'pre' },
  registerForm: { maxWidth: '500px' },
  formField: { marginBottom: '16px' },
  formLabel: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#a1a1aa', marginBottom: '6px' },
  formInput: { width: '100%', backgroundColor: '#0f0f23', border: '1px solid #3f3f5a', borderRadius: '8px', padding: '10px 14px', color: '#e4e4e7', fontSize: '14px', boxSizing: 'border-box' },
  planGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  planCard: { backgroundColor: '#0f0f23', border: '2px solid transparent', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' },
  planName: { fontWeight: 600, color: '#fff', marginBottom: '4px' },
  planLimit: { fontSize: '12px', color: '#71717a', marginBottom: '8px' },
  planPrice: { fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' },
  submitBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' },
  cancelBtn: { backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#1e1e3f', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: '20px', fontWeight: 'bold', color: '#fff', margin: '0 0 20px' },
  keyCreated: { textAlign: 'center' },
  keyWarning: { backgroundColor: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' },
  createdKey: { display: 'block', backgroundColor: '#0f0f23', padding: '16px', borderRadius: '8px', fontSize: '13px', wordBreak: 'break-all', marginBottom: '16px', fontFamily: 'monospace' },
  copyBtn: { backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', marginRight: '8px' },
  closeBtn: { backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' },
  toggle: { position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' },
  toggleTrack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '10px', transition: 'background-color 0.2s' },
  smallBtn: { backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' },
  eventGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  eventCheckbox: { padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#a1a1aa', border: '1px solid #2d2d5a' },
  deliveryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #2d2d5a' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
  codeTag: { padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'white' },
};