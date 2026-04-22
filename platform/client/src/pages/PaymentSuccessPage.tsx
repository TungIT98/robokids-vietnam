/**
 * PaymentSuccessPage - Shown after successful payment completion
 * Kid-friendly design with emojis and Vietnamese language.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './PaymentSuccessPage.module.css';

interface PaymentDetails {
  transactionId: string;
  enrollmentId: string;
  amount: number;
  paymentMethod: string;
}

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

  useEffect(() => {
    const txn = searchParams.get('txn');

    if (txn) {
      // Fetch payment details from API
      fetch(`${API_BASE}/api/payments/status/${txn}`, {
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch payment status');
          return res.json();
        })
        .then(data => {
          setPaymentDetails({
            transactionId: txn,
            enrollmentId: data.enrollment_id || '',
            amount: data.amount || 0,
            paymentMethod: data.payment_method || 'unknown',
          });
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching payment status:', err);
          // Still show success page even if we can't fetch details
          setPaymentDetails({
            transactionId: txn,
            enrollmentId: searchParams.get('enrollment_id') || '',
            amount: 299000, // Default enrollment fee
            paymentMethod: 'unknown',
          });
          setLoading(false);
        });
    } else {
      // No transaction ID - redirect to home
      setLoading(false);
    }
  }, [searchParams, API_BASE]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleContact = () => {
    // Open Zalo contact
    window.open('https://zalo.me/robokidsvn', '_blank');
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      zalopay: 'ZaloPay',
      vnpay: 'VNPay',
      bank_transfer: 'Chuyển khoản',
      cash: 'Tiền mặt',
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.icon}>⏳</div>
          <h1 className={styles.title}>Đang xử lý...</h1>
          <p className={styles.message}>Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>🎉</div>
        <h1 className={styles.title}>Thanh toán thành công!</h1>
        <p className={styles.message}>
          Cảm ơn bạn đã thanh toán phí đăng ký cho con! Chúng tôi đã nhận được
          thanh toán và sẽ liên hệ với bạn sớm.
        </p>

        {paymentDetails && (
          <div className={styles.enrollmentBox}>
            <div className={styles.enrollmentLabel}>Mã giao dịch</div>
            <div className={styles.enrollmentId}>{paymentDetails.transactionId}</div>
            {paymentDetails.enrollmentId && (
              <>
                <div className={styles.enrollmentLabel} style={{ marginTop: '12px' }}>
                  Mã đăng ký
                </div>
                <div className={styles.enrollmentId}>{paymentDetails.enrollmentId}</div>
              </>
            )}
            <div className={styles.amount}>
              Số tiền đã thanh toán:
              <div className={styles.amountValue}>
                {formatAmount(paymentDetails.amount)}
              </div>
            </div>
            <div className={styles.enrollmentLabel} style={{ marginTop: '8px' }}>
              Phương thức: {getPaymentMethodLabel(paymentDetails.paymentMethod)}
            </div>
          </div>
        )}

        <div className={styles.nextSteps}>
          <div className={styles.nextStepsTitle}>📋 Các bước tiếp theo</div>
          <div className={styles.nextStepsText}>
            1. Nhân viên RoboKids sẽ liên hệ qua Zalo trong vòng <strong>24 giờ</strong><br />
            2. Chúng tôi sẽ gửi thông tin lịch học và hướng dẫn các bước tiếp theo<br />
            3. Bé sẽ nhận được tài khoản để học lập trình robot trực tuyến
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={handleGoHome} className={styles.homeButton}>
            🏠 Về trang chủ
          </button>
          <button onClick={handleContact} className={styles.contactButton}>
            💬 Liên hệ Zalo
          </button>
        </div>

        <div className={styles.footer}>
          🤖 RoboKids Vietnam - STEM Robotics Education<br />
          Cần hỗ trợ? Liên hệ: hello@robokids.edu.vn
        </div>
      </div>
    </div>
  );
}