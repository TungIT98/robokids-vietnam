import { ParentStudent } from '../services/parentApi';

interface StudentSelectorProps {
  students: ParentStudent[];
  selectedId: string | null;
  onSelect: (studentId: string) => void;
}

export default function StudentSelector({ students, selectedId, onSelect }: StudentSelectorProps) {
  if (students.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#6c7086' }}>
        Chưa có học sinh nào được liên kết
      </div>
    );
  }

  const selected = students.find(s => s.student.id === selectedId);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          background: '#313244',
          color: '#cdd6f4',
          border: '1px solid #45475a',
          borderRadius: '8px',
          padding: '10px 16px',
          fontSize: '15px',
          cursor: 'pointer',
          minWidth: '200px',
        }}
      >
        {students.map(({ student, relationship }) => (
          <option key={student.id} value={student.id}>
            {student.name || student.email} {relationship ? `(${relationship})` : ''}
          </option>
        ))}
      </select>
      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selected.student.avatarUrl ? (
            <img
              src={selected.student.avatarUrl}
              alt={selected.student.name || ''}
              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#89b4fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1e1e2e',
            }}>
              {(selected.student.name || '?')[0].toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: '13px', color: '#a6adc8' }}>
            {selected.student.gradeLevel ? `Lớp ${selected.student.gradeLevel}` : ''}
            {selected.student.schoolName ? ` - ${selected.student.schoolName}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}
