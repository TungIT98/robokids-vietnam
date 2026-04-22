/**
 * PremiumLockOverlay Component
 * Shows when free user tries to access paid content
 */

import { Link } from 'react-router-dom';
import { useSubscription, useSubscriptionModal } from '../hooks/useSubscription';
import { TIER_BENEFITS } from '../services/subscriptionApi';
import styles from './PremiumLockOverlay.module.css';

interface PremiumLockOverlayProps {
  children: React.ReactNode;
  requiredTier?: 'sao_hoa' | 'moc_tinh';
  showOverlay?: boolean;
}

export function PremiumLockOverlay({
  children,
  requiredTier = 'moc_tinh',
  showOverlay = true,
}: PremiumLockOverlayProps) {
  const { canAccessTier, tier, benefits } = useSubscription();
  const { openModal } = useSubscriptionModal();

  const hasAccess = canAccessTier(requiredTier);

  if (hasAccess || !showOverlay) {
    return <>{children}</>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>{children}</div>
      <div className={styles.overlay}>
        <div className={styles.lockCard}>
          <div className={styles.lockIcon}>🔒</div>
          <h2 className={styles.title}>Nội Dung Cao Cấp</h2>
          <p className={styles.description}>
            Bài học này chỉ dành cho học viên <strong>{TIER_BENEFITS.moc_tinh.nameVi}</strong>.
            Nâng cấp ngay để mở khóa tất cả bài học và tính năng!
          </p>

          <div className={styles.tierComparison}>
            <div className={`${styles.tierCard} ${tier === 'sao_hoa' ? styles.current : ''}`}>
              <span className={styles.tierEmoji}>{TIER_BENEFITS.sao_hoa.emoji}</span>
              <span className={styles.tierName}>{TIER_BENEFITS.sao_hoa.nameVi}</span>
              <span className={styles.tierLabel}>Hiện tại của bạn</span>
            </div>
            <div className={styles.tierArrow}>→</div>
            <div className={`${styles.tierCard} ${styles.upgrade}`}>
              <span className={styles.tierEmoji}>{TIER_BENEFITS.moc_tinh.emoji}</span>
              <span className={styles.tierName}>{TIER_BENEFITS.moc_tinh.nameVi}</span>
              <span className={styles.tierLabel}>Nâng cấp lên</span>
            </div>
          </div>

          <div className={styles.benefitsList}>
            <h4>Bạn sẽ nhận được:</h4>
            <ul>
              {TIER_BENEFITS.moc_tinh.features.map((feature, i) => (
                <li key={i}>✓ {feature}</li>
              ))}
            </ul>
          </div>

          <div className={styles.actions}>
            <button className={styles.upgradeBtn} onClick={openModal}>
              🚀 Nâng Cấp Ngay
            </button>
            <Link to="/upgrade" className={styles.learnMoreBtn}>
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for inline use
interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large';
}

export function PremiumBadge({ size = 'small' }: PremiumBadgeProps) {
  const { tier } = useSubscription();

  if (tier === 'moc_tinh') {
    return (
      <span className={`${styles.badge} ${styles.badgePaid} ${styles[size]}`}>
        {TIER_BENEFITS.moc_tinh.emoji} {TIER_BENEFITS.moc_tinh.nameVi}
      </span>
    );
  }

  return null;
}

// Tier indicator for display
interface TierIndicatorProps {
  showLabel?: boolean;
}

export function TierIndicator({ showLabel = true }: TierIndicatorProps) {
  const { tier, tierInfo, isPaid } = useSubscription();
  const tierData = TIER_BENEFITS[tier];

  return (
    <div className={styles.tierIndicator}>
      <span className={styles.tierIndicatorEmoji}>{tierData.emoji}</span>
      {showLabel && (
        <div className={styles.tierIndicatorText}>
          <span className={styles.tierIndicatorName}>{tierData.nameVi}</span>
          {!isPaid && tierInfo?.tierExpiresAt && (
            <span className={styles.tierIndicatorExpiry}>
              Hết hạn: {new Date(tierInfo.tierExpiresAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default PremiumLockOverlay;
