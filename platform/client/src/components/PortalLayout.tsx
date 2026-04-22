/**
 * PortalLayout - Shared layout for School Partnership Portal pages
 * Provides navigation sidebar and top bar for school admin, teacher, and staff portals
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './PortalLayout.module.css';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const schoolAdminNav: NavItem[] = [
  { label: 'Tổng quan', path: '/school-admin/dashboard', icon: '📊' },
  { label: 'Giáo viên', path: '/school-admin/teachers', icon: '👩‍🏫' },
  { label: 'Học sinh', path: '/school-admin/students', icon: '👨‍🎓' },
  { label: 'Lớp học', path: '/school-admin/classes', icon: '🏫' },
  { label: 'Tiến độ', path: '/school-admin/progress', icon: '📈' },
  { label: 'Hóa đơn', path: '/school-admin/billing', icon: '💳' },
];

const teacherNav: NavItem[] = [
  { label: 'Tổng quan', path: '/teacher/dashboard', icon: '📊' },
  { label: 'Lớp của tôi', path: '/teacher/classes', icon: '🏫' },
  { label: 'Học sinh', path: '/teacher/students', icon: '👨‍🎓' },
  { label: 'Tiến độ', path: '/teacher/progress', icon: '📈' },
  { label: 'Giáo trình', path: '/teacher/curriculum-builder', icon: '📚' },
];

const staffNav: NavItem[] = [
  { label: 'Tổng quan', path: '/staff/dashboard', icon: '📊' },
  { label: 'Trường học', path: '/staff/schools', icon: '🏫' },
  { label: 'Hóa đơn', path: '/staff/billing', icon: '💳' },
  { label: 'Báo cáo', path: '/staff/reports', icon: '📋' },
];

interface PortalLayoutProps {
  children: React.ReactNode;
  variant: 'school_admin' | 'teacher' | 'robokids_staff';
}

export default function PortalLayout({ children, variant }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = variant === 'school_admin' ? schoolAdminNav
    : variant === 'teacher' ? teacherNav
    : staffNav;

  const handleLogout = async () => {
    await logout();
    navigate('/school-portal/login');
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.logoIcon}>🤖</span>
          {sidebarOpen && <span className={styles.logoText}>RoboKids</span>}
          <button
            className={styles.toggleBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.navItemActive : ''}`}
              title={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <span className={styles.userIcon}>👤</span>
            {sidebarOpen && (
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user?.full_name || user?.email}</span>
                <span className={styles.userRole}>{userRole}</span>
              </div>
            )}
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Đăng xuất">
            🚪
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
