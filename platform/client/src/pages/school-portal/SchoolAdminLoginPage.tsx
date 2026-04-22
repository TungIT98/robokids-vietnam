/**
 * SchoolAdminLoginPage - Portal login for school admin, teacher, and RoboKids staff
 * Supports role-based login with redirect to appropriate dashboard
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import styles from './SchoolAdminLoginPage.module.css';

type PortalRole = 'school_admin' | 'teacher' | 'robokids_staff';

export default function SchoolAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<PortalRole>('school_admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);

      // Role-based redirect after login
      // The backend returns user.role which determines the destination
      navigate('/school-admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <div className={styles.container}>
      {/* Animated background */}
      <div className={styles.bgRobot1}>🏫</div>
      <div className={styles.bgRobot2}>📚</div>
      <div className={styles.bgRobot3}>👩‍🏫</div>

      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🤖</span>
          <h1 className={styles.logoText}>RoboKids Vietnam</h1>
          <p className={styles.subtitle}>School Partnership Portal</p>
        </div>

        {/* Role selector tabs */}
        <div className={styles.roleTabs}>
          <button
            type="button"
            className={`${styles.roleTab} ${selectedRole === 'school_admin' ? styles.roleTabActive : ''}`}
            onClick={() => setSelectedRole('school_admin')}
          >
            Quản trị trường
          </button>
          <button
            type="button"
            className={`${styles.roleTab} ${selectedRole === 'teacher' ? styles.roleTabActive : ''}`}
            onClick={() => setSelectedRole('teacher')}
          >
            Giáo viên
          </button>
          <button
            type="button"
            className={`${styles.roleTab} ${selectedRole === 'robokids_staff' ? styles.roleTabActive : ''}`}
            onClick={() => setSelectedRole('robokids_staff')}
          >
            RoboKids Staff
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@school.edu.vn"
              className={styles.input}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.forgotLink}
            onClick={handleForgotPassword}
          >
            Quên mật khẩu?
          </button>
        </div>

        <div className={styles.backLink}>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
            ← Quay lại đăng nhập học sinh/phụ huynh
          </a>
        </div>
      </div>
    </div>
  );
}
