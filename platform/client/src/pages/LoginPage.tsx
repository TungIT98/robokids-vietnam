import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { login, loginWithGoogle, loginWithFacebook, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setSuccessMessage('Đăng ký thành công! Vui lòng đăng nhập và xác minh email của bạn.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      // Error handled by context
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    try {
      await loginWithGoogle();
      // OAuth will redirect, no manual navigation needed
    } catch {
      // Error handled by context
    }
  };

  const handleFacebookLogin = async () => {
    clearError();
    try {
      await loginWithFacebook();
      // OAuth will redirect, no manual navigation needed
    } catch {
      // Error handled by context
    }
  };

  return (
    <div className={styles.container}>
      {/* Animated background robots */}
      <div className={styles.bgRobot1}>🤖</div>
      <div className={styles.bgRobot2}>🦾</div>
      <div className={styles.bgRobot3}>🤖</div>

      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.robotIconWrapper}>
            <span className={styles.robotIcon}>🤖</span>
          </div>
          <h1 className={styles.title}>RoboKids Vietnam</h1>
          <p className={styles.subtitle}>Học lập trình robot vui vẻ!</p>
          <div className={styles.badges}>
            <span className={styles.badge}>🚀 6-16 tuổi</span>
            <span className={styles.badge}>🎓 STEM</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {successMessage && (
            <div className={styles.successAlert}>
              <span>✅</span> {successMessage}
            </div>
          )}
          {error && (
            <div className={styles.errorAlert}>
              <span>😮</span> {error}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>📧</span> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className={styles.labelIcon}>🔒</span> Mật khẩu
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                className={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.togglePassword}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <Link to="/forgot-password" className={styles.forgotLink}>
            <span>😕</span> Quên mật khẩu?
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className={styles.primaryButton}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}>⚙️</span> Đang đăng nhập...
              </>
            ) : (
              <>
                <span>🎯</span> Đăng nhập
              </>
            )}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>hoặc</span>
          <span className={styles.dividerLine}></span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className={styles.googleButton}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className={styles.googleIcon}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Đăng nhập với Google
        </button>

        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={isLoading}
          className={styles.facebookButton}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className={styles.facebookIcon}>
            <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Đăng nhập với Facebook
        </button>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Chưa có tài khoản?{' '}
            <Link to="/signup" className={styles.signupLink}>
              <span>✨</span> Đăng ký ngay
            </Link>
          </p>
        </div>

        <div className={styles.parentNote}>
          <span className={styles.parentIcon}>👨‍👩‍👧</span>
          <span>Dành cho phụ huynh và học sinh</span>
        </div>
      </div>
    </div>
  );
}