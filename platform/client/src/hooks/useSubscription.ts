/**
 * useSubscription Hook
 * Provides reactive subscription state for the current user
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscriptionApi,
  SubscriptionTier,
  UserTierInfo,
  TIER_BENEFITS,
} from '../services/subscriptionApi';

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  tierInfo: UserTierInfo | null;
  isLoading: boolean;
  isPaid: boolean;
  canAccessTier: (requiredTier: SubscriptionTier) => boolean;
  benefits: readonly typeof TIER_BENEFITS[SubscriptionTier];
  refreshTier: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [tierInfo, setTierInfo] = useState<UserTierInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTierInfo = useCallback(async () => {
    if (!user?.id) {
      setTierInfo(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const info = await subscriptionApi.getUserTier(user.id);
      setTierInfo(info);
    } catch (error) {
      console.error('Failed to load tier info:', error);
      // Default to free tier on error
      setTierInfo({
        tier: 'sao_hoa',
        tierExpiresAt: null,
        isTrial: false,
        trialEndsAt: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTierInfo();
  }, [loadTierInfo]);

  const tier = tierInfo?.tier || 'sao_hoa';
  const isPaid = tier === 'moc_tinh';

  const canAccessTier = useCallback(
    (requiredTier: SubscriptionTier): boolean => {
      if (requiredTier === 'sao_hoa') return true;
      if (tier === 'moc_tinh') {
        // Check if tier is still valid
        if (tierInfo?.tierExpiresAt) {
          return new Date(tierInfo.tierExpiresAt) > new Date();
        }
        return true; // No expiry means lifetime
      }
      return false;
    },
    [tier, tierInfo]
  );

  const benefits = TIER_BENEFITS[tier];

  return {
    tier,
    tierInfo,
    isLoading,
    isPaid,
    canAccessTier,
    benefits,
    refreshTier: loadTierInfo,
  };
}

// Subscription modal state management
interface UseSubscriptionModalReturn {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

let globalModalOpen = false;
let globalModalListeners: Array<(isOpen: boolean) => void> = [];

function notifyModalListeners(isOpen: boolean) {
  globalModalOpen = isOpen;
  globalModalListeners.forEach(listener => listener(isOpen));
}

export function useSubscriptionModal(): UseSubscriptionModalReturn {
  const [isModalOpen, setIsModalOpen] = useState(globalModalOpen);

  useEffect(() => {
    const listener = (isOpen: boolean) => setIsModalOpen(isOpen);
    globalModalListeners.push(listener);
    return () => {
      globalModalListeners = globalModalListeners.filter(l => l !== listener);
    };
  }, []);

  const openModal = useCallback(() => notifyModalListeners(true), []);
  const closeModal = useCallback(() => notifyModalListeners(false), []);

  return { isModalOpen, openModal, closeModal };
}

// Export modal opener for non-hook contexts
export function openSubscriptionModal() {
  notifyModalListeners(true);
}

export function closeSubscriptionModal() {
  notifyModalListeners(false);
}

export default useSubscription;
