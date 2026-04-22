/**
 * TeacherManagement - Teacher accounts management for School Admin Portal
 * Features: List teachers, add/remove teachers, teacher code generation
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './TeacherManagement.module.css';

interface Teacher {
  id: string;
  user_id: string;
  email: string;
  name?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  invite_code?: string;
}

export default function TeacherManagement() {
  const { user, token } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (user?.school_id) {
      loadTeachers();
    }
  }, [user?.school_id]);

  const loadTeachers = async () => {
    if (!user?.school_id) return;

    try {
      setIsLoading(true);
      const data = await schoolsApi.listTeachers(user.school_id, { token });
      setTeachers(data.teachers || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách giáo viên');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id || !newTeacherEmail.trim()) return;

    try {
      setIsAdding(true);
      setAddError(null);
      await schoolsApi.addTeacher(user.school_id, newTeacherEmail.trim(), 'teacher', { token });
      setSuccessMessage('Đã thêm giáo viên thành công!');
      setShowAddModal(false);
      setNewTeacherEmail('');
      setNewTeacherName('');
      await loadTeachers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setAddError(err.message || 'Không thể thêm giáo viên');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: string, teacherEmail: string) => {
    if (!user?.school_id) return;
    if (!confirm(`Bạn có chắc muốn xóa giáo viên ${teacherEmail}?`)) return;

    try {
      await schoolsApi.removeTeacher(user.school_id, teacherId, { token });
      setSuccessMessage('Đã xóa giáo viên!');
      await loadTeachers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Không thể xóa giáo viên');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleGenerateCode = async (teacherId: string) => {
    if (!user?.school_id) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3200'}/api/schools/${user.school_id}/teachers/${teacherId}/invite-code`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );
      const data = await response.json();
      if (data.invite_code) {
        setInviteCode(data.invite_code);
        setTimeout(() => setInviteCode(null), 10000);
      }
    } catch (err) {
      console.error('Failed to generate invite code:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className={`${styles.badge} ${styles.badgeActive}`}>Đang hoạt động</span>;
      case 'inactive':
        return <span className={`${styles.badge} ${styles.badgeInactive}`}>Không hoạt động</span>;
      case 'pending':
        return <span className={`${styles.badge} ${styles.badgePending}`}>Chờ xác nhận</span>;
      default:
        return <span className={`${styles.badge}`}>{status}</span>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Giáo viên</h1>
          <p className={styles.subtitle}>Quản lý tài khoản giáo viên trong trường</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
          <span className={styles.addIcon}>+</span>
          Thêm giáo viên
        </button>
      </div>

      {successMessage && (
        <div className={styles.successBanner}>{successMessage}</div>
      )}

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {inviteCode && (
        <div className={styles.inviteCodeBanner}>
          <span>Mã mời: <strong>{inviteCode}</strong></span>
          <button onClick={() => navigator.clipboard.writeText(inviteCode)} className={styles.copyBtn}>
            Sao chép
          </button>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Đang tải...</div>
      ) : teachers.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>👩‍🏫</span>
          <p>Chưa có giáo viên nào</p>
          <p className={styles.emptyHint}>Nhấn "Thêm giáo viên" để bắt đầu</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Tên</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher.id}>
                  <td className={styles.emailCell}>{teacher.email}</td>
                  <td>{teacher.name || '-'}</td>
                  <td>
                    <span className={styles.roleBadge}>
                      {teacher.role === 'teacher' ? 'Giáo viên' : teacher.role}
                    </span>
                  </td>
                  <td>{getStatusBadge(teacher.status)}</td>
                  <td className={styles.actionsCell}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleGenerateCode(teacher.id)}
                      title="Tạo mã mời"
                    >
                      🎫 Mã mời
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.removeBtn}`}
                      onClick={() => handleRemoveTeacher(teacher.id, teacher.email)}
                      title="Xóa giáo viên"
                    >
                      🗑️ Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Thêm Giáo viên Mới</h2>
              <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddTeacher}>
              <div className={styles.formGroup}>
                <label>Email giáo viên</label>
                <input
                  type="email"
                  className={styles.input}
                  value={newTeacherEmail}
                  onChange={e => setNewTeacherEmail(e.target.value)}
                  placeholder="teacher@school.edu.vn"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tên (tùy chọn)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newTeacherName}
                  onChange={e => setNewTeacherName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              {addError && <div className={styles.formError}>{addError}</div>}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isAdding}>
                  {isAdding ? 'Đang thêm...' : 'Thêm giáo viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
