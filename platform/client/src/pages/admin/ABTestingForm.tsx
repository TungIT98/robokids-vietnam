/**
 * ABTestingForm - Create/Edit A/B Testing Experiment
 * Features: name, description, hypothesis, dynamic variant builder, date range
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

interface Variant {
  id: string;
  name: string;
  weight: number;
}

interface ExperimentFormData {
  name: string;
  description: string;
  hypothesis: string;
  status: ExperimentStatus;
  variants: Variant[];
  startDate: string;
  endDate: string;
}

export default function ABTestingForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  const [formData, setFormData] = useState<ExperimentFormData>({
    name: '',
    description: '',
    hypothesis: '',
    status: 'draft',
    variants: [
      { id: 'v1', name: 'Control', weight: 50 },
      { id: 'v2', name: 'Variant A', weight: 50 },
    ],
    startDate: '',
    endDate: '',
  });

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadExperiment();
    }
  }, [id]);

  const loadExperiment = async () => {
    try {
      const token = localStorage.getItem('robokids_token');
      const response = await fetch(`${API_BASE}/api/experiments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const exp = data.experiment;
        setFormData({
          name: exp.name,
          description: exp.description,
          hypothesis: exp.hypothesis,
          status: exp.status,
          variants: exp.variants.map((v: Variant) => ({ id: v.id, name: v.name, weight: v.weight })),
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
        });
      } else {
        // Mock data for editing
        setFormData({
          name: 'Onboarding Flow v2',
          description: 'Thử nghiệm quy trình đăng ký mới với fewer steps',
          hypothesis: 'Giảm số bước đăng ký sẽ tăng tỷ lệ hoàn thành',
          status: 'running',
          variants: [
            { id: 'v1', name: 'Control', weight: 50 },
            { id: 'v2', name: 'Variant A', weight: 50 },
          ],
          startDate: '2026-04-01',
          endDate: '',
        });
      }
    } catch {
      setFormData({
        name: 'Onboarding Flow v2',
        description: 'Thử nghiệm quy trình đăng ký mới với fewer steps',
        hypothesis: 'Giảm số bước đăng ký sẽ tăng tỷ lệ hoàn thành',
        status: 'running',
        variants: [
          { id: 'v1', name: 'Control', weight: 50 },
          { id: 'v2', name: 'Variant A', weight: 50 },
        ],
        startDate: '2026-04-01',
        endDate: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ExperimentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVariantChange = (index: number, field: keyof Variant, value: string | number) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const addVariant = () => {
    const newId = `v${Date.now()}`;
    const newWeight = Math.floor(100 / (formData.variants.length + 1));
    const updatedVariants = formData.variants.map(v => ({
      ...v,
      weight: Math.floor(100 / (formData.variants.length + 1)),
    }));
    updatedVariants.push({ id: newId, name: `Variant ${String.fromCharCode(65 + formData.variants.length)}`, weight: newWeight });
    setFormData(prev => ({ ...prev, variants: updatedVariants }));
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length <= 2) return;
    const newVariants = formData.variants.filter((_, i) => i !== index);
    // Redistribute weights
    const equalWeight = Math.floor(100 / newVariants.length);
    const remainder = 100 - equalWeight * newVariants.length;
    newVariants.forEach((v, i) => {
      v.weight = i === 0 ? equalWeight + remainder : equalWeight;
    });
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const totalWeight = formData.variants.reduce((sum, v) => sum + v.weight, 0);
  const weightError = totalWeight !== 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weightError) {
      setError('Tổng trọng số phải bằng 100%');
      return;
    }
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên thí nghiệm');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const token = localStorage.getItem('robokids_token');

      if (isEditing) {
        await fetch(`${API_BASE}/api/experiments/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch(`${API_BASE}/api/experiments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      }
      navigate('/admin/ab-testing');
    } catch {
      // For demo, just navigate back
      navigate('/admin/ab-testing');
    } finally {
      setIsSaving(false);
    }
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
        <button style={styles.backBtn} onClick={() => navigate('/admin/ab-testing')}>
          ← Quay lại Dashboard
        </button>
        <h1 style={styles.pageTitle}>
          {isEditing ? '✏️ Chỉnh sửa thí nghiệm' : '🧪 Tạo thí nghiệm mới'}
        </h1>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Basic Info */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📝 Thông tin cơ bản</h2>

          <div style={styles.field}>
            <label style={styles.label}>Tên thí nghiệm *</label>
            <input
              style={styles.input}
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder="VD: Onboarding Flow v2"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mô tả</label>
            <textarea
              style={styles.textarea}
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Mô tả ngắn về thí nghiệm..."
              rows={3}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Giả thuyết (Hypothesis)</label>
            <textarea
              style={styles.textarea}
              value={formData.hypothesis}
              onChange={e => handleInputChange('hypothesis', e.target.value)}
              placeholder="VD: Giảm số bước đăng ký sẽ tăng tỷ lệ hoàn thành..."
              rows={2}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Trạng thái</label>
            <select
              style={styles.select}
              value={formData.status}
              onChange={e => handleInputChange('status', e.target.value)}
            >
              <option value="draft">Nháp (Draft)</option>
              <option value="running">Đang chạy (Running)</option>
              <option value="paused">Tạm dừng (Paused)</option>
              <option value="completed">Hoàn thành (Completed)</option>
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📅 Ngày chạy thí nghiệm</h2>

          <div style={styles.dateGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Ngày bắt đầu</label>
              <input
                style={styles.input}
                type="date"
                value={formData.startDate}
                onChange={e => handleInputChange('startDate', e.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Ngày kết thúc</label>
              <input
                style={styles.input}
                type="date"
                value={formData.endDate}
                onChange={e => handleInputChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Variants */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>🎯 Variants</h2>
            <button
              type="button"
              style={styles.addVariantBtn}
              onClick={addVariant}
              disabled={formData.variants.length >= 5}
            >
              + Thêm Variant
            </button>
          </div>

          <div style={styles.variantCards}>
            {formData.variants.map((variant, index) => (
              <div key={variant.id} style={styles.variantCard}>
                <div style={styles.variantHeader}>
                  <span style={styles.variantIndex}>Variant {index + 1}</span>
                  {formData.variants.length > 2 && (
                    <button
                      type="button"
                      style={styles.removeVariantBtn}
                      onClick={() => removeVariant(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Tên</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={variant.name}
                    onChange={e => handleVariantChange(index, 'name', e.target.value)}
                    placeholder="VD: Control, Variant A"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Trọng số (%)</label>
                  <div style={styles.weightInputWrapper}>
                    <input
                      style={styles.weightInput}
                      type="number"
                      min="0"
                      max="100"
                      value={variant.weight}
                      onChange={e => handleVariantChange(index, 'weight', parseInt(e.target.value) || 0)}
                    />
                    <span style={styles.weightPercent}>%</span>
                  </div>
                </div>

                <div style={styles.weightBar}>
                  <div
                    style={{
                      ...styles.weightBarFill,
                      width: `${variant.weight}%`,
                      backgroundColor: index === 0 ? '#6b7280' : `hsl(${(index * 60) % 360}, 70%, 50%)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.weightTotal, borderColor: weightError ? '#ef4444' : '#22c55e' }}>
            <span>Tổng trọng số: {totalWeight}%</span>
            {weightError && (
              <span style={styles.weightError}>Tổng phải bằng 100%</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={() => navigate('/admin/ab-testing')}
          >
            Hủy
          </button>
          <button
            type="submit"
            style={styles.saveBtn}
            disabled={isSaving || weightError}
          >
            {isSaving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo thí nghiệm'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    color: '#e4e4e7',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  backBtn: {
    backgroundColor: 'transparent',
    color: '#a1a1aa',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '8px',
    padding: '0',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    color: '#ffffff',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px',
    color: '#71717a',
    fontSize: '16px',
  },
  form: {
    maxWidth: '800px',
  },
  section: {
    backgroundColor: '#1e1e3f',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 16px',
    color: '#ffffff',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#a1a1aa',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    backgroundColor: '#0f0f23',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e4e4e7',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    backgroundColor: '#0f0f23',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e4e4e7',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    backgroundColor: '#0f0f23',
    border: '1px solid #3f3f5a',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e4e4e7',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
  },
  dateGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  variantCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  variantCard: {
    backgroundColor: '#0f0f23',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #2d2d5a',
  },
  variantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  variantIndex: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#a1a1aa',
  },
  removeVariantBtn: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px',
  },
  weightInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#1e1e3f',
    border: '1px solid #3f3f5a',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#e4e4e7',
    fontSize: '14px',
    width: '80px',
  },
  weightPercent: {
    color: '#a1a1aa',
    fontSize: '14px',
  },
  weightBar: {
    height: '4px',
    backgroundColor: '#2d2d5a',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  weightBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.2s ease',
  },
  addVariantBtn: {
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  weightTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#0f0f23',
    borderRadius: '8px',
    border: '2px solid',
    fontSize: '14px',
    fontWeight: 600,
  },
  weightError: {
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: 400,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveBtn: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};