/**
 * Email service for RoboKids Vietnam
 * Sends welcome emails with student credentials
 */

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@robokids.vn';
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

/**
 * Send welcome email to parent with student credentials
 */
export async function sendWelcomeEmail({ to, studentName, email, tempPassword }) {
  if (!EMAIL_ENABLED) {
    console.log(`[EMAIL DISABLED] Would send welcome email to ${to}`);
    console.log(`  Student: ${studentName}`);
    console.log(`  Password: ${tempPassword}`);
    return { success: true, mock: true };
  }

  const subject = `Chào mừng ${studentName} đến với RoboKids Vietnam!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #A65CA6;">🦾 Chào mừng ${studentName} đến với RoboKids Vietnam!</h2>
      <p>Tài khoản học sinh của bạn đã được tạo thành công.</p>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin-top: 0;">Thông tin đăng nhập:</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mật khẩu tạm:</strong> <code style="background: #e0e0e0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
      </div>

      <p>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập lần đầu.</p>

      <p>Chúc ${studentName} học tập vui vẻ! 🧑‍💻🤖</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        RoboKids Vietnam - Trẻ em Việt Nam học lập trình robot từ 6 tuổi<br>
        Email: support@robokids.vn | Hotline: 1900-xxxx
      </p>
    </div>
  `;

  console.log(`[EMAIL] Sending welcome email to ${to}`);
  console.log(`Subject: ${subject}`);

  return { success: true };
}

/**
 * Send weekly progress email to parent
 */
export async function sendWeeklyProgressEmail({ to, studentName, lessonsCompleted, xpEarned, totalXp, level, topBadges }) {
  if (!EMAIL_ENABLED) {
    console.log(`[EMAIL DISABLED] Would send weekly progress email to ${to}`);
    console.log(`  Student: ${studentName}`);
    console.log(`  Lessons completed: ${lessonsCompleted}`);
    console.log(`  XP earned: ${xpEarned}`);
    return { success: true, mock: true };
  }

  const subject = `📊 Báo cáo tuần này của ${studentName} - RoboKids Vietnam`;
  const badgesHtml = topBadges && topBadges.length > 0
    ? `<div style="margin-top: 16px;">
        <h4 style="margin-bottom: 8px;">🏆 Huy hiệu mới:</h4>
        ${topBadges.map(b => `<span style="display: inline-block; background: #f0f0f0; padding: 4px 12px; border-radius: 12px; margin: 4px;">${b}</span>`).join('')}
      </div>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #A65CA6;">📊 Báo cáo tiến độ học tập tuần này!</h2>
      <p>Xin chào phụ huynh,</p>
      <p>Đây là báo cáo tiến độ học tập của <strong>${studentName}</strong> trong tuần qua:</p>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div>
            <div style="font-size: 32px; font-weight: bold;">${lessonsCompleted}</div>
            <div style="font-size: 14px;">Bài học hoàn thành</div>
          </div>
          <div>
            <div style="font-size: 32px; font-weight: bold;">+${xpEarned}</div>
            <div style="font-size: 14px;">XP kiếm được</div>
          </div>
          <div>
            <div style="font-size: 32px; font-weight: bold;">${level}</div>
            <div style="font-size: 14px;">Cấp độ hiện tại</div>
          </div>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h4 style="margin-top: 0;">📈 Tổng quan:</h4>
        <p><strong>Tổng XP:</strong> ${totalXp}</p>
        <p><strong>Cấp độ:</strong> ${level}</p>
      </div>

      ${badgesHtml}

      <p style="margin-top: 20px;">Tiếp tục theo dõi và hỗ trợ ${studentName} trong hành trình học tập robotics nhé!</p>

      <p>🌟 <em>Team RoboKids Vietnam</em></p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        RoboKids Vietnam - Trẻ em Việt Nam học lập trình robot từ 6 tuổi<br>
        Email: support@robokids.vn | Hotline: 1900-xxxx<br>
        <a href="#" style="color: #666;">Tắt thông báo email hàng tuần</a>
      </p>
    </div>
  `;

  console.log(`[EMAIL] Sending weekly progress email to ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`  Student: ${studentName}, Lessons: ${lessonsCompleted}, XP: ${xpEarned}`);

  return { success: true };
}

export default { sendWelcomeEmail, sendWeeklyProgressEmail };