import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';
import MobileNav from '../components/MobileNav';

export default function LandingPage() {
  return (
    <div className={styles.page}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.navLogo}>🤖</span>
          <span className={styles.navTitle}>RoboKids Vietnam</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Đặc điểm</a>
          <a href="#programs" className={styles.navLink}>Chương trình</a>
          <a href="#testimonials" className={styles.navLink}>Phản hồi</a>
          <a href="#contact" className={styles.navLink}>Liên hệ</a>
        </div>
        <div className={styles.navActions}>
          <Link to="/login" className={styles.navLogin}>Đăng nhập</Link>
          <Link to="/signup" className={styles.navSignup}>Đăng ký học thử</Link>
        </div>
        <MobileNav
          links={[
            { href: '#features', label: 'Đặc điểm' },
            { href: '#programs', label: 'Chương trình' },
            { href: '#testimonials', label: 'Phản hồi' },
            { href: '#contact', label: 'Liên hệ' },
          ]}
        />
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>🌟 Ưu đãi mùa hè 2026</div>
          <h1 className={styles.heroTitle}>
            Trẻ em Việt Nam<br />
            <span className={styles.heroHighlight}>Học lập trình Robot</span><br />
            Từ 6 tuổi
          </h1>
          <p className={styles.heroSubtitle}>
            Khám phá thế giới STEM robotics với AI tutor thông minh 24/7.<br />
            Chuẩn bị cho tương lai của con bạn ngay hôm nay!
          </p>
          <div className={styles.heroCta}>
            <Link to="/signup" className={styles.heroPrimaryBtn}>
              📅 Đăng ký học thử miễn phí
            </Link>
            <a href="#programs" className={styles.heroSecondaryBtn}>
              Khám phá chương trình
            </a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>500+</span>
              <span className={styles.statLabel}>Học sinh</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>50+</span>
              <span className={styles.statLabel}>Bài học</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>24/7</span>
              <span className={styles.statLabel}>AI Tutor</span>
            </div>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.robotIllustration}>🤖</div>
          <div className={styles.floatingBadge1}>🚀 STEM</div>
          <div className={styles.floatingBadge2}>🧠 AI</div>
          <div className={styles.floatingBadge3}>🎯 Tương lai</div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>
          Tại sao chọn RoboKids? 🌟
        </h2>
        <p className={styles.sectionSubtitle}>
          Nền tảng giáo dục STEM robotics hàng đầu Việt Nam
        </p>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤖</div>
            <h3 className={styles.featureTitle}>Học qua Robot</h3>
            <p className={styles.featureDesc}>
              Trẻ em được thực hành lập trình robot thực tế, phát triển tư duy logic và sáng tạo.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🧠</div>
            <h3 className={styles.featureTitle}>AI Tutor 24/7</h3>
            <p className={styles.featureDesc}>
              Trợ lý AI thông minh hỗ trợ học sinh mọi lúc, mọi nơi. Giải đáp thắc mắc tức thì.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📚</div>
            <h3 className={styles.featureTitle}>Chương trình chuẩn</h3>
            <p className={styles.featureDesc}>
              Bài học được thiết kế theo chuẩn STEM quốc tế, phù hợp với lứa tuổi 6-16.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🏆</div>
            <h3 className={styles.featureTitle}>Cuộc thi Robotics</h3>
            <p className={styles.featureDesc}>
              Tham gia đội tuyển VEX/FLL, tranh tài cùng học sinh toàn quốc.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👨‍👩‍👧</div>
            <h3 className={styles.featureTitle}>Phụ huynh theo dõi</h3>
            <p className={styles.featureDesc}>
              Dashboard riêng cho phụ huynh xem tiến độ học tập của con em mình.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎮</div>
            <h3 className={styles.featureTitle}>Học mà chơi</h3>
            <p className={styles.featureDesc}>
              Giao diện Blockly trực quan, trẻ em thích thú như đang chơi game.
            </p>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className={styles.programs}>
        <h2 className={styles.sectionTitle}>
          Chương trình học 📚
        </h2>
        <p className={styles.sectionSubtitle}>
          Phù hợp với mọi lứa tuổi và trình độ
        </p>
        <div className={styles.programGrid}>
          <div className={styles.programCard}>
            <div className={styles.programAge}>6-8 tuổi</div>
            <h3 className={styles.programTitle}>🌱 Beginner</h3>
            <p className={styles.programDesc}>
              Làm quen với lập trình qua khối code đơn giản. Học cách điều khiển robot cơ bản.
            </p>
            <ul className={styles.programList}>
              <li>🔰 Khối lệnh cơ bản</li>
              <li>🤖 Điều khiển chuyển động</li>
              <li>🎨 Lập trình sáng tạo</li>
            </ul>
            <Link to="/signup" className={styles.programBtn}>Đăng ký ngay</Link>
          </div>
          <div className={styles.programCard}>
            <div className={styles.programAge}>9-12 tuổi</div>
            <h3 className={styles.programTitle}>⚡ Intermediate</h3>
            <p className={styles.programDesc}>
              Nâng cao kỹ năng với cảm biến, vòng lặp và điều kiện phức tạp hơn.
            </p>
            <ul className={styles.programList}>
              <li>📡 Sử dụng cảm biến</li>
              <li>🔄 Vòng lặp nâng cao</li>
              <li>🧩 Giải quyết vấn đề</li>
            </ul>
            <Link to="/signup" className={styles.programBtn}>Đăng ký ngay</Link>
          </div>
          <div className={`${styles.programCard} ${styles.programCardFeatured}`}>
            <div className={styles.programAge}>13-16 tuổi</div>
            <h3 className={styles.programTitle}>🚀 Advanced</h3>
            <p className={styles.programDesc}>
              Lập trình Python, tham gia cuộc thi robotics chuyên nghiệp.
            </p>
            <ul className={styles.programList}>
              <li>🐍 Lập trình Python</li>
              <li>🏅 Đội tuyển VEX/FLL</li>
              <li>💡 Dự án thực tế</li>
            </ul>
            <Link to="/signup" className={styles.programBtnFeatured}>Đăng ký ngay</Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className={styles.testimonials}>
        <h2 className={styles.sectionTitle}>
          Phản hồi từ phụ huynh 💬
        </h2>
        <p className={styles.sectionSubtitle}>
          Hàng trăm gia đình tin tưởng RoboKids
        </p>
        <div className={styles.testimonialGrid}>
          <div className={styles.testimonialCard}>
            <div className={styles.testimonialStars}>⭐⭐⭐⭐⭐</div>
            <p className={styles.testimonialText}>
              "Con tôi rất thích học Robotics tại đây. Sau 3 tháng, con đã tự lập trình được robot phục vụ bữa tiệc sinh nhật của mình!"
            </p>
            <div className={styles.testimonialAuthor}>
              <span className={styles.testimonialAvatar}>👩</span>
              <div>
                <div className={styles.testimonialName}>Chị Nguyễn Thị Mai</div>
                <div className={styles.testimonialRole}>Phụ huynh - Hà Nội</div>
              </div>
            </div>
          </div>
          <div className={styles.testimonialCard}>
            <div className={styles.testimonialStars}>⭐⭐⭐⭐⭐</div>
            <p className={styles.testimonialText}>
              "AI tutor rất thông minh, trả lời nhanh và dễ hiểu. Con tôi tự học ở nhà mà không cần tôi phải hỗ trợ nhiều."
            </p>
            <div className={styles.testimonialAuthor}>
              <span className={styles.testimonialAvatar}>👨</span>
              <div>
                <div className={styles.testimonialName}>Anh Trần Văn Hùng</div>
                <div className={styles.testimonialRole}>Phụ huynh - TP.HCM</div>
              </div>
            </div>
          </div>
          <div className={styles.testimonialCard}>
            <div className={styles.testimonialStars}>⭐⭐⭐⭐⭐</div>
            <p className={styles.testimonialText}>
              "Đội tuyển VEX của RoboKids đạt giải nhì toàn quốc. Tự hào về con gái!"
            </p>
            <div className={styles.testimonialAuthor}>
              <span className={styles.testimonialAvatar}>👩</span>
              <div>
                <div className={styles.testimonialName}>Chị Lê Thu Hà</div>
                <div className={styles.testimonialRole}>Phụ huynh - Đà Nẵng</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>
            Sẵn sàng cho tương lai? 🚀
          </h2>
          <p className={styles.ctaSubtitle}>
            Đăng ký học thử miễn phí hoặc liên hệ trường học để được tư vấn
          </p>
          <div className={styles.ctaButtons}>
            <Link to="/signup" className={styles.ctaPrimaryBtn}>
              📅 Đăng ký học thử miễn phí
            </Link>
            <a href="mailto:contact@robokids.vn" className={styles.ctaSecondaryBtn}>
              📧 Liên hệ trường học
            </a>
          </div>
          <div className={styles.ctaContact}>
            <span>📞 0901 234 567</span>
            <span>📧 contact@robokids.vn</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>🤖</span>
            <span className={styles.footerTitle}>RoboKids Vietnam</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="#features" className={styles.footerLink}>Đặc điểm</a>
            <a href="#programs" className={styles.footerLink}>Chương trình</a>
            <a href="#testimonials" className={styles.footerLink}>Phản hồi</a>
            <a href="#contact" className={styles.footerLink}>Liên hệ</a>
          </div>
          <div className={styles.footerSocial}>
            <span className={styles.socialIcon}>📘</span>
            <span className={styles.socialIcon}>📸</span>
            <span className={styles.socialIcon}>▶️</span>
            <span className={styles.socialIcon}>💬</span>
          </div>
          <p className={styles.footerCopyright}>
            © 2026 RoboKids Vietnam. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </footer>
    </div>
  );
}
