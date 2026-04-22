/**
 * CertificateDownloadPage - Celebratory UI for certificate download and social sharing
 * Shown after completing a lesson or course
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import certificateApi, { Certificate } from '../services/certificateApi';
import styles from './CertificateDownloadPage.module.css';

interface Props {
  certificateId?: string;
  onClose?: () => void;
}

const CERTIFICATE_CONFIG = {
  lesson: {
    title: 'Hoàn thành bài học!',
    emoji: '📜',
    message: 'Bạn đã hoàn thành bài học',
  },
  beginner_course: {
    title: 'Chúc mừng!',
    emoji: '🏆',
    message: 'Bạn đã hoàn thành Khóa học Nền tảng',
  },
  intermediate_course: {
    title: 'Xuất sắc!',
    emoji: '🌟',
    message: 'Bạn đã hoàn thành Khóa học Trung cấp',
  },
  advanced_course: {
    title: 'Huyền thoại!',
    emoji: '👑',
    message: 'Bạn đã hoàn thành Khóa học Nâng cao',
  },
};

export default function CertificateDownloadPage({ certificateId, onClose }: Props) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const certIdFromUrl = searchParams.get('certificateId');
  const actualCertId = certificateId || certIdFromUrl;

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    loadCertificate();
    triggerConfetti();
  }, [user, token, actualCertId]);

  async function loadCertificate() {
    setIsLoading(true);
    setError(null);
    try {
      if (actualCertId) {
        const cert = await certificateApi.getCertificate(actualCertId, token!);
        setCertificate(cert);
      } else {
        // Get latest certificates for user
        const certs = await certificateApi.getMyCertificates(token!);
        if (certs.length > 0) {
          setCertificate(certs[certs.length - 1]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load certificate');
    } finally {
      setIsLoading(false);
    }
  }

  function triggerConfetti() {
    setTimeout(() => setShowConfetti(true), 300);
    setTimeout(() => setShowConfetti(false), 4000);
  }

  async function handleDownload() {
    if (!certificate || !token) return;
    setIsDownloading(true);
    try {
      const { url } = await certificateApi.getDownloadUrl(certificate.id, token);
      // Open in new tab for PDF download
      window.open(url, '_blank');
      setDownloaded(true);
    } catch (err) {
      alert('Failed to download certificate. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  function handleShare(type: 'facebook' | 'zalo' | 'twitter') {
    if (!certificate) return;
    const shareUrl = certificateApi.getShareUrls(certificate, type);
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  function handleVerifyCertificate() {
    if (!certificate) return;
    navigator.clipboard.writeText(`${window.location.origin}/verify/${certificate.verificationCode}`);
    alert('Verification link copied to clipboard!');
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingEmoji}>🏋️</div>
          <p className={styles.loadingText}>Đang tải chứng chỉ...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorEmoji}>😢</div>
          <h2 className={styles.errorTitle}>Ooops!</h2>
          <p className={styles.errorText}>{error || 'Không tìm thấy chứng chỉ'}</p>
          <button className={styles.primaryBtn} onClick={() => navigate('/missions')}>
            Quay lại Missions
          </button>
        </div>
      </div>
    );
  }

  const config = CERTIFICATE_CONFIG[certificate.type] || CERTIFICATE_CONFIG.lesson;
  const certDate = new Date(certificate.issuedAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className={styles.container}>
      {/* Confetti Animation */}
      {showConfetti && <ConfettiEffect />}

      {/* Close button */}
      <button className={styles.closeBtn} onClick={onClose || (() => navigate('/missions'))}>
        ✕
      </button>

      {/* Main Card */}
      <div className={styles.card}>
        {/* Celebration Header */}
        <div className={styles.celebrationHeader}>
          <div className={styles.celebrationEmoji}>{config.emoji}</div>
          <h1 className={styles.celebrationTitle}>{config.title}</h1>
          <p className={styles.celebrationMessage}>{config.message}</p>
        </div>

        {/* Certificate Preview */}
        <div className={styles.certificatePreview}>
          <div className={styles.certBadge}>{certificate.badgeEmoji || '🎓'}</div>
          <h2 className={styles.certName}>{certificate.studentName}</h2>
          <p className={styles.certInfo}>
            {certificate.lessonName || certificate.courseName}
          </p>
          <p className={styles.certDate}>Ngày cấp: {certDate}</p>
          <div className={styles.verificationBadge}>
            <span className={styles.verifyIcon}>✓</span>
            <span>Đã xác minh</span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Download Button */}
          <button
            className={`${styles.primaryBtn} ${downloaded ? styles.downloadedBtn : ''}`}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? '⏳ Đang tải...' : downloaded ? '✅ Đã tải xuống!' : '📥 Tải PDF'}
          </button>

          {/* Social Share */}
          <div className={styles.shareSection}>
            <p className={styles.shareLabel}>Chia sẻ với bạn bè:</p>
            <div className={styles.shareButtons}>
              <button
                style={{ backgroundColor: '#1877f2' }}
                className={styles.shareBtn}
                onClick={() => handleShare('facebook')}
                title="Chia sẻ lên Facebook"
              >
                📘
              </button>
              <button
                style={{ backgroundColor: '#0068ff' }}
                className={styles.shareBtn}
                onClick={() => handleShare('zalo')}
                title="Chia sẻ lên Zalo"
              >
                💬
              </button>
              <button
                style={{ backgroundColor: '#1da1f2' }}
                className={styles.shareBtn}
                onClick={() => handleShare('twitter')}
                title="Chia sẻ lên Twitter"
              >
                🐦
              </button>
            </div>
          </div>

          {/* Verify Link */}
          <button className={styles.verifyLink} onClick={handleVerifyCertificate}>
            🔗 Sao chép link xác minh
          </button>
        </div>
      </div>

      {/* Continue Learning */}
      <button className={styles.continueBtn} onClick={() => navigate('/missions')}>
        Tiếp tục học →
      </button>
    </div>
  );
}

// Simple confetti effect using CSS animations
function ConfettiEffect() {
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    size: Math.random() * 10 + 5,
  }));

  return (
    <div className={styles.confettiContainer}>
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className={styles.confettiPiece}
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
}