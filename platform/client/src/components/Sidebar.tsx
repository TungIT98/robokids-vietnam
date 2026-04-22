import { useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePrefetch } from '../hooks/usePrefetch';
import { preloadChunk } from '../utils/prefetchUtils';
import css from './Sidebar.module.css';

interface MenuItem {
  path: string;
  label: string;
  emoji: string;
  roles: string[];
}

const MENU_ITEMS: MenuItem[] = [
  { path: '/dashboard', label: 'Dashboard', emoji: '🎮', roles: ['student', 'admin'] },
  { path: '/home', label: 'Trang chủ', emoji: '🏠', roles: ['student', 'parent', 'admin'] },
  { path: '/missions', label: 'Nhiệm vụ', emoji: '🎯', roles: ['student', 'admin'] },
  { path: '/quests', label: 'Thử thách', emoji: '⚡', roles: ['student', 'admin'] },
  { path: '/space-academy', label: 'Space Academy', emoji: '🚀', roles: ['student', 'admin'] },
  { path: '/badges', label: 'Huy hiệu', emoji: '🏆', roles: ['student', 'admin'] },
  { path: '/rewards-store', label: 'Cửa hàng', emoji: '🛒', roles: ['student', 'admin'] },
  { path: '/curriculum', label: 'Chương trình', emoji: '📚', roles: ['student', 'admin'] },
  { path: '/leaderboard', label: 'Bảng xếp hạng', emoji: '📊', roles: ['student', 'admin'] },
  { path: '/live-classes', label: 'Lớp học live', emoji: '🎥', roles: ['student', 'parent', 'admin'] },
  { path: '/parent-dashboard', label: 'Phụ huynh', emoji: '👨‍👩‍👧', roles: ['parent', 'admin'] },
  { path: '/parent-communication', label: 'Liên lạc', emoji: '💬', roles: ['parent', 'admin'] },
  { path: '/certificate', label: 'Chứng chỉ', emoji: '📜', roles: ['student', 'parent', 'admin'] },
  { path: '/settings', label: 'Cài đặt', emoji: '⚙️', roles: ['student', 'parent', 'admin'] },
];

const ROLE_LABELS: Record<string, string> = {
  student: 'Học sinh',
  parent: 'Phụ huynh',
  admin: 'Quản trị',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { prefetchRoute } = usePrefetch();

  const userRole = user?.role || 'student';
  const filteredMenu = MENU_ITEMS.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleCollapse = () => setCollapsed(!collapsed);
  const toggleMobile = () => setMobileOpen(!mobileOpen);

  // Prefetch Space Academy chunk on hover
  const handleSpaceAcademyHover = useCallback(() => {
    prefetchRoute('/space-academy');
    preloadChunk('vendor-three');
  }, [prefetchRoute]);

  const navContent = (
    <>
      {/* Header */}
      <div className={css.header}>
        <div className={css.brand}>
          <span className={css.logo}>🤖</span>
          {!collapsed && <span className={css.brandText}>RoboKids</span>}
        </div>
        <button onClick={toggleCollapse} className={css.collapseBtn} aria-label="Thu gọn">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* User Info */}
      <div className={css.userSection}>
        <div className={css.avatar}>
          {user?.full_name?.charAt(0).toUpperCase() || '👤'}
        </div>
        {!collapsed && (
          <div className={css.userInfo}>
            <div className={css.userName}>{user?.full_name || 'User'}</div>
            <div className={css.userRole}>{ROLE_LABELS[userRole] || userRole}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={css.nav}>
        {filteredMenu.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            onMouseEnter={() => {
              if (item.path === '/space-academy') {
                handleSpaceAcademyHover();
              }
            }}
            className={({ isActive }) =>
              `${css.navItem}${isActive ? ` ${css.navItemActive}` : ''}`
            }
          >
            <span className={css.navEmoji}>{item.emoji}</span>
            {!collapsed && <span className={css.navLabel}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={css.footer}>
        <button onClick={handleLogout} className={css.logoutBtn}>
          <span className={css.logoutEmoji}>🚪</span>
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button onClick={toggleMobile} className={css.mobileToggle}>
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className={css.mobileOverlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`${css.sidebar}${collapsed ? ` ${css.sidebarCollapsed}` : ''}${mobileOpen ? ` ${css.sidebarMobileOpen}` : ''}`}
      >
        {navContent}
      </aside>
    </>
  );
}