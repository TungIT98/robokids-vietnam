import { useState, useEffect } from 'react';
import styles from './AgeVerification.module.css';

interface AgeVerificationProps {
  dateOfBirth: string;
  onVerified: (requiresParentalConsent: boolean) => void;
  onCancel: () => void;
}

function computeAgeAndConsent(dateOfBirth: string): { age: number; requires_parental_consent: boolean; message: string } {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  const requiresParentalConsent = age < 13;
  const message = requiresParentalConsent
    ? `Bạn ${age} tuổi - cần tài khoản phụ huynh để đăng ký.`
    : `Bạn ${age} tuổi - đủ điều kiện để tự đăng ký!`;
  return { age, requires_parental_consent: requiresParentalConsent, message };
}

export default function AgeVerification({ dateOfBirth, onVerified, onCancel }: AgeVerificationProps) {
  const [result, setResult] = useState<{
    age: number;
    requires_parental_consent: boolean;
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyAge();
  }, [dateOfBirth]);

  const verifyAge = () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = computeAgeAndConsent(dateOfBirth);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Không thể xác minh tuổi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (result) {
      onVerified(result.requires_parental_consent);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          {result?.requires_parental_consent ? '👨‍👩‍👧' : '✅'}
        </div>

        <h1 className={styles.title}>Xác minh tuổi</h1>

        {isLoading ? (
          <p className={styles.message}>Đang xác minh...</p>
        ) : error ? (
          <>
            <p className={styles.errorMessage}>{error}</p>
            <button onClick={onCancel} className={styles.cancelButton}>
              Quay lại
            </button>
          </>
        ) : result ? (
          <>
            <p className={styles.message}>{result.message}</p>

            <div className={styles.resultBox}>
              <div className={styles.ageDisplay}>
                <span className={styles.ageNumber}>{result.age}</span>
                <span className={styles.ageLabel}>tuổi</span>
              </div>
            </div>

            {result.requires_parental_consent ? (
              <div className={styles.warningBox}>
                <p className={styles.warningText}>
                  Học sinh dưới 13 tuổi cần có tài khoản phụ huynh.
                  <br />
                  Vui lòng nhờ phụ huynh đăng ký giúp bạn.
                </p>
              </div>
            ) : (
              <p className={styles.successText}>
                Bạn đủ điều kiện để tự đăng ký!
              </p>
            )}

            <button
              onClick={handleContinue}
              className={result.requires_parental_consent ? styles.cancelButton : styles.continueButton}
            >
              {result.requires_parental_consent ? 'Quay lại' : 'Tiếp tục'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}