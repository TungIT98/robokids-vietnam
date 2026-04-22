import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Enrollment } from '../services/parentApi';

interface ProgressChartProps {
  enrollments: Enrollment[];
}

interface ChartData {
  name: string;
  completed: number;
  inProgress: number;
}

export default function ProgressChart({ enrollments }: ProgressChartProps) {
  // Calculate progress per course
  const data: ChartData[] = enrollments.map(e => ({
    name: e.courseName?.substring(0, 12) || 'Khóa học',
    completed: e.lessonsCompleted,
    inProgress: Math.max(0, e.progressPercent - e.lessonsCompleted * 10),
  }));

  if (data.length === 0) {
    return (
      <div style={{
        background: '#181825',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center',
        color: '#6c7086',
      }}>
        Chưa có dữ liệu khóa học
      </div>
    );
  }

  return (
    <div style={{ background: '#181825', borderRadius: '12px', padding: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#cdd6f4' }}>
        Tiến độ học tập
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
          <XAxis dataKey="name" stroke="#6c7086" fontSize={12} />
          <YAxis stroke="#6c7086" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: '#313244',
              border: '1px solid #45475a',
              borderRadius: '8px',
              color: '#cdd6f4',
            }}
            labelStyle={{ color: '#cdd6f4' }}
          />
          <Bar dataKey="completed" name="Bài hoàn thành" fill="#a6e3a1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="inProgress" name="Đang học" fill="#89b4fa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#a6e3a1', borderRadius: '2px' }} />
          <span style={{ fontSize: '12px', color: '#a6adc8' }}>Bài hoàn thành</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#89b4fa', borderRadius: '2px' }} />
          <span style={{ fontSize: '12px', color: '#a6adc8' }}>Đang học</span>
        </div>
      </div>
    </div>
  );
}
