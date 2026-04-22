/**
 * UpgradePage - Tier comparison and subscription upgrade flow
 * Shows Sao Hỏa (free) vs Mộc Tinh (paid) comparison
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, useSubscriptionModal } from '../hooks/useSubscription';
import { TIER_BENEFITS, subscriptionApi, SubscriptionTier } from '../services/subscriptionApi';
import { useAuth } from '../context/AuthContext';

export default function UpgradePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, isPaid, isLoading } = useSubscription();
  const { openModal } = useSubscriptionModal();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('moc_tinh');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      // Open subscription modal to handle payment flow
      openModal();
    } catch (error) {
      console.error('Failed to initiate upgrade:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isPaid) {
    return (
      <div style={styles.container}>
        <div style={styles.currentTierCard}>
          <div style={styles.checkIcon}>✅</div>
          <h1 style={styles.alreadyPaidTitle}>Bạn đã là thành viên Mộc Tinh!</h1>
          <p style={styles.alreadyPaidDesc}>
            Cảm ơn bạn đã ủng hộ RoboKids Vietnam. Hãy tận hưởng tất cả các tính năng cao cấp!
          </p>
          <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
            ← Quay lại Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🚀 Nâng Cấp Tài Khoản</h1>
        <p style={styles.subtitle}>
          Mở khóa tất cả bài học, nhiệm vụ đặc biệt và tính năng cao cấp
        </p>
      </div>

      {/* Tier comparison cards */}
      <div style={styles.tierGrid}>
        {/* Sao Hỏa (Free) */}
        <div style={{ ...styles.tierCard, ...styles.freeTier }}>
          <div style={styles.tierHeader}>
            <span style={styles.tierEmoji}>{TIER_BENEFITS.sao_hoa.emoji}</span>
            <h2 style={styles.tierName}>{TIER_BENEFITS.sao_hoa.nameVi}</h2>
            <p style={styles.tierPrice}>Miễn phí</p>
          </div>
          <ul style={styles.benefitsList}>
            {TIER_BENEFITS.sao_hoa.features.map((feature, i) => (
              <li key={i} style={styles.benefitItem}>✓ {feature}</li>
            ))}
          </ul>
          <div style={styles.currentBadge}>Gói hiện tại của bạn</div>
        </div>

        {/* Mộc Tinh (Paid) */}
        <div style={{ ...styles.tierCard, ...styles.paidTier }}>
          <div style={styles.popularBadge}>⭐ PHỔ BIẾN NHẤT</div>
          <div style={styles.tierHeader}>
            <span style={styles.tierEmoji}>{TIER_BENEFITS.moc_tinh.emoji}</span>
            <h2 style={styles.tierName}>{TIER_BENEFITS.moc_tinh.nameVi}</h2>
            <p style={styles.tierPrice}>
              <span style={styles.priceValue}>199.000đ</span>
              <span style={styles.pricePeriod}>/tháng</span>
            </p>
          </div>
          <ul style={styles.benefitsList}>
            {TIER_BENEFITS.moc_tinh.features.map((feature, i) => (
              <li key={i} style={{ ...styles.benefitItem, ...styles.paidBenefit }}>✓ {feature}</li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={isProcessing}
            style={styles.upgradeButton}
          >
            {isProcessing ? '⏳ Đang xử lý...' : '🚀 Nâng Cấp Ngay'}
          </button>
          <p style={styles.guarantee}>✓ Bảo đảm hoàn tiền trong 7 ngày</p>
        </div>
      </div>

      {/* Feature comparison table */}
      <div style={styles.comparisonSection}>
        <h2 style={styles.comparisonTitle}>So Sánh Chi Tiết</h2>
        <div style={styles.comparisonTable}>
          <div style={styles.tableHeader}>
            <div style={styles.featureCol}>Tính năng</div>
            <div style={styles.freeCol}>Sao Hỏa</div>
            <div style={styles.paidCol}>Mộc Tinh</div>
          </div>
          <ComparisonRow feature="Số bài học" free="3 bài cơ bản" paid="Tất cả bài học" />
          <ComparisonRow feature="Nhiệm vụ" free="2 mission" paid="Tất cả mission" />
          <ComparisonRow feature="Quảng cáo" free="Có" paid="Không" />
          <ComparisonRow feature="RoboBuddy AI Tutor" free="❌" paid="✓" highlight />
          <ComparisonRow feature="Tham gia thi đấu" free="❌" paid="✓" highlight />
          <ComparisonRow feature="Hỗ trợ ưu tiên" free="❌" paid="✓" />
          <ComparisonRow feature="Bảng xếp hạng" free="Cơ bản" paid="Đầy đủ" />
        </div>
      </div>

      {/* FAQ */}
      <div style={styles.faqSection}>
        <h2 style={styles.faqTitle}>Câu Hỏi Thường Gặp</h2>
        <div style={styles.faqGrid}>
          <FaqItem
            question="Làm sao để hủy đăng ký?"
            answer="Bạn có thể hủy đăng ký bất kỳ lúc nào trong phần Cài đặt. Không có phí hủy trước."
          />
          <FaqItem
            question="Có bảo đảm hoàn tiền không?"
            answer="Có! Chúng tôi hoàn tiền 100% trong vòng 7 ngày đầu tiên nếu bạn không hài lòng."
          />
          <FaqItem
            question="Tôi có thể chuyển đổi gói không?"
            answer="Có, bạn có thể nâng cấp hoặc hạ cấp gói bất kỳ lúc nào."
          />
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  feature,
  free,
  paid,
  highlight = false
}: {
  feature: string;
  free: string;
  paid: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ ...styles.tableRow, ...(highlight ? styles.highlightRow : {}) }}>
      <div style={styles.featureCol}>{feature}</div>
      <div style={styles.freeCol}>{free}</div>
      <div style={{ ...styles.paidCol, ...styles.paidCell }}>{paid}</div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div style={styles.faqItem}>
      <h4 style={styles.faqQuestion}>{question}</h4>
      <p style={styles.faqAnswer}>{answer}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '0 20px 40px',
  },
  header: {
    textAlign: 'center' as const,
    padding: '40px 20px 20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  currentTierCard: {
    maxWidth: '500px',
    margin: '60px auto',
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '40px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  checkIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  alreadyPaidTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  alreadyPaidDesc: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    maxWidth: '700px',
    margin: '0 auto 40px',
  },
  tierCard: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '32px 24px',
    position: 'relative' as const,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  freeTier: {
    border: '2px solid #e0e0e0',
  },
  paidTier: {
    border: '3px solid #f59e0b',
    transform: 'scale(1.02)' as const,
  },
  popularBadge: {
    position: 'absolute' as const,
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)' as const,
    backgroundColor: '#f59e0b',
    color: 'white',
    padding: '4px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  tierHeader: {
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  tierEmoji: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '8px',
  },
  tierName: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  tierPrice: {
    fontSize: '18px',
    color: '#666',
    margin: 0,
  },
  priceValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  pricePeriod: {
    fontSize: '14px',
    color: '#888',
  },
  benefitsList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 24px',
  },
  benefitItem: {
    padding: '8px 0',
    fontSize: '14px',
    color: '#555',
    borderBottom: '1px solid #f0f0f0',
  },
  paidBenefit: {
    color: '#333',
    fontWeight: 500,
  },
  currentBadge: {
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#888',
    fontStyle: 'italic' as const,
  },
  upgradeButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  guarantee: {
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#888',
    margin: 0,
  },
  comparisonSection: {
    maxWidth: '800px',
    margin: '0 auto 40px',
  },
  comparisonTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  comparisonTable: {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    backgroundColor: '#f5f5f5',
    padding: '12px 16px',
    fontWeight: 'bold' as const,
    fontSize: '14px',
    color: '#666',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px',
  },
  highlightRow: {
    backgroundColor: '#fffbf0',
  },
  featureCol: {
    color: '#333',
  },
  freeCol: {
    color: '#666',
    textAlign: 'center' as const,
  },
  paidCol: {
    textAlign: 'center' as const,
  },
  paidCell: {
    color: '#f59e0b',
    fontWeight: 600,
  },
  faqSection: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  faqTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  faqGrid: {
    display: 'grid',
    gap: '16px',
  },
  faqItem: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  faqQuestion: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '8px',
  },
  faqAnswer: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },
};
