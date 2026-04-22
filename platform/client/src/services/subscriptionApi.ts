/**
 * Subscription API Service
 * Handles subscription tiers: Sao Hỏa (free) and Mộc Tinh (paid)
 */

import { pocketbase, isPocketBaseConfigured } from './pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export type SubscriptionTier = 'sao_hoa' | 'moc_tinh';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface SubscriptionPlan {
  id: string;
  planCode: SubscriptionTier;
  name: string;
  nameVi: string;
  priceCents: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null;
  subscriptionId: string | null;
  autoRenew: boolean;
}

export interface UserTierInfo {
  tier: SubscriptionTier;
  tierExpiresAt: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
}

// Default tier benefits for display
export const TIER_BENEFITS = {
  sao_hoa: {
    planCode: 'sao_hoa',
    name: 'Sao Hỏa',
    nameVi: 'Sao Hỏa',
    color: '#94a3b8',
    emoji: '🔴',
    features: [
      '3 bài học cơ bản',
      '2 mission',
      'Có quảng cáo',
      'Bảng xếp hạng cơ bản',
    ],
  },
  moc_tinh: {
    planCode: 'moc_tinh',
    name: 'Mộc Tinh',
    nameVi: 'Mộc Tinh',
    color: '#f59e0b',
    emoji: '🟠',
    features: [
      'Tất cả bài học',
      'Tất cả mission',
      'Không quảng cáo',
      'Hỗ trợ ưu tiên',
      'Tham gia thi đấu',
      'RoboBuddy AI tutor',
    ],
  },
} as const;

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  return data;
}

export const subscriptionApi = {
  // Get subscription plans
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const result = await pocketbase.collection('subscription_plans').getList(1, 10, {
          filter: 'is_active=true',
        });
        return result.items.map((item: any) => ({
          id: item.id,
          planCode: item.plan_code,
          name: item.name,
          nameVi: item.name_vi || item.name,
          priceCents: item.price_cents,
          billingCycle: item.billing_cycle,
          features: item.features || [],
          isActive: item.is_active,
        }));
      } catch (e) {
        console.warn('Failed to fetch subscription plans:', e);
        return [];
      }
    }

    const response = await fetch(`${API_BASE}/api/subscriptions/plans`);
    return handleResponse<SubscriptionPlan[]>(response);
  },

  // Get user's current subscription
  getSubscription: async (userId: string): Promise<UserSubscription | null> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const result = await pocketbase.collection('user_subscriptions').getList(1, 1, {
          filter: `user_id='${userId}' && status='active'`,
          sort: '-created',
        });
        if (result.items.length === 0) return null;

        const item = result.items[0];
        return {
          id: item.id,
          userId: item.user_id,
          tier: item.tier,
          status: item.status,
          startedAt: item.started_at,
          expiresAt: item.expires_at,
          subscriptionId: item.subscription_id,
          autoRenew: item.auto_renew,
        };
      } catch (e) {
        console.warn('Failed to fetch subscription:', e);
        return null;
      }
    }

    const response = await fetch(`${API_BASE}/api/subscriptions/current`, {
      credentials: 'include',
    });
    if (!response.ok) return null;
    return handleResponse<UserSubscription>(response);
  },

  // Get user's tier info (from users collection)
  getUserTier: async (userId: string): Promise<UserTierInfo> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const user = await pocketbase.collection('users').getOne(userId);
        return {
          tier: user.tier || 'sao_hoa',
          tierExpiresAt: user.tier_expires_at || null,
          isTrial: user.is_trial || false,
          trialEndsAt: user.trial_ends_at || null,
        };
      } catch (e) {
        console.warn('Failed to fetch user tier:', e);
        return {
          tier: 'sao_hoa',
          tierExpiresAt: null,
          isTrial: false,
          trialEndsAt: null,
        };
      }
    }

    const response = await fetch(`${API_BASE}/api/users/${userId}/tier`, {
      credentials: 'include',
    });
    return handleResponse<UserTierInfo>(response);
  },

  // Create subscription (initialize payment flow)
  createSubscription: async (
    userId: string,
    planCode: SubscriptionTier,
    paymentMethod: string
  ): Promise<{ subscriptionId: string; checkoutUrl?: string }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const subscription = await pocketbase.collection('user_subscriptions').create({
          user_id: userId,
          tier: planCode,
          status: 'active',
          started_at: new Date().toISOString(),
          subscription_id: paymentMethod,
          auto_renew: false,
        });
        return { subscriptionId: subscription.id };
      } catch (e) {
        console.error('Failed to create subscription:', e);
        throw e;
      }
    }

    const response = await fetch(`${API_BASE}/api/subscriptions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ planCode, paymentMethod }),
    });
    return handleResponse(response);
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId: string): Promise<void> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        await pocketbase.collection('user_subscriptions').update(subscriptionId, {
          status: 'cancelled',
        });
        return;
      } catch (e) {
        console.error('Failed to cancel subscription:', e);
        throw e;
      }
    }

    const response = await fetch(`${API_BASE}/api/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Cancel failed');
  },

  // Check if user can access content based on tier
  canAccessContent: async (
    userId: string,
    requiredTier: SubscriptionTier
  ): Promise<boolean> => {
    if (requiredTier === 'sao_hoa') return true;

    if (isPocketBaseConfigured() && pocketbase) {
      try {
        const user = await pocketbase.collection('users').getOne(userId);
        const userTier = user.tier || 'sao_hoa';

        if (userTier === 'moc_tinh') {
          // Check if tier has expired
          if (user.tier_expires_at) {
            const expiresAt = new Date(user.tier_expires_at);
            if (expiresAt < new Date()) {
              return false;
            }
          }
          return true;
        }
        return false;
      } catch (e) {
        console.warn('Failed to check content access:', e);
        return false;
      }
    }

    const response = await fetch(
      `${API_BASE}/api/subscriptions/can-access?required_tier=${requiredTier}`,
      { credentials: 'include' }
    );
    if (!response.ok) return false;
    const data = await response.json();
    return data.canAccess;
  },
};

// Tier comparison helper
export function compareTiers(userTier: SubscriptionTier, requiredTier: SubscriptionTier): number {
  const tierRank = { sao_hoa: 1, moc_tinh: 2 };
  return tierRank[userTier] - tierRank[requiredTier];
}

export function isTierValid(tierExpiresAt: string | null): boolean {
  if (!tierExpiresAt) return true; // Lifetime or free tier
  return new Date(tierExpiresAt) > new Date();
}
