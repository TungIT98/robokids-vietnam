import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pocketbase, isPocketBaseConfigured } from '../services/pocketbase';
import styles from './PasswordResetPage.module.css';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!isPocketBaseConfigured()) {
        throw new Error('PocketBase chưa được cấu hình. Vui lòng liên hệ support.');
      }
      await pocketbase.collection('users').requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi email đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.icon}>📧</div>
          <h1 className={styles.title}>Đã gửi email!</h1>
          <p className={styles.message}>
            Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu đến <strong>{email}</strong>
          </p>
          <p className={styles.hint}>
            Vui lòng kiểm tra hộp thư và làm theo hướng dẫn trong email.
          </p>
          <Link to="/login" className={styles.backButton}>
            Quay về đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>🔑</div>
        <h1 className={styles.title}>Quên mật khẩu?</h1>
        <p className={styles.subtitle}>
          Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorAlert}>
              {error}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={styles.primaryButton}
          >
            {isLoading ? 'Đang gửi...' : 'Gửi email đặt lại'}
          </button>
        </form>

        <Link to="/login" className={styles.backLink}>
          ← Quay về đăng nhập
        </Link>
      </div>
    </div>
  );
}