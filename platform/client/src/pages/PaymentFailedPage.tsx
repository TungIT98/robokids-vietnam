/**
 * PaymentFailedPage - Shown when payment fails or is cancelled
 * Kid-friendly design with emojis and Vietnamese language.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './PaymentFailedPage.module.css';

interface PaymentDetails {
  transactionId: string;
  errorCode: string;
  errorMessage: string;
}

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  const txn = searchParams.get('txn');
  const code = searchParams.get('code');

  useEffect(() => {
    if (txn) {
      setPaymentDetails({
        transactionId: txn,
        errorCode: code || 'UNKNOWN',
        errorMessage: getErrorMessage(code || ''),
      });
    } else {
      setPaymentDetails({
        transactionId: '',
        errorCode: code || 'UNKNOWN',
        errorMessage: getErrorMessage(code || ''),
      });
    }
  }, [txn, code]);

  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      '00': 'Giao dịch không thành công',
      '07': 'Giao dịch đang chờ xử lý - vui lòng thử lại sau',
      '09': 'Không tìm thấy giao dịch hoặc thông tin không hợp lệ',
      '10': 'Số tiền giao dịch không hợp lệ',
      '11': 'Giao dịch thất bại - vui lòng thử lại',
      '12': 'Tài khoản không đủ số dư',
      '13': 'Ngân hàng đang bảo trì',
      '24': 'Giao dịch đã bị hủy bởi người dùng',
      '79': 'Số tiền vượt quá hạn mức giao dịch trong ngày',
      '99': 'Đã xảy ra lỗi không xác định',
      // ZaloPay error codes
      '1': 'Giao dịch thành công',
      '-1': 'Giao dịch thất bại - lỗi không xác định',
      '-2': 'Đơn hàng đã bị hủy',
      '-3': 'Giao dịch đã hết hạn',
      '-4': 'Số dư không đủ',
      '-5': 'Tài khoản bị khóa',
      // Generic fallback
      'UNKNOWN': 'Đã xảy ra lỗi trong quá trình thanh toán',
    };
    return errorMessages[errorCode] || errorMessages['UNKNOWN'];
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRetry = () => {
    // Go back to enrollment page to retry payment
    navigate('/enroll');
  };

  const handleContact = () => {
    // Open Zalo contact
    window.open('https://zalo.me/robokidsvn', '_blank');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>😔</div>
        <h1 className={styles.title}>Thanh toán không thành công</h1>
        <p className={styles.message}>
          Rất tiếc, giao dịch thanh toán của bạn không thành công.
          Vui lòng thử lại hoặc liên hệ với chúng tôi để được hỗ trợ.
        </p>

        {paymentDetails && (
          <div className={styles.errorBox}>
            {paymentDetails.errorCode && (
              <>
                <div className={styles.errorCode}>Mã lỗi</div>
                <div className={styles.errorCodeValue}>{paymentDetails.errorCode}</div>
              </>
            )}
            {paymentDetails.transactionId && (
              <>
                <div className={styles.transactionId}>Mã giao dịch</div>
                <div className={styles.transactionIdValue}>{paymentDetails.transactionId}</div>
              </>
            )}
          </div>
        )}

        <div className={styles.reasonBox}>
          <div className={styles.reasonTitle}>📋 Nguyên nhân có thể</div>
          <div className={styles.reasonText}>
            • Thẻ/tài khoản không đủ số dư<br />
            • Thông tin thanh toán không chính xác<br />
            • Giao dịch bị hủy bởi ngân hàng hoặc ví điện tử<br />
            • Hết thời gian chờ thanh toán<br />
            • Ngân hàng đang bảo trì
          </div>
        </div>

        <div className={styles.infoBox}>
          <div className={styles.infoTitle}>💡 Lưu ý</div>
          <div className={styles.infoText}>
            Nếu đã bị trừ tiền nhưng giao dịch thất bại, số tiền sẽ được hoàn lại
            trong vòng <strong>3-5 ngày làm việc</strong>.
            Đội ngũ RoboKids sẽ liên hệ hỗ trợ bạn sớm nhất.
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={handleRetry} className={styles.retryButton}>
            🔄 Thử lại thanh toán
          </button>
          <button onClick={handleContact} className={styles.contactButton}>
            💬 Liên hệ hỗ trợ (Zalo)
          </button>
          <button onClick={handleGoHome} className={styles.homeButton}>
            🏠 Về trang chủ
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