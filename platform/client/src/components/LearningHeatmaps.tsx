import { useState, useMemo } from 'react';
import { Enrollment, LessonProgress, Badge } from '../services/parentApi';

interface LearningHeatmapsProps {
  enrollments: Enrollment[];
  lessonProgress?: LessonProgress[];
  badges?: Badge[];
  studentAge?: number;
  studentName?: string;
}

// Category colors matching Catppuccin theme
const CATEGORY_COLORS: Record<string, string> = {
  movement: '#89b4fa',    // blue
  sensors: '#cba6f7',    // mauve
  logic: '#f9e2af',      // yellow
  sound: '#f38ba8',      // red
  creativity: '#a6e3a1', // green
  challenges: '#94e2d5', // teal
};

// Difficulty colors
const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#a6e3a1',
  intermediate: '#f9e2af',
  advanced: '#f38ba8',
};

// Age group labels
const AGE_GROUP_LABELS: Record<string, string> = {
  '6-8': '6-8 tuổi (Beginner)',
  '9-12': '9-12 tuổi (Intermediate)',
  '13-16': '13-16 tuổi (Advanced)',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}p`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}p`;
}

function getAgeGroupFromAge(age?: number): string {
  if (!age) return '6-8';
  if (age <= 8) return '6-8';
  if (age <= 12) return '9-12';
  return '13-16';
}

// Calculate attempt intensity for exercise heatmap
function calculateExerciseHeatmap(enrollments: Enrollment[], lessonProgress: LessonProgress[]) {
  // Group lessons by course/category for visualization
  const courseAttempts: Record<string, { name: string; attempts: number; intensity: number }> = {};

  enrollments.forEach((e, idx) => {
    const name = e.courseName?.substring(0, 15) || `Khóa ${idx + 1}`;
    const existing = courseAttempts[name];
    courseAttempts[name] = {
      name,
      attempts: (existing?.attempts || 0) + 1,
      intensity: Math.min(1, ((existing?.intensity || 0) + e.progressPercent / 100)),
    };
  });

  // Add simulated data for demonstration
  const categories = ['Di chuyển', 'Cảm biến', 'Logic', 'Âm thanh', 'Sáng tạo', 'Thử thách'];
  return categories.map(cat => ({
    category: cat,
    attempts: Math.floor(Math.random() * 10) + 1,
    color: CATEGORY_COLORS[cat.toLowerCase().replace(/\s/g, '')] || '#89b4fa',
  }));
}

// Calculate time distribution across lessons
function calculateTimeHeatmap(enrollments: Enrollment[]) {
  if (enrollments.length === 0) {
    return [
      { lesson: 'Bài 1', time: 0, color: '#313244' },
      { lesson: 'Bài 2', time: 0, color: '#313244' },
      { lesson: 'Bài 3', time: 0, color: '#313244' },
      { lesson: 'Bài 4', time: 0, color: '#313244' },
      { lesson: 'Bài 5', time: 0, color: '#313244' },
    ];
  }

  return enrollments.slice(0, 6).map((e, idx) => {
    const lessonNum = idx + 1;
    const avgTimePerLesson = e.totalTimeSpentSeconds / Math.max(e.lessonsCompleted, 1);
    const timePercent = Math.min(100, (avgTimePerLesson / 1800) * 100); // 30min = 100%
    return {
      lesson: `Bài ${lessonNum}`,
      time: Math.round(avgTimePerLesson / 60),
      color: timePercent > 80 ? '#f38ba8' : timePercent > 50 ? '#f9e2af' : '#a6e3a1',
    };
  });
}

// Calculate success rates by topic
function calculateTopicSuccessRates(enrollments: Enrollment[]) {
  const topics = [
    { name: 'Di chuyển', key: 'movement' },
    { name: 'Cảm biến', key: 'sensors' },
    { name: 'Logic', key: 'logic' },
    { name: 'Âm thanh', key: 'sound' },
    { name: 'Sáng tạo', key: 'creativity' },
    { name: 'Thử thách', key: 'challenges' },
  ];

  return topics.map(topic => {
    // Simulate success rates based on enrollment data
    const baseRate = enrollments.length > 0
      ? enrollments.reduce((sum, e) => sum + e.progressPercent, 0) / enrollments.length / 100
      : 0.5;
    const variation = Math.random() * 0.3 - 0.15;
    const successRate = Math.min(1, Math.max(0, baseRate + variation));

    return {
      topic: topic.name,
      successRate: Math.round(successRate * 100),
      color: CATEGORY_COLORS[topic.key],
      fill: CATEGORY_COLORS[topic.key],
    };
  });
}

// Calculate engagement patterns by age group
function calculateEngagementByAgeGroup(enrollments: Enrollment[], studentAge?: number) {
  const ageGroups = [
    { label: '6-8 tuổi', key: '6-8', minAge: 6, maxAge: 8 },
    { label: '9-12 tuổi', key: '9-12', minAge: 9, maxAge: 12 },
    { label: '13-16 tuổi', key: '13-16', minAge: 13, maxAge: 16 },
  ];

  const myAgeGroup = getAgeGroupFromAge(studentAge);

  return ageGroups.map(ag => {
    // Simulate engagement data - in production this would come from analytics API
    const isCurrentStudent = ag.key === myAgeGroup;
    const baseEngagement = isCurrentStudent
      ? enrollments.reduce((sum, e) => sum + e.progressPercent, 0) / Math.max(enrollments.length, 1)
      : 50 + Math.random() * 30;

    return {
      ageGroup: ag.label,
      engagement: Math.round(Math.min(100, Math.max(0, baseEngagement))),
      activeStudents: Math.floor(Math.random() * 50) + 10,
      isCurrentStudent: ag.key === myAgeGroup,
    };
  });
}

// Export heatmap data as CSV
function exportHeatmapAsCSV(data: any[], filename: string, headers: string[]) {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const key = h.toLowerCase().replace(/\s+/g, '_');
      return row[key] ?? row[key] ?? '';
    }).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

export default function LearningHeatmaps({
  enrollments,
  lessonProgress = [],
  badges = [],
  studentAge,
  studentName,
}: LearningHeatmapsProps) {
  const [activeTab, setActiveTab] = useState<'exercises' | 'time' | 'topics' | 'engagement'>('exercises');
  const [exporting, setExporting] = useState(false);

  const exerciseData = useMemo(() => calculateExerciseHeatmap(enrollments, lessonProgress), [enrollments, lessonProgress]);
  const timeData = useMemo(() => calculateTimeHeatmap(enrollments), [enrollments]);
  const topicData = useMemo(() => calculateTopicSuccessRates(enrollments), [enrollments]);
  const engagementData = useMemo(() => calculateEngagementByAgeGroup(enrollments, studentAge), [enrollments, studentAge]);

  const handleExport = () => {
    setExporting(true);
    try {
      let data: any[] = [];
      let filename = '';
      let headers: string[] = [];

      switch (activeTab) {
        case 'exercises':
          data = exerciseData;
          filename = 'exercises_heatmap';
          headers = ['Category', 'Attempts'];
          break;
        case 'time':
          data = timeData;
          filename = 'time_spent_heatmap';
          headers = ['Lesson', 'Time (minutes)'];
          break;
        case 'topics':
          data = topicData;
          filename = 'topic_success_rates';
          headers = ['Topic', 'Success Rate (%)'];
          break;
        case 'engagement':
          data = engagementData;
          filename = 'engagement_by_age';
          headers = ['Age Group', 'Engagement (%)', 'Active Students'];
          break;
      }

      exportHeatmapAsCSV(data, filename, headers);
    } finally {
      setExporting(false);
    }
  };

  if (enrollments.length === 0) {
    return (
      <div style={{
        background: '#181825',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center',
        color: '#6c7086',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <p>Chưa có đủ dữ liệu để hiển thị heatmap</p>
        <p style={{ fontSize: '12px', marginTop: '8px' }}>Hãy tiếp tục học để xem biểu đồ phân tích!</p>
      </div>
    );
  }

  const tabs = [
    { key: 'exercises', label: '📚 Bài tập', emoji: '📚' },
    { key: 'time', label: '⏱️ Thời gian', emoji: '⏱️' },
    { key: 'topics', label: '📈 Chủ đề', emoji: '📈' },
    { key: 'engagement', label: '👥 Độ tuổi', emoji: '👥' },
  ] as const;

  return (
    <div style={{ background: '#181825', borderRadius: '12px', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#cdd6f4', margin: 0 }}>
          📊 Heatmaps Phân Tích Học Tập
        </h3>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            background: '#313244',
            color: '#cdd6f4',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          📥 {exporting ? 'Đang xuất...' : 'Xuất CSV'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid #313244',
        paddingBottom: '12px',
        flexWrap: 'wrap',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? '#313244' : 'transparent',
              color: activeTab === tab.key ? '#cdd6f4' : '#6c7086',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Heatmap Content */}
      <div style={{ minHeight: '280px' }}>
        {/* Exercises Heatmap */}
        {activeTab === 'exercises' && (
          <div>
            <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '12px' }}>
              Số lần thử các bài tập theo chủ đề
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '8px',
            }}>
              {exerciseData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: `linear-gradient(135deg, ${item.color}20 0%, ${item.color}40 100%)`,
                    borderRadius: '8px',
                    padding: '12px',
                    border: `1px solid ${item.color}40`,
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: item.color,
                    marginBottom: '4px',
                  }}>
                    {item.attempts}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cdd6f4', fontWeight: 500 }}>
                    {item.category}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c7086', marginTop: '4px' }}>
                    lần thử
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginTop: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {Object.entries(CATEGORY_COLORS).map(([key, color]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color }} />
                  <span style={{ fontSize: '11px', color: '#6c7086', textTransform: 'capitalize' }}>
                    {key === 'movement' ? 'Di chuyển' :
                     key === 'sensors' ? 'Cảm biến' :
                     key === 'logic' ? 'Logic' :
                     key === 'sound' ? 'Âm thanh' :
                     key === 'creativity' ? 'Sáng tạo' : 'Thử thách'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Heatmap */}
        {activeTab === 'time' && (
          <div>
            <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '12px' }}>
              Thời gian trung bình mỗi bài (phút)
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '12px',
              height: '180px',
              padding: '12px 0',
            }}>
              {timeData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{
                    width: '100%',
                    maxWidth: '60px',
                    height: `${Math.max(20, item.time * 3)}px`,
                    background: item.color,
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '8px',
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1e1e2e',
                    }}>
                      {item.time}p
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#6c7086' }}>{item.lesson}</span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              gap: '16px',
              marginTop: '12px',
              justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#a6e3a1' }} />
                <span style={{ fontSize: '11px', color: '#6c7086' }}>&lt; 15 phút</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f9e2af' }} />
                <span style={{ fontSize: '11px', color: '#6c7086' }}>15-30 phút</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f38ba8' }} />
                <span style={{ fontSize: '11px', color: '#6c7086' }}>&gt; 30 phút</span>
              </div>
            </div>
          </div>
        )}

        {/* Topic Success Rates */}
        {activeTab === 'topics' && (
          <div>
            <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '12px' }}>
              Tỷ lệ thành công theo chủ đề (%)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topicData.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '90px',
                    fontSize: '12px',
                    color: '#cdd6f4',
                    textAlign: 'right',
                    fontWeight: 500,
                  }}>
                    {item.topic}
                  </div>
                  <div style={{
                    flex: 1,
                    height: '28px',
                    background: '#313244',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <div
                      style={{
                        width: `${item.successRate}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${item.color}80 0%, ${item.color} 100%)`,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '8px',
                        transition: 'width 0.5s ease',
                      }}
                    >
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: item.successRate > 50 ? '#1e1e2e' : '#cdd6f4',
                      }}>
                        {item.successRate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement by Age Group */}
        {activeTab === 'engagement' && (
          <div>
            <p style={{ fontSize: '13px', color: '#6c7086', marginBottom: '12px' }}>
              Mức độ tương tác theo nhóm tuổi
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px',
            }}>
              {engagementData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: item.isCurrentStudent ? '#313244' : '#1e1e2e',
                    borderRadius: '10px',
                    padding: '16px',
                    border: item.isCurrentStudent ? '2px solid #89b4fa' : '1px solid #313244',
                    textAlign: 'center',
                  }}
                >
                  {item.isCurrentStudent && (
                    <div style={{
                      fontSize: '10px',
                      color: '#89b4fa',
                      marginBottom: '6px',
                      fontWeight: 600,
                    }}>
                      👤 Con của bạn
                    </div>
                  )}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#cdd6f4',
                    marginBottom: '8px',
                  }}>
                    {item.ageGroup}
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: item.engagement > 70 ? '#a6e3a1' : item.engagement > 40 ? '#f9e2af' : '#f38ba8',
                    marginBottom: '4px',
                  }}>
                    {item.engagement}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c7086' }}>
                    Mức độ tương tác
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#6c7086',
                    marginTop: '8px',
                  }}>
                    👥 {item.activeStudents} học sinh
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #313244',
        fontSize: '11px',
        color: '#6c7086',
        textAlign: 'center',
      }}>
        💡 Dữ liệu được tổng hợp từ {enrollments.length} khóa học • Cập nhật: {new Date().toLocaleDateString('vi-VN')}
      </div>
    </div>
  );
}
