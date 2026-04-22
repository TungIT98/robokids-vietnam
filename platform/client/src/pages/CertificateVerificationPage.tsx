/**
 * CertificateVerificationPage - Public page to verify certificate authenticity
 * Accessible at /verify/:code
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import certificateApi, { Certificate } from '../services/certificateApi';
import styles from './CertificateVerificationPage.module.css';

export default function CertificateVerificationPage() {
  const { code } = useParams<{ code: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      verifyCertificate(code);
    }
  }, [code]);

  async function verifyCertificate(verificationCode: string) {
    setIsLoading(true);
    setError(null);
    try {
      const cert = await certificateApi.verifyCertificate(verificationCode);
      setCertificate(cert);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Certificate not found');
    } finally {
      setIsLoading(false);
    }
  }

  const getCertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lesson: 'Hoàn thành bài học',
      beginner_course: 'Khóa học Nền tảng',
      intermediate_course: 'Khóa học Trung cấp',
      advanced_course: 'Khóa học Nâng cao',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingEmoji}>🔍</div>
            <p className={styles.loadingText}>Đang xác minh chứng chỉ...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorContainer}>
            <div className={styles.errorEmoji}>❌</div>
            <h2 className={styles.errorTitle}>Không tìm thấy</h2>
            <p className={styles.errorText}>{error}</p>
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              Xác minh bằng dịch vụ của{' '}
              <a href="/" className={styles.robokidsLink}>RoboKids Vietnam</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const certDate = certificate && new Date(certificate.issuedAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>🎓</div>
          <h1 className={styles.title}>Xác minh chứng chỉ</h1>
          <p className={styles.subtitle}>RoboKids Vietnam - Nền tảng giáo dục Robotics</p>
        </div>

        <div className={styles.certificateBox}>
          <div className={styles.badge}>{certificate?.badgeEmoji || '🏆'}</div>
          <div className={styles.certType}>{getCertTypeLabel(certificate?.type || '')}</div>
          <h2 className={styles.name}>{certificate?.studentName}</h2>
          <p className={styles.achievement}>
            {certificate?.lessonName || certificate?.courseName}
          </p>
          <p className={styles.date}>Ngày cấp: {certDate}</p>
        </div>

        <div className={styles.verificationSection}>
          <div className={styles.verifiedBadge}>
            <span className={styles.verifyIcon}>✓</span>
            <span>Chứng chỉ hợp lệ</span>
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Mã xác minh: <strong>{code}</strong>
            <br />
            Xác minh bằng dịch vụ của{' '}
            <a href="/" className={styles.robokidsLink}>RoboKids Vietnam</a>
          </p>
        </div>
      </div>
    </div>
  );
}