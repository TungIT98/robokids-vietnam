import { Enrollment } from '../services/parentApi';

interface LessonListProps {
  enrollments: Enrollment[];
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function LessonList({ enrollments }: LessonListProps) {
  return (
    <div style={{ background: '#181825', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#cdd6f4' }}>
        Khóa học đã đăng ký
      </h3>
      {enrollments.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6c7086', padding: '24px' }}>
          Chưa đăng ký khóa học nào
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {enrollments.map(enrollment => (
            <div
              key={enrollment.id}
              style={{
                background: '#313244',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                background: enrollment.courseThumbnail ? `url(${enrollment.courseThumbnail})` : '#45475a',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {!enrollment.courseThumbnail && (
                  <span style={{ fontSize: '24px' }}>📚</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#cdd6f4', marginBottom: '4px' }}>
                  {enrollment.courseName || 'Khóa học'}
                </div>
                <div style={{ fontSize: '13px', color: '#a6adc8' }}>
                  {enrollment.lessonsCompleted} bài đã hoàn thành • {formatTime(enrollment.totalTimeSpentSeconds)} đã học
                </div>
                {enrollment.completedAt && (
                  <div style={{ fontSize: '12px', color: '#a6e3a1', marginTop: '2px' }}>
                    ✓ Hoàn thành {formatDate(enrollment.completedAt)}
                  </div>
                )}
              </div>

              {/* Progress */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: enrollment.progressPercent === 100 ? '#a6e3a1' : '#89b4fa',
                }}>
                  {enrollment.progressPercent}%
                </div>
                <div style={{ fontSize: '11px', color: '#6c7086' }}>hoàn thành</div>
              </div>

              {/* Progress bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: '#45475a',
                borderRadius: '0 0 10px 10px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${enrollment.progressPercent}%`,
                  height: '100%',
                  background: enrollment.progressPercent === 100 ? '#a6e3a1' : '#89b4fa',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
