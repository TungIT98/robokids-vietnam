import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parentApi, StudentProgress, ParentStudent, Payment, StudentInsights } from '../services/parentApi';
import StudentSelector from '../components/StudentSelector';
import ProgressChart from '../components/ProgressChart';
import LessonList from '../components/LessonList';
import BadgeGrid from '../components/BadgeGrid';
import LearningHeatmaps from '../components/LearningHeatmaps';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}p`;
  return `${minutes} phút`;
}

export default function ParentDashboard() {
  const { token, user } = useAuth();
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [insights, setInsights] = useState<StudentInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Load parent profile and students
  useEffect(() => {
    if (!token) return;

    async function loadParentData() {
      try {
        setLoading(true);
        const parent = await parentApi.getMe(token!);
        setParentId(parent.id);
        const { students: studentList } = await parentApi.getStudents(token!, parent.id);
        setStudents(studentList);

        // Auto-select first student
        if (studentList.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentList[0].student.id);
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    }

    loadParentData();
  }, [token]);

  // Load student progress when selection changes
  useEffect(() => {
    if (!token || !selectedStudentId) return;

    async function loadProgress() {
      try {
        setLoading(true);
        const data = await parentApi.getStudentProgress(token!, selectedStudentId!);
        setProgress(data);
      } catch (err: any) {
        setError(err.message || 'Không thể tải tiến độ học tập');
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [token, selectedStudentId]);

  // Load AI insights when student is selected
  useEffect(() => {
    if (!token || !selectedStudentId || !parentId) return;

    async function loadInsights() {
      try {
        setLoadingInsights(true);
        const insightsData = await parentApi.getStudentInsights(token!, parentId!, selectedStudentId!);
        setInsights(insightsData);
      } catch (err) {
        console.error('Failed to load AI insights:', err);
      } finally {
        setLoadingInsights(false);
      }
    }

    loadInsights();
  }, [token, selectedStudentId, parentId]);

  // Load payment history
  useEffect(() => {
    if (!token) return;

    async function loadPayments() {
      try {
        const paymentData = await parentApi.getPayments(token!);
        setPayments(paymentData);
      } catch (err) {
        // Silently fail - payments may not be available
        console.error('Failed to load payments:', err);
      }
    }

    loadPayments();
  }, [token]);

  if (!token) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#6c7086',
      }}>
        Vui lòng đăng nhập để xem dashboard
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'auto',
      background: '#1e1e2e',
    }}>
      {/* Header */}
      <div style={{
        background: '#181825',
        padding: '16px 24px',
        borderBottom: '1px solid #313244',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#cdd6f4', margin: 0 }}>
              Dashboard Phụ huynh
            </h1>
            <p style={{ fontSize: '13px', color: '#6c7086', margin: '4px 0 0' }}>
              Theo dõi tiến độ học tập của con
            </p>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#cdd6f4', fontWeight: 600 }}>{user.full_name || user.email}</div>
                <div style={{ fontSize: '12px', color: '#6c7086' }}>Phụ huynh</div>
              </div>
              <button
                onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                style={{
                  background: showPaymentHistory ? '#89b4fa' : '#313244',
                  color: showPaymentHistory ? '#1e1e2e' : '#cdd6f4',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showPaymentHistory ? 'Ẩn lịch sử' : '💳 Lịch sử thanh toán'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {error && (
          <div style={{
            background: '#f38ba8',
            color: '#1e1e2e',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {loading && !progress && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6c7086' }}>
            Đang tải dữ liệu...
          </div>
        )}

        {/* Student selector */}
        {students.length > 0 && (
          <div style={{
            background: '#181825',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
          }}>
            <label style={{ fontSize: '13px', color: '#6c7086', marginBottom: '8px', display: 'block' }}>
              Chọn học sinh
            </label>
            <StudentSelector
              students={students}
              selectedId={selectedStudentId}
              onSelect={setSelectedStudentId}
            />
          </div>
        )}

        {/* No students linked */}
        {students.length === 0 && !loading && (
          <div style={{
            background: '#181825',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            color: '#6c7086',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧</div>
            <h3 style={{ color: '#cdd6f4', marginBottom: '8px' }}>Chưa có học sinh nào được liên kết</h3>
            <p>Vui lòng liên hệ với giáo viên để được thêm học sinh vào tài khoản của bạn.</p>
          </div>
        )}

        {/* Progress overview cards */}
        {progress && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}>
              {/* XP Card */}
              <div style={{
                background: '#181825',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>⭐</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#f9e2af' }}>
                  {progress.progress.totalXp}
                </div>
                <div style={{ fontSize: '13px', color: '#6c7086' }}>Tổng XP</div>
              </div>

              {/* Level Card */}
              <div style={{
                background: '#181825',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>🎯</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#89b4fa' }}>
                  {progress.progress.currentLevel}
                </div>
                <div style={{ fontSize: '13px', color: '#6c7086' }}>
                  {progress.progress.levelTitle}
                </div>
              </div>

              {/* Streak Card */}
              <div style={{
                background: '#181825',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>🔥</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#f38ba8' }}>
                  {progress.progress.currentStreakDays}
                </div>
                <div style={{ fontSize: '13px', color: '#6c7086' }}>Ngày liên tiếp</div>
              </div>

              {/* Lessons Card */}
              <div style={{
                background: '#181825',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>📚</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#a6e3a1' }}>
                  {progress.progress.lessonsCompleted}
                </div>
                <div style={{ fontSize: '13px', color: '#6c7086' }}>Bài đã học</div>
              </div>

              {/* Time spent Card */}
              <div style={{
                background: '#181825',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>⏱️</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#cba6f7' }}>
                  {formatTime(progress.progress.totalTimeSpentSeconds)}
                </div>
                <div style={{ fontSize: '13px', color: '#6c7086' }}>Thời gian học</div>
              </div>

              {/* Courses Card */}
              <div style={{
                background: '#181825',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '4px' }}>🎓</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#94e2d5' }}>
                  {progress.progress.coursesCompleted}
                </div>
                <div style={{ fontSize: '13px', color: '#6c7086' }}>Khóa hoàn thành</div>
              </div>
            </div>

            {/* AI Insights Section */}
            {insights && insights.insights && (
              <div style={{
                background: '#181825',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                border: '1px solid #313244',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>🤖</span>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#cdd6f4', margin: 0 }}>
                    Insights từ RoboBuddy
                  </h2>
                  {loadingInsights && (
                    <span style={{ fontSize: '12px', color: '#6c7086' }}>(Đang tạo...)</span>
                  )}
                </div>
                <div style={{
                  color: '#cdd6f4',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {insights.insights}
                </div>
              </div>
            )}

            {/* Payment History Section */}
            {showPaymentHistory && (
              <div style={{
                background: '#181825',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#cdd6f4', marginBottom: '16px' }}>
                  💳 Lịch sử thanh toán
                </h2>

                {payments.length === 0 ? (
                  <div style={{ color: '#6c7086', textAlign: 'center', padding: '20px' }}>
                    Chưa có lịch sử thanh toán
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #313244' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6c7086', fontSize: '12px' }}>Ngày</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6c7086', fontSize: '12px' }}>Phương thức</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6c7086', fontSize: '12px' }}>Số tiền</th>
                          <th style={{ textAlign: 'center', padding: '8px 12px', color: '#6c7086', fontSize: '12px' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => {
                          const statusColors: Record<string, string> = {
                            completed: '#a6e3a1',
                            pending: '#f9e2af',
                            failed: '#f38ba8',
                            cancelled: '#6c7086',
                            refunded: '#89b4fa',
                            processing: '#cba6f7',
                          };
                          const statusLabels: Record<string, string> = {
                            completed: 'Hoàn thành',
                            pending: 'Đang chờ',
                            failed: 'Thất bại',
                            cancelled: 'Đã hủy',
                            refunded: 'Đã hoàn tiền',
                            processing: 'Đang xử lý',
                          };
                          const methodLabels: Record<string, string> = {
                            zalopay: 'ZaloPay',
                            vnpay: 'VNPay',
                            bank_transfer: 'Chuyển khoản',
                            cash: 'Tiền mặt',
                          };

                          return (
                            <tr key={payment.id} style={{ borderBottom: '1px solid #313244' }}>
                              <td style={{ padding: '12px', color: '#cdd6f4', fontSize: '13px' }}>
                                {new Date(payment.created_at).toLocaleDateString('vi-VN')}
                              </td>
                              <td style={{ padding: '12px', color: '#cdd6f4', fontSize: '13px' }}>
                                {methodLabels[payment.payment_method] || payment.payment_method}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', color: '#a6e3a1', fontSize: '13px', fontWeight: 600 }}>
                                {new Intl.NumberFormat('vi-VN').format(payment.amount)} VNĐ
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: statusColors[payment.status] || '#6c7086',
                                  color: '#1e1e2e',
                                }}>
                                  {statusLabels[payment.status] || payment.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Charts and lists */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '20px',
            }}>
              <LearningHeatmaps enrollments={progress.enrollments} />
              <ProgressChart enrollments={progress.enrollments} />
              <LessonList enrollments={progress.enrollments} />
              <BadgeGrid badges={progress.badges} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
