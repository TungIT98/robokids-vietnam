/**
 * BillingModule - Subscription management for School Admin Portal
 * Features: View subscription status, invoice history, payment tracking
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './BillingModule.module.css';

interface Subscription {
  plan: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  start_date: string;
  end_date: string;
  max_students: number;
  max_teachers: number;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
}

interface Invoice {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  due_date: string;
  paid_date?: string;
  description: string;
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

const PLAN_PRICES: Record<string, number> = {
  basic: 990000,
  standard: 1990000,
  premium: 3990000,
  enterprise: 7990000,
};

export default function BillingModule() {
  const { user, token } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('standard');

  useEffect(() => {
    if (user?.school_id) {
      loadData();
    }
  }, [user?.school_id]);

  const loadData = async () => {
    if (!user?.school_id) return;

    try {
      setIsLoading(true);

      const schoolData = await schoolsApi.get(user.school_id, { token });
      setSchool(schoolData.school);

      // Construct subscription from school data
      const sub: Subscription = {
        plan: schoolData.school?.subscription_plan || 'basic',
        status: schoolData.school?.subscription_status || 'active',
        start_date: schoolData.school?.subscription_start_date || new Date().toISOString(),
        end_date: schoolData.school?.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        max_students: schoolData.school?.max_students || 50,
        max_teachers: schoolData.school?.max_teachers || 10,
        price: PLAN_PRICES[schoolData.school?.subscription_plan || 'basic'] || 990000,
        billing_cycle: 'yearly',
      };
      setSubscription(sub);

      // Mock invoices for demo
      const mockInvoices: Invoice[] = [
        {
          id: 'INV-001',
          amount: sub.price,
          status: 'paid',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          paid_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          description: `Phí gói ${PLAN_LABELS[sub.plan]} - Năm học 2025-2026`,
        },
        {
          id: 'INV-002',
          amount: sub.price,
          status: 'paid',
          date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() - 360 * 24 * 60 * 60 * 1000).toISOString(),
          paid_date: new Date(Date.now() - 362 * 24 * 60 * 60 * 1000).toISOString(),
          description: `Phí gói ${PLAN_LABELS[sub.plan]} - Năm học 2024-2025`,
        },
        {
          id: 'INV-003',
          amount: 500000,
          status: 'paid',
          date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() - 175 * 24 * 60 * 60 * 1000).toISOString(),
          paid_date: new Date(Date.now() - 178 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Phí nâng cấp thêm 20 học sinh',
        },
      ];
      setInvoices(mockInvoices);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysRemaining = () => {
    if (!subscription) return 0;
    const end = new Date(subscription.end_date);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className={`${styles.badge} ${styles.badgeActive}`}>Hoạt động</span>;
      case 'expired':
        return <span className={`${styles.badge} ${styles.badgeExpired}`}>Hết hạn</span>;
      case 'cancelled':
        return <span className={`${styles.badge} ${styles.badgeCancelled}`}>Đã hủy</span>;
      case 'trial':
        return <span className={`${styles.badge} ${styles.badgeTrial}`}>Dùng thử</span>;
      case 'paid':
        return <span className={`${styles.badge} ${styles.badgeActive}`}>Đã thanh toán</span>;
      case 'pending':
        return <span className={`${styles.badge} ${styles.badgeTrial}`}>Chờ thanh toán</span>;
      case 'failed':
        return <span className={`${styles.badge} ${styles.badgeFailed}`}>Thanh toán thất bại</span>;
      default:
        return <span className={styles.badge}>{status}</span>;
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Thanh toán</h1>
          <p className={styles.subtitle}>Xem thông tin gói dịch vụ và lịch sử hóa đơn</p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {/* Subscription Card */}
      {subscription && (
        <div className={styles.subscriptionCard}>
          <div className={styles.subscriptionHeader}>
            <div>
              <span className={styles.planName}>{PLAN_LABELS[subscription.plan] || subscription.plan}</span>
              {getStatusBadge(subscription.status)}
            </div>
            {subscription.status !== 'cancelled' && (
              <button className={styles.upgradeBtn} onClick={() => setShowUpgradeModal(true)}>
                Nâng cấp gói
              </button>
            )}
          </div>

          <div className={styles.subscriptionDetails}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Ngày bắt đầu</span>
              <span className={styles.detailValue}>{formatDate(subscription.start_date)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Ngày hết hạn</span>
              <span className={styles.detailValue}>{formatDate(subscription.end_date)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Còn lại</span>
              <span className={`${styles.detailValue} ${styles.highlight}`}>
                {getDaysRemaining()} ngày
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Chu kỳ</span>
              <span className={styles.detailValue}>
                {subscription.billing_cycle === 'yearly' ? 'Hàng năm' : 'Hàng tháng'}
              </span>
            </div>
          </div>

          <div className={styles.usageSection}>
            <h4>Mức sử dụng</h4>
            <div className={styles.usageRow}>
              <span>Học sinh</span>
              <span>{school?.current_students || 0} / {subscription.max_students}</span>
            </div>
            <div className={styles.usageBar}>
              <div
                className={styles.usageFill}
                style={{ width: `${Math.min(100, ((school?.current_students || 0) / subscription.max_students) * 100)}%` }}
              />
            </div>
            <div className={styles.usageRow}>
              <span>Giáo viên</span>
              <span>{school?.current_teachers || 0} / {subscription.max_teachers}</span>
            </div>
            <div className={styles.usageBar}>
              <div
                className={styles.usageFill}
                style={{ width: `${Math.min(100, ((school?.current_teachers || 0) / subscription.max_teachers) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div className={styles.invoicesSection}>
        <h3 className={styles.sectionTitle}>Lịch sử Hóa đơn</h3>
        {invoices.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📄</span>
            <p>Chưa có hóa đơn nào</p>
          </div>
        ) : (
          <div className={styles.invoicesList}>
            {invoices.map(invoice => (
              <div key={invoice.id} className={styles.invoiceCard}>
                <div className={styles.invoiceHeader}>
                  <span className={styles.invoiceId}>{invoice.id}</span>
                  {getStatusBadge(invoice.status)}
                </div>
                <p className={styles.invoiceDesc}>{invoice.description}</p>
                <div className={styles.invoiceDetails}>
                  <div className={styles.invoiceDetail}>
                    <span className={styles.detailLabel}>Số tiền</span>
                    <span className={styles.invoiceAmount}>{formatCurrency(invoice.amount)}</span>
                  </div>
                  <div className={styles.invoiceDetail}>
                    <span className={styles.detailLabel}>Ngày tạo</span>
                    <span>{formatDate(invoice.date)}</span>
                  </div>
                  <div className={styles.invoiceDetail}>
                    <span className={styles.detailLabel}>Hạn thanh toán</span>
                    <span>{formatDate(invoice.due_date)}</span>
                  </div>
                  {invoice.paid_date && (
                    <div className={styles.invoiceDetail}>
                      <span className={styles.detailLabel}>Đã thanh toán</span>
                      <span className={styles.paidDate}>{formatDate(invoice.paid_date)}</span>
                    </div>
                  )}
                </div>
                {invoice.status === 'pending' && (
                  <button className={styles.payBtn}>
                    Thanh toán ngay
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUpgradeModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Nâng cấp Gói dịch vụ</h2>
              <button className={styles.closeBtn} onClick={() => setShowUpgradeModal(false)}>×</button>
            </div>
            <div className={styles.modalContent}>
              <p className={styles.modalHint}>Liên hệ với RoboKids để nâng cấp gói dịch vụ của bạn.</p>
              <div className={styles.plansGrid}>
                {['basic', 'standard', 'premium', 'enterprise'].map(plan => (
                  <div
                    key={plan}
                    className={`${styles.planCard} ${selectedPlan === plan ? styles.planSelected : ''}`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <span className={styles.planCardName}>{PLAN_LABELS[plan]}</span>
                    <span className={styles.planCardPrice}>{formatCurrency(PLAN_PRICES[plan])}/năm</span>
                  </div>
                ))}
              </div>
              <div className={styles.contactSection}>
                <p>📧 Email: contact@robokids.vn</p>
                <p>📞 Hotline: 1900-xxxx</p>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowUpgradeModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
