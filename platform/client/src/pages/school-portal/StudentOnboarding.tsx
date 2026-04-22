/**
 * StudentOnboarding - Batch student import for School Admin Portal
 * Features: CSV upload, preview/validate data, bulk import with progress, parent email auto-invite
 */

import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolsApi } from '../../services/schoolsApi';
import styles from './StudentOnboarding.module.css';

interface StudentRow {
  name?: string;
  email?: string;
  grade?: number;
  date_of_birth?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  class_id?: string;
  rowIndex: number;
  isValid?: boolean;
  errors?: string[];
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export default function StudentOnboarding() {
  const { user, token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [sendWelcomeEmails, setSendWelcomeEmails] = useState(true);
  const [createParentAccounts, setCreateParentAccounts] = useState(true);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Vui lòng chọn file CSV');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setError('File CSV không có dữ liệu hoặc thiếu header');
        setIsProcessing(false);
        return;
      }

      // Parse CSV header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['name', 'email'];
      const missingHeaders = requiredHeaders.filter(h => !header.includes(h));

      if (missingHeaders.length > 0) {
        setError(`File CSV thiếu cột bắt buộc: ${missingHeaders.join(', ')}`);
        setIsProcessing(false);
        return;
      }

      // Parse rows
      const parsedStudents: StudentRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: StudentRow = {
          rowIndex: i,
        };

        header.forEach((col, idx) => {
          const value = values[idx] || '';
          switch (col) {
            case 'name':
              row.name = value;
              break;
            case 'email':
              row.email = value;
              break;
            case 'grade':
              row.grade = value ? parseInt(value) : undefined;
              break;
            case 'date_of_birth':
            case 'dateofbirth':
            case 'dob':
              row.date_of_birth = value;
              break;
            case 'parent_name':
            case 'parentname':
              row.parent_name = value;
              break;
            case 'parent_email':
            case 'parentemail':
              row.parent_email = value;
              break;
            case 'parent_phone':
            case 'parentphone':
              row.parent_phone = value;
              break;
            case 'class_id':
            case 'classid':
              row.class_id = value;
              break;
          }
        });

        // Basic validation
        row.errors = [];
        if (!row.name && !row.email) {
          row.errors.push('Cần có tên hoặc email');
        }
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          row.errors.push('Email không hợp lệ');
        }
        row.isValid = row.errors.length === 0;

        parsedStudents.push(row);
      }

      setStudents(parsedStudents);
      setStep('preview');
    } catch (err) {
      setError('Không thể đọc file CSV');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleValidate = async () => {
    if (!user?.school_id) return;

    try {
      setIsProcessing(true);
      const data = await schoolsApi.validateCsv(user.school_id, students.map(s => ({
        name: s.name,
        email: s.email,
        grade: s.grade,
        date_of_birth: s.date_of_birth,
        parent_name: s.parent_name,
        parent_email: s.parent_email,
        parent_phone: s.parent_phone,
        class_id: s.class_id || selectedClass,
      })), { token });

      // Update validation status
      const validated = students.map((s, idx) => ({
        ...s,
        isValid: !data.errors?.some((e: any) => e.row === idx),
        errors: data.errors?.filter((e: any) => e.row === idx).map((e: any) => e.message) || [],
      }));
      setStudents(validated);
    } catch (err) {
      setError('Không thể xác thực dữ liệu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!user?.school_id) return;

    try {
      setIsProcessing(true);
      setStep('importing');
      setProgress(0);

      const validStudents = students.filter(s => s.isValid).map(s => ({
        name: s.name,
        email: s.email,
        grade: s.grade,
        date_of_birth: s.date_of_birth,
        parent_name: s.parent_name,
        parent_email: s.parent_email,
        parent_phone: s.parent_phone,
        class_id: s.class_id || selectedClass,
      }));

      const total = validStudents.length;

      const result = await schoolsApi.batchImport(
        user.school_id,
        validStudents,
        {
          token,
          create_parent_accounts: createParentAccounts,
          send_welcome_emails: sendWelcomeEmails,
          default_grade: 6,
        }
      );

      setProgress(100);
      setImportResult({
        success: result.imported || total,
        failed: result.failed || 0,
        errors: result.errors || [],
      });
      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'Không thể nhập dữ liệu');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setStudents([]);
    setError(null);
    setProgress(0);
    setImportResult(null);
    setSelectedClass('');
  };

  const downloadTemplate = () => {
    const template = 'name,email,grade,date_of_birth,parent_name,parent_email,parent_phone,class_id\n';
    const sample = 'Nguyễn Văn A,student@example.com,6,2015-03-15,Nguyễn Thị B,parent@example.com,0912345678,\n';
    const blob = new Blob([template + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = students.filter(s => s.isValid).length;
  const invalidCount = students.length - validCount;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nhập Học sinh Hàng loạt</h1>
          <p className={styles.subtitle}>Tải lên file CSV để nhập nhiều học sinh cùng lúc</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className={styles.steps}>
        <div className={`${styles.step} ${step === 'upload' ? styles.stepActive : ''}`}>
          <span className={styles.stepNumber}>1</span>
          <span>Tải lên CSV</span>
        </div>
        <div className={styles.stepLine} />
        <div className={`${styles.step} ${step === 'preview' ? styles.stepActive : ''}`}>
          <span className={styles.stepNumber}>2</span>
          <span>Xem trước & Xác thực</span>
        </div>
        <div className={styles.stepLine} />
        <div className={`${styles.step} ${step === 'importing' ? styles.stepActive : ''}`}>
          <span className={styles.stepNumber}>3</span>
          <span>Đang nhập</span>
        </div>
        <div className={styles.stepLine} />
        <div className={`${styles.step} ${step === 'complete' ? styles.stepActive : ''}`}>
          <span className={styles.stepNumber}>4</span>
          <span>Hoàn thành</span>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className={styles.uploadSection}>
          <div className={styles.uploadCard}>
            <div className={styles.uploadIcon}>📥</div>
            <h3>Kéo thả file CSV vào đây</h3>
            <p>hoặc nhấn nút bên dưới để chọn file</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className={styles.fileInput}
            />
            <button
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? 'Đang xử lý...' : 'Chọn file CSV'}
            </button>
          </div>

          <div className={styles.templateSection}>
            <h4>Mẫu file CSV</h4>
            <p>Tải mẫu để đảm bảo đúng định dạng</p>
            <button className={styles.templateBtn} onClick={downloadTemplate}>
              📥 Tải mẫu CSV
            </button>
            <div className={styles.templateHint}>
              <p><strong>Các cột bắt buộc:</strong> name, email</p>
              <p><strong>Các cột tùy chọn:</strong> grade, date_of_birth, parent_name, parent_email, parent_phone, class_id</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className={styles.previewSection}>
          <div className={styles.previewStats}>
            <div className={styles.statCard}>
              <span className={styles.statIcon}>📋</span>
              <div>
                <span className={styles.statValue}>{students.length}</span>
                <span className={styles.statLabel}>Tổng số dòng</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.statValid}`}>
              <span className={styles.statIcon}>✅</span>
              <div>
                <span className={styles.statValue}>{validCount}</span>
                <span className={styles.statLabel}>Hợp lệ</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.statInvalid}`}>
              <span className={styles.statIcon}>⚠️</span>
              <div>
                <span className={styles.statValue}>{invalidCount}</span>
                <span className={styles.statLabel}>Không hợp lệ</span>
              </div>
            </div>
          </div>

          <div className={styles.optionsRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={createParentAccounts}
                onChange={e => setCreateParentAccounts(e.target.checked)}
              />
              <span>Tạo tài khoản phụ huynh</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={sendWelcomeEmails}
                onChange={e => setSendWelcomeEmails(e.target.checked)}
              />
              <span>Gửi email chào mừng</span>
            </label>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Lớp</th>
                  <th>Phụ huynh</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 50).map(s => (
                  <tr key={s.rowIndex} className={s.isValid ? '' : styles.invalidRow}>
                    <td>{s.rowIndex}</td>
                    <td>{s.name || '-'}</td>
                    <td>{s.email || '-'}</td>
                    <td>{s.grade || '-'}</td>
                    <td>{s.parent_email || '-'}</td>
                    <td>
                      {s.isValid ? (
                        <span className={styles.validBadge}>Hợp lệ</span>
                      ) : (
                        <span className={styles.invalidBadge} title={s.errors?.join(', ')}>
                          {s.errors?.[0] || 'Lỗi'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length > 50 && (
              <p className={styles.truncated}>Hiển thị 50/{students.length} dòng đầu tiên</p>
            )}
          </div>

          <div className={styles.actions}>
            <button className={styles.backBtn} onClick={handleReset}>
              ← Quay lại
            </button>
            <button
              className={styles.validateBtn}
              onClick={handleValidate}
              disabled={isProcessing}
            >
              {isProcessing ? 'Đang xác thực...' : 'Xác thực dữ liệu'}
            </button>
            <button
              className={styles.importBtn}
              onClick={handleImport}
              disabled={isProcessing || validCount === 0}
            >
              Nhập {validCount} học sinh
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className={styles.importingSection}>
          <div className={styles.progressWrapper}>
            <div className={styles.progressCircle}>
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" className={styles.progressBg} />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className={styles.progressFill}
                  strokeDasharray={`${progress * 2.83} 283`}
                />
              </svg>
              <span className={styles.progressText}>{Math.round(progress)}%</span>
            </div>
            <p className={styles.progressLabel}>Đang nhập dữ liệu học sinh...</p>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && importResult && (
        <div className={styles.completeSection}>
          <div className={styles.successIcon}>🎉</div>
          <h2>Hoàn thành!</h2>
          <div className={styles.resultStats}>
            <div className={styles.resultCard}>
              <span className={styles.resultValue}>{importResult.success}</span>
              <span className={styles.resultLabel}>Đã nhập thành công</span>
            </div>
            {importResult.failed > 0 && (
              <div className={`${styles.resultCard} ${styles.resultFailed}`}>
                <span className={styles.resultValue}>{importResult.failed}</span>
                <span className={styles.resultLabel}>Thất bại</span>
              </div>
            )}
          </div>
          {importResult.errors.length > 0 && (
            <div className={styles.errorList}>
              <h4>Các lỗi:</h4>
              <ul>
                {importResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>Dòng {e.row}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
          <button className={styles.doneBtn} onClick={handleReset}>
            Nhập thêm học sinh khác
          </button>
        </div>
      )}
    </div>
  );
}
