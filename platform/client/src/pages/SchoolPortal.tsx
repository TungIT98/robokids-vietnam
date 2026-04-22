/**
 * SchoolPortal - School Partnership Portal with role-based access
 * Roles:
 * - robokids_staff: Full access to all schools, can create schools, invite admins/teachers
 * - school_admin: Manage their school's teachers, classes, students
 * - teacher: View their school's basic info and their classes
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { schoolApi } from '../services/api';

interface School {
  id: string;
  name: string;
  address?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  code?: string;
  subscription_plan?: string;
  is_active?: boolean;
  created_at?: string;
}

interface Teacher {
  id: string;
  role: string;
  assigned_at: string;
  profile: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface SchoolClass {
  id: string;
  name: string;
  grade_level: number;
  teacher_id?: string;
  academic_year?: string;
  max_students?: number;
  student_count?: number;
  is_active?: boolean;
}

interface Student {
  relation_id: string;
  enrollment_date: string;
  status: string;
  student: {
    id: string;
    profile_id: string;
    grade_level: number;
    date_of_birth?: string;
    profile: {
      id: string;
      full_name?: string;
      email?: string;
    };
  };
  class?: {
    id: string;
    name: string;
    grade_level: number;
  };
}

type TabType = 'overview' | 'teachers' | 'classes' | 'students';

export default function SchoolPortal() {
  const { user, userRole } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<{
    teachers: number;
    students: number;
    classes: number;
    teacherCount?: number;
    studentCount?: number;
  } | null>(null);

  // Dialog states
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Form states
  const [teacherEmail, setTeacherEmail] = useState('');
  const [className, setClassName] = useState('');
  const [classGrade, setClassGrade] = useState<number>(1);
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'school_admin' | 'teacher'>('teacher');

  const token = localStorage.getItem('robokids_token');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (currentSchool) {
      loadSchoolData();
    }
  }, [currentSchool]);

  const loadSchools = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const { schools } = await schoolApi.getSchools(token);
      setSchools(schools);
      // For school_admin/teacher, they only see their own school
      if (schools.length === 1 && (userRole === 'school_admin' || userRole === 'teacher')) {
        setCurrentSchool(schools[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách trường');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchoolData = async () => {
    if (!currentSchool || !token) return;

    try {
      const [schoolRes, teachersRes, classesRes] = await Promise.all([
        schoolApi.getSchool(token, currentSchool.id),
        schoolApi.getTeachers(token, currentSchool.id),
        schoolApi.getClasses(token, currentSchool.id),
      ]);

      // Set school data with additional info for robokids_staff
      setCurrentSchool(schoolRes.school);

      // Flatten teachers data (handle nested profile)
      const flattenedTeachers = teachersRes.teachers.map((t: any) => ({
        ...t,
        profile: t.profile || {},
      }));
      setTeachers(flattenedTeachers);
      setClasses(classesRes.classes || []);

      // Load stats
      setStats({
        teachers: flattenedTeachers.length,
        students: schoolRes.school.student_count || 0,
        classes: (classesRes.classes || []).length,
        teacherCount: schoolRes.school.teacher_count,
        studentCount: schoolRes.school.student_count,
      });

      // Load students for robokids_staff or school_admin
      if (userRole && ['robokids_staff', 'school_admin'].includes(userRole)) {
        const studentsRes = await schoolApi.getStudents(token, currentSchool.id);
        setStudents(studentsRes.students || []);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin trường');
    }
  };

  const handleAddTeacher = async () => {
    if (!token || !currentSchool || !teacherEmail) return;
    try {
      await schoolApi.addTeacher(token, currentSchool.id, teacherEmail);
      setTeacherEmail('');
      setShowAddTeacher(false);
      loadSchoolData();
    } catch (err: any) {
      setError(err.message || 'Không thể thêm giáo viên');
    }
  };

  const handleCreateClass = async () => {
    if (!token || !currentSchool || !className) return;
    try {
      await schoolApi.createClass(token, currentSchool.id, {
        name: className,
        grade_level: classGrade,
      });
      setClassName('');
      setClassGrade(1);
      setShowAddClass(false);
      loadSchoolData();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo lớp');
    }
  };

  const handleCreateSchool = async () => {
    if (!token || !schoolName) return;
    try {
      const { school } = await schoolApi.createSchool(token, {
        name: schoolName,
        address: schoolAddress,
        city: schoolCity,
      });
      setSchoolName('');
      setSchoolAddress('');
      setSchoolCity('');
      setShowCreateSchool(false);
      loadSchools();
      setCurrentSchool(school);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo trường');
    }
  };

  const handleInvite = async () => {
    if (!token || !currentSchool || !inviteEmail) return;
    try {
      await schoolApi.inviteUser(token, inviteEmail, inviteRole, currentSchool.id);
      setInviteEmail('');
      setShowInvite(false);
      loadSchoolData();
    } catch (err: any) {
      setError(err.message || 'Không thể mời người dùng');
    }
  };

  const renderRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      robokids_staff: '#ef4444',
      school_admin: '#8b5cf6',
      teacher: '#3b82f6',
    };
    const labels: Record<string, string> = {
      robokids_staff: 'RoboKids Staff',
      school_admin: 'Quản trị trường',
      teacher: 'Giáo viên',
    };
    return (
      <span style={{ ...styles.roleBadge, backgroundColor: colors[role] || '#6b7280' }}>
        {labels[role] || role}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>Đang tải...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>🏫 School Partnership Portal</h1>
          <p style={styles.pageSubtitle}>Quản lý hợp tác với trường học</p>
        </div>
        <div style={styles.headerRight}>
          {userRole && renderRoleBadge(userRole)}
          <span style={styles.userInfo}>{user?.email}</span>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)} style={styles.closeError}>×</button>
        </div>
      )}

      {/* School Selector (robokids_staff only) */}
      {userRole === 'robokids_staff' && schools.length > 0 && (
        <div style={styles.schoolSelector}>
          <label style={styles.selectorLabel}>Chọn trường:</label>
          <select
            style={styles.schoolSelect}
            value={currentSchool?.id || ''}
            onChange={(e) => {
              const school = schools.find(s => s.id === e.target.value);
              setCurrentSchool(school || null);
            }}
          >
            <option value="">-- Chọn trường --</option>
            {schools.map(school => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
          {schools.length === 0 && (
            <button style={styles.createBtn} onClick={() => setShowCreateSchool(true)}>
              + Tạo trường mới
            </button>
          )}
        </div>
      )}

      {currentSchool ? (
        <>
          {/* School Info Card */}
          <div style={styles.schoolInfoCard}>
            <div style={styles.schoolInfoMain}>
              <h2 style={styles.schoolName}>{currentSchool.name}</h2>
              <p style={styles.schoolAddress}>
                {currentSchool.address && `${currentSchool.address}, `}
                {currentSchool.city || 'Chưa có địa chỉ'}
              </p>
              {currentSchool.code && (
                <span style={styles.schoolCode}>Mã: {currentSchool.code}</span>
              )}
            </div>
            {stats && (
              <div style={styles.statsRow}>
                <div style={styles.statItem}>
                  <span style={styles.statNumber}>{stats.teachers || stats.teacherCount || 0}</span>
                  <span style={styles.statLabel}>Giáo viên</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statNumber}>{stats.students || stats.studentCount || 0}</span>
                  <span style={styles.statLabel}>Học sinh</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statNumber}>{stats.classes || 0}</span>
                  <span style={styles.statLabel}>Lớp học</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'overview' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('overview')}
            >
              📊 Tổng quan
            </button>
            {userRole && ['robokids_staff', 'school_admin'].includes(userRole) && (
              <button
                style={{ ...styles.tab, ...(activeTab === 'teachers' ? styles.tabActive : {}) }}
                onClick={() => setActiveTab('teachers')}
              >
                👨‍🏫 Giáo viên
              </button>
            )}
            {userRole && ['robokids_staff', 'school_admin'].includes(userRole) && (
              <button
                style={{ ...styles.tab, ...(activeTab === 'classes' ? styles.tabActive : {}) }}
                onClick={() => setActiveTab('classes')}
              >
                🏫 Lớp học
              </button>
            )}
            {userRole && ['robokids_staff', 'school_admin'].includes(userRole) && (
              <button
                style={{ ...styles.tab, ...(activeTab === 'students' ? styles.tabActive : {}) }}
                onClick={() => setActiveTab('students')}
              >
                🎓 Học sinh
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div style={styles.tabContent}>
            {activeTab === 'overview' && (
              <div style={styles.overviewGrid}>
                {/* Quick Stats */}
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>📈 Thống kê nhanh</h3>
                  <div style={styles.quickStats}>
                    <div style={styles.quickStatItem}>
                      <span style={styles.quickStatLabel}>Tổng giáo viên</span>
                      <span style={styles.quickStatValue}>{teachers.length}</span>
                    </div>
                    <div style={styles.quickStatItem}>
                      <span style={styles.quickStatLabel}>Tổng lớp học</span>
                      <span style={styles.quickStatValue}>{classes.length}</span>
                    </div>
                    <div style={styles.quickStatItem}>
                      <span style={styles.quickStatLabel}>Tổng học sinh</span>
                      <span style={styles.quickStatValue}>{students.length}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>🕐 Hoạt động gần đây</h3>
                  <div style={styles.activityList}>
                    <p style={styles.emptyState}>Chưa có hoạt động</p>
                  </div>
                </div>

                {/* Quick Actions */}
                {userRole && ['robokids_staff', 'school_admin'].includes(userRole) && (
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>⚡ Thao tác nhanh</h3>
                    <div style={styles.quickActions}>
                      <button style={styles.actionBtn} onClick={() => setShowAddTeacher(true)}>
                        + Thêm giáo viên
                      </button>
                      <button style={styles.actionBtn} onClick={() => setShowAddClass(true)}>
                        + Tạo lớp học
                      </button>
                      {userRole === 'robokids_staff' && (
                        <button style={styles.actionBtn} onClick={() => setShowInvite(true)}>
                          📧 Mời quản trị
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teachers' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>👨‍🏫 Danh sách giáo viên</h3>
                  {userRole && ['robokids_staff', 'school_admin'].includes(userRole) && (
                    <button style={styles.addBtn} onClick={() => setShowAddTeacher(true)}>
                      + Thêm giáo viên
                    </button>
                  )}
                </div>
                {teachers.length === 0 ? (
                  <p style={styles.emptyState}>Chưa có giáo viên nào</p>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Tên</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Vai trò</th>
                        <th style={styles.th}>Ngày tham gia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map(teacher => (
                        <tr key={teacher.id} style={styles.tr}>
                          <td style={styles.td}>{teacher.profile?.full_name || '-'}</td>
                          <td style={styles.td}>{teacher.profile?.email || '-'}</td>
                          <td style={styles.td}>
                            <span style={styles.teacherRole}>{teacher.role}</span>
                          </td>
                          <td style={styles.td}>
                            {new Date(teacher.assigned_at).toLocaleDateString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'classes' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>🏫 Danh sách lớp học</h3>
                  {userRole && ['robokids_staff', 'school_admin'].includes(userRole) && (
                    <button style={styles.addBtn} onClick={() => setShowAddClass(true)}>
                      + Tạo lớp học
                    </button>
                  )}
                </div>
                {classes.length === 0 ? (
                  <p style={styles.emptyState}>Chưa có lớp học nào</p>
                ) : (
                  <div style={styles.classGrid}>
                    {classes.map(cls => (
                      <div key={cls.id} style={styles.classCard}>
                        <div style={styles.className}>{cls.name}</div>
                        <div style={styles.classInfo}>Khối {cls.grade_level}</div>
                        <div style={styles.classInfo}>
                          {cls.student_count || 0} / {cls.max_students || '∞'} học sinh
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'students' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>🎓 Danh sách học sinh</h3>
                </div>
                {students.length === 0 ? (
                  <p style={styles.emptyState}>Chưa có học sinh nào</p>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Tên</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Khối</th>
                        <th style={styles.th}>Lớp</th>
                        <th style={styles.th}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.relation_id} style={styles.tr}>
                          <td style={styles.td}>
                            {student.student?.profile?.full_name || '-'}
                          </td>
                          <td style={styles.td}>
                            {student.student?.profile?.email || '-'}
                          </td>
                          <td style={styles.td}>Khối {student.student?.grade_level || '-'}</td>
                          <td style={styles.td}>{student.class?.name || '-'}</td>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: student.status === 'active' ? '#22c55e' : '#6b7280',
                            }}>
                              {student.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={styles.emptyContainer}>
          <div style={styles.emptyIcon}>🏫</div>
          <h2 style={styles.emptyTitle}>Chưa có trường học nào</h2>
          <p style={styles.emptyText}>
            {userRole === 'robokids_staff'
              ? 'Tạo trường học đầu tiên để bắt đầu'
              : 'Bạn chưa được assign vào trường học nào'}
          </p>
          {userRole === 'robokids_staff' && (
            <button style={styles.createBtn} onClick={() => setShowCreateSchool(true)}>
              + Tạo trường mới
            </button>
          )}
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Thêm giáo viên</h3>
            <input
              style={styles.input}
              type="email"
              placeholder="Email giáo viên"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
            />
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowAddTeacher(false)}>
                Hủy
              </button>
              <button style={styles.submitBtn} onClick={handleAddTeacher}>
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClass && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Tạo lớp học</h3>
            <input
              style={styles.input}
              type="text"
              placeholder="Tên lớp (VD: 6A)"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
            <select
              style={styles.input}
              value={classGrade}
              onChange={(e) => setClassGrade(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowAddClass(false)}>
                Hủy
              </button>
              <button style={styles.submitBtn} onClick={handleCreateClass}>
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create School Modal */}
      {showCreateSchool && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Tạo trường mới</h3>
            <input
              style={styles.input}
              type="text"
              placeholder="Tên trường"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
            <input
              style={styles.input}
              type="text"
              placeholder="Địa chỉ"
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
            />
            <input
              style={styles.input}
              type="text"
              placeholder="Thành phố"
              value={schoolCity}
              onChange={(e) => setSchoolCity(e.target.value)}
            />
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowCreateSchool(false)}>
                Hủy
              </button>
              <button style={styles.submitBtn} onClick={handleCreateSchool}>
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInvite && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Mời người dùng</h3>
            <input
              style={styles.input}
              type="email"
              placeholder="Email người dùng"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              style={styles.input}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'school_admin' | 'teacher')}
            >
              <option value="teacher">Giáo viên</option>
              <option value="school_admin">Quản trị trường</option>
            </select>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowInvite(false)}>
                Hủy
              </button>
              <button style={styles.submitBtn} onClick={handleInvite}>
                Mời
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    color: '#e4e4e7',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    color: '#ffffff',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#a1a1aa',
    margin: '4px 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 600,
  },
  userInfo: {
    color: '#a1a1aa',
    fontSize: '14px',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeError: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
  },
  schoolSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    backgroundColor: '#1e1e3f',
    padding: '16px',
    borderRadius: '12px',
  },
  selectorLabel: {
    fontSize: '14px',
    color: '#a1a1aa',
  },
  schoolSelect: {
    flex: 1,
    maxWidth: '400px',
    backgroundColor: '#0f0f23',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e4e4e7',
    fontSize: '14px',
  },
  createBtn: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  schoolInfoCard: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  schoolInfoMain: {
    flex: 1,
    minWidth: '200px',
  },
  schoolName: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    color: '#ffffff',
  },
  schoolAddress: {
    color: '#a1a1aa',
    margin: '8px 0 0',
    fontSize: '14px',
  },
  schoolCode: {
    display: 'inline-block',
    backgroundColor: '#3f3f5a',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    marginTop: '8px',
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
  },
  statItem: {
    textAlign: 'center',
  },
  statNumber: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '12px',
    color: '#a1a1aa',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    borderBottom: '1px solid #3f3f5a',
    paddingBottom: '8px',
    flexWrap: 'wrap',
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#a1a1aa',
    fontSize: '14px',
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
  },
  tabContent: {
    minHeight: '200px',
  },
  card: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 16px',
    color: '#ffffff',
  },
  addBtn: {
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #3f3f5a',
    color: '#a1a1aa',
    fontWeight: 600,
  },
  tr: {
    borderBottom: '1px solid #2d2d5a',
  },
  td: {
    padding: '10px 12px',
    color: '#e4e4e7',
  },
  teacherRole: {
    backgroundColor: '#3b82f6',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 600,
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 600,
  },
  classGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  classCard: {
    backgroundColor: '#0f0f23',
    borderRadius: '8px',
    padding: '16px',
  },
  className: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  classInfo: {
    fontSize: '13px',
    color: '#a1a1aa',
    marginTop: '4px',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  quickStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  quickStatItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #3f3f5a',
  },
  quickStatLabel: {
    color: '#a1a1aa',
    fontSize: '14px',
  },
  quickStatValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  actionBtn: {
    backgroundColor: '#0f0f23',
    color: '#e4e4e7',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  emptyState: {
    color: '#71717a',
    textAlign: 'center',
    padding: '40px 20px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#71717a',
    fontSize: '18px',
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 8px',
  },
  emptyText: {
    color: '#a1a1aa',
    fontSize: '16px',
    margin: '0 0 24px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 16px',
  },
  input: {
    width: '100%',
    backgroundColor: '#0f0f23',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#e4e4e7',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  cancelBtn: {
    backgroundColor: '#3f3f5a',
    color: '#e4e4e7',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};