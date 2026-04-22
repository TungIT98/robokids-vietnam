import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './MobileNav.module.css';

interface MobileNavProps {
  links: { href: string; label: string }[];
}

export default function MobileNav({ links }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        className={styles.hamburger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${isOpen ? styles.open : ''}`}>
        <div className={styles.mobileMenuHeader}>
          <span className={styles.mobileMenuBrand}>🤖 RoboKids</span>
          <button
            className={styles.closeBtn}
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </div>
        <nav className={styles.mobileNav}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.mobileMenuActions}>
          <Link
            to="/login"
            className={styles.mobileLoginBtn}
            onClick={() => setIsOpen(false)}
          >
            Đăng nhập
          </Link>
          <Link
            to="/signup"
            className={styles.mobileSignupBtn}
            onClick={() => setIsOpen(false)}
          >
            📅 Đăng ký học thử
          </Link>
        </div>
      </div>
    </>
  );
}
