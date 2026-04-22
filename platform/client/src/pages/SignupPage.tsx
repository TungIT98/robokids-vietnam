import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AgeVerification from './AgeVerification';
import styles from './SignupPage.module.css';

/**
 * Email validation - uses browser native validation (type="email")
 * and PocketBase server-side validation for proper error messages
 */

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'parent' as 'parent' | 'student',
    date_of_birth: '',
    grade_level: 1,
  });
  const [showAgeVerify, setShowAgeVerify] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { signup, isLoading, error, clearError, user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError(null);
    clearError();
  };

  const handleAgeVerified = async (requiresParentalConsent: boolean) => {
    setShowAgeVerify(false);
    if (requiresParentalConsent && formData.role === 'student') {
      setLocalError('Học sinh dưới 13 tuổi cần được phụ huynh đăng ký.');
      return;
    }
    await handleSubmit(undefined, true);
  };

  const handleSubmit = async (e?: React.FormEvent, skipAgeVerify?: boolean) => {
    if (e) e.preventDefault();
    setLocalError(null);

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Mật khẩu không khớp');
      return;
    }

    if (formData.password.length < 8) {
      setLocalError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setLocalError('Mật khẩu phải chứa ít nhất 1 chữ hoa');
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setLocalError('Mật khẩu phải chứa ít nhất 1 chữ số');
      return;
    }
    if (!/[!@#$%^&*]/.test(formData.password)) {
      setLocalError('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*)');
      return;
    }

    // Email validation - browser handles format validation via type="email"
    // PocketBase handles server-side validation
    if (!formData.email) {
      setLocalError('Vui lòng nhập email');
      return;
    }

    if (formData.role === 'student' && !skipAgeVerify) {
      if (!formData.date_of_birth) {
        setLocalError('Vui lòng nhập ngày sinh');
        return;
      }
      // Show age verification
      setShowAgeVerify(true);
      return;
    }

    // Clear any previous errors before attempting signup
    clearError();
    setLocalError(null);

    signup({
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      role: formData.role,
      date_of_birth: formData.role === 'student' ? formData.date_of_birth : undefined,
      grade_level: formData.role === 'student' ? formData.grade_level : undefined,
    }).then(() => {
      // Redirect to dashboard after successful signup
      navigate('/dashboard', { replace: true });
    }).catch((err) => {
      // Error is handled by context - signup function sets error state
      console.error('Signup failed:', err);
    });
  };

  if (showAgeVerify) {
    return (
      <AgeVerification
        dateOfBirth={formData.date_of_birth}
        onVerified={handleAgeVerified}
        onCancel={() => setShowAgeVerify(false)}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.robotIcon}>🤖</span>
          <h1 className={styles.title}>Đăng ký</h1>
          <p className={styles.subtitle}>Tham gia cùng RoboKids Vietnam!</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {(error || localError) && (
            <div className={styles.errorAlert}>
              {error || localError}
            </div>
          )}

          <div className={styles.roleSelector}>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: 'parent' }))}
              className={`${styles.roleButton} ${formData.role === 'parent' ? styles.roleButtonActive : ''}`}
            >
              👨‍👩‍👧 Phụ huynh
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, role: 'student' }))}
              className={`${styles.roleButton} ${formData.role === 'student' ? styles.roleButtonActive : ''}`}
            >
              👦 Học sinh
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Họ và tên</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Nhập họ và tên"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
              className={styles.input}
            />
          </div>

          {formData.role === 'student' && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Ngày sinh</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Lớp</label>
                <select
                  name="grade_level"
                  value={formData.grade_level}
                  onChange={handleChange}
                  className={styles.input}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
                    <option key={grade} value={grade}>
                      Lớp {grade}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Mật khẩu</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ít nhất 8 ký tự, 1 hoa, 1 số, 1 ký tự đặc biệt"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Xác nhận mật khẩu</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              required
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={styles.primaryButton}
          >
            {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>Đã có tài khoản?</span>
        </div>

        <Link to="/login" className={styles.secondaryButton}>
          Đăng nhập
        </Link>

        <p className={styles.terms}>
          Bằng việc đăng ký, bạn đồng ý với{' '}
          <a href="#" className={styles.termsLink}>Điều khoản sử dụng</a>
          {' '}của RoboKids Vietnam
        </p>
      </div>
    </div>
  );
}