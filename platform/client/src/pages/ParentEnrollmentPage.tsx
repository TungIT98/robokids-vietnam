/**
 * ParentEnrollmentPage - Beta enrollment form for RoboKids Vietnam
 * Allows parents to register their children for the STEM robotics beta program.
 * Kid-friendly design with emojis and Vietnamese language.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ParentEnrollmentPage.module.css';

// Time slot interface
interface TimeSlot {
  id: string;
  day: string;
  dayVi: string;
  time: string;
  slots: number;
  maxSlots: number;
  available: boolean;
  period: 'afternoon' | 'morning' | 'full';
}

// Available time slots with capacity
const AVAILABLE_SLOTS: TimeSlot[] = [
  // Weekday afternoons
  { id: 'mon-14', day: 'Monday', dayVi: 'Thứ 2', time: '14:00 - 15:30', slots: 3, maxSlots: 6, available: true, period: 'afternoon' },
  { id: 'tue-14', day: 'Tuesday', dayVi: 'Thứ 3', time: '14:00 - 15:30', slots: 5, maxSlots: 6, available: true, period: 'afternoon' },
  { id: 'wed-14', day: 'Wednesday', dayVi: 'Thứ 4', time: '14:00 - 15:30', slots: 2, maxSlots: 6, available: true, period: 'afternoon' },
  { id: 'thu-14', day: 'Thursday', dayVi: 'Thứ 5', time: '14:00 - 15:30', slots: 6, maxSlots: 6, available: false, period: 'afternoon' },
  { id: 'fri-14', day: 'Friday', dayVi: 'Thứ 6', time: '14:00 - 15:30', slots: 4, maxSlots: 6, available: true, period: 'afternoon' },
  // Weekend mornings
  { id: 'sat-09', day: 'Saturday', dayVi: 'Thứ 7', time: '09:00 - 10:30', slots: 2, maxSlots: 6, available: true, period: 'morning' },
  { id: 'sat-11', day: 'Saturday', dayVi: 'Thứ 7', time: '11:00 - 12:30', slots: 0, maxSlots: 6, available: false, period: 'morning' },
  { id: 'sun-09', day: 'Sunday', dayVi: 'CN', time: '09:00 - 10:30', slots: 4, maxSlots: 6, available: true, period: 'morning' },
  { id: 'sun-11', day: 'Sunday', dayVi: 'CN', time: '11:00 - 12:30', slots: 1, maxSlots: 6, available: true, period: 'morning' },
];

// Summer camp sessions
const SUMMER_CAMPS = [
  { id: 'camp-july-1', label: 'Hè 2026 - Đợt 1 (1-15/7)', weeks: '2 tuần', slots: 8, maxSlots: 12 },
  { id: 'camp-july-2', label: 'Hè 2026 - Đợt 2 (16-31/7)', weeks: '2 tuần', slots: 5, maxSlots: 12 },
  { id: 'camp-august', label: 'Hè 2026 - Đợt 3 (1-20/8)', weeks: '3 tuần', slots: 12, maxSlots: 12 },
];

interface FormData {
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childAge: string;
  classSchedule: string;
  selectedTimeSlot: string;
  selectedSummerCamp: string;
  consentDataProcessing: boolean;
  consentMarketing: boolean;
}

interface FormErrors {
  parentName?: string;
  email?: string;
  phone?: string;
  childName?: string;
  childAge?: string;
  classSchedule?: string;
  selectedTimeSlot?: string;
  selectedSummerCamp?: string;
  consentDataProcessing?: string;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error' | 'payment_pending';

interface PaymentSelectionState {
  enrollmentId: string;
  showPaymentOptions: boolean;
  selectedMethod: string;
  paymentUrl: string | null;
  qrCodeData: string | null;
  transactionId: string | null;
  loading: boolean;
}

export default function ParentEnrollmentPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    parentName: '',
    email: '',
    phone: '',
    childName: '',
    childAge: '',
    classSchedule: '',
    selectedTimeSlot: '',
    selectedSummerCamp: '',
    consentDataProcessing: false,
    consentMarketing: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [enrollmentId, setEnrollmentId] = useState<string>('');
  const [paymentState, setPaymentState] = useState<PaymentSelectionState>({
    enrollmentId: '',
    showPaymentOptions: false,
    selectedMethod: '',
    paymentUrl: null,
    qrCodeData: null,
    transactionId: null,
    loading: false,
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.parentName.trim()) {
      newErrors.parentName = 'Vui lòng nhập tên phụ huynh';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại Zalo';
    } else if (!/^[0-9]{9,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ (9-11 số)';
    }

    if (!formData.childName.trim()) {
      newErrors.childName = 'Vui lòng nhập tên bé';
    }

    if (!formData.childAge) {
      newErrors.childAge = 'Vui lòng chọn độ tuổi của bé';
    }

    if (!formData.classSchedule) {
      newErrors.classSchedule = 'Vui lòng chọn lịch học mong muốn';
    } else if (formData.classSchedule === 'summer-camp' && !formData.selectedSummerCamp) {
      newErrors.selectedSummerCamp = 'Vui lòng chọn đợt Summer Camp';
    } else if (formData.classSchedule !== 'summer-camp' && !formData.selectedTimeSlot) {
      newErrors.selectedTimeSlot = 'Vui lòng chọn khung giờ cụ thể';
    }

    if (!formData.consentDataProcessing) {
      newErrors.consentDataProcessing = 'Bạn cần đồng ý với điều khoản để tiếp tục';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleScheduleTypeChange = (scheduleType: string) => {
    setFormData(prev => ({
      ...prev,
      classSchedule: scheduleType,
      selectedTimeSlot: '',
      selectedSummerCamp: '',
    }));
    setErrors(prev => ({ ...prev, classSchedule: undefined, selectedTimeSlot: undefined, selectedSummerCamp: undefined }));
  };

  const handleTimeSlotSelect = (slotId: string) => {
    setFormData(prev => ({ ...prev, selectedTimeSlot: slotId }));
    setErrors(prev => ({ ...prev, selectedTimeSlot: undefined }));
  };

  const handleSummerCampSelect = (campId: string) => {
    setFormData(prev => ({ ...prev, selectedSummerCamp: campId }));
    setErrors(prev => ({ ...prev, selectedSummerCamp: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE}/api/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_name: formData.parentName,
          email: formData.email,
          phone: formData.phone,
          child_name: formData.childName,
          child_age: parseInt(formData.childAge),
          class_schedule: formData.classSchedule,
          time_slot: formData.selectedTimeSlot,
          summer_camp_id: formData.selectedSummerCamp,
          consent_data_processing: formData.consentDataProcessing,
          consent_marketing: formData.consentMarketing,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      const newEnrollmentId = data.enrollment_id || `demo-${Date.now()}`;
      setEnrollmentId(newEnrollmentId);

      // After enrollment success, automatically create a payment
      setPaymentState({
        enrollmentId: newEnrollmentId,
        showPaymentOptions: true,
        selectedMethod: '',
        paymentUrl: null,
        qrCodeData: null,
        transactionId: null,
        loading: true,
      });

      // Create payment with default method (zalopay) first
      try {
        const paymentResponse = await fetch(`${API_BASE}/api/payments/create-public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollment_id: newEnrollmentId,
            payment_method: 'zalopay', // Default for beta
          }),
        });

        const paymentData = await paymentResponse.json();

        if (paymentResponse.ok) {
          setPaymentState(prev => ({
            ...prev,
            paymentUrl: paymentData.payment_url,
            qrCodeData: paymentData.qr_code_data,
            transactionId: paymentData.transaction_id,
            loading: false,
          }));

          // If payment URL exists, redirect for ZaloPay
          if (paymentData.payment_url) {
            setSubmitStatus('payment_pending');
          } else {
            // Cash/bank transfer - show payment options
            setSubmitStatus('payment_pending');
          }
        } else {
          // Payment creation failed - still show success but let them know
          setSubmitStatus('success');
        }
      } catch (paymentError) {
        console.error('Payment creation error:', paymentError);
        // Don't fail enrollment if payment fails
        setSubmitStatus('success');
      }
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  const handleBackToHome = () => {
    navigate('/login');
  };

  // Success state (enrollment complete, no payment needed)
  if (submitStatus === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>🎉</div>
          <h1 className={styles.successTitle}>Đăng ký thành công!</h1>
          <p className={styles.successMessage}>
            Cảm ơn bạn đã đăng ký cho con tham gia chương trình Beta của RoboKids Vietnam!
          </p>
          <div className={styles.enrollmentInfo}>
            <span className={styles.enrollmentLabel}>Mã đăng ký:</span>
            <span className={styles.enrollmentId}>{enrollmentId}</span>
          </div>
          <p className={styles.successHint}>
            📱 Nhân viên RoboKids sẽ liên hệ qua Zalo trong vòng 24 giờ để xác nhận thông tin và hướng dẫn các bước tiếp theo.
          </p>
          <div className={styles.successActions}>
            <button onClick={handleBackToHome} className={styles.successButton}>
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment pending state - show payment options or redirect
  if (submitStatus === 'payment_pending') {
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
    };

    const handlePaymentRedirect = () => {
      if (paymentState.paymentUrl) {
        window.location.href = paymentState.paymentUrl;
      }
    };

    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>🎉</div>
          <h1 className={styles.successTitle}>Đăng ký thành công!</h1>
          <p className={styles.successMessage}>
            Con bạn đã được đăng ký vào chương trình RoboKids Vietnam Beta!
          </p>
          <div className={styles.enrollmentInfo}>
            <span className={styles.enrollmentLabel}>Mã đăng ký:</span>
            <span className={styles.enrollmentId}>{enrollmentId}</span>
          </div>

          {/* Payment Section */}
          <div className={styles.paymentSection}>
            <h2 className={styles.paymentTitle}>Thanh toán phí đăng ký</h2>
            <div className={styles.paymentAmount}>
              <span className={styles.paymentAmountLabel}>Số tiền:</span>
              <span className={styles.paymentAmountValue}>{formatAmount(299000)}</span>
            </div>

            {paymentState.loading ? (
              <div className={styles.paymentLoading}>
                <div className={styles.spinner}></div>
                <p>Đang khởi tạo thanh toán...</p>
              </div>
            ) : paymentState.paymentUrl ? (
              <div className={styles.paymentReady}>
                <p className={styles.paymentHint}>
                  Bấm nút bên dưới để chuyển sang thanh toán qua ZaloPay
                </p>
                <button onClick={handlePaymentRedirect} className={styles.paymentButton}>
                  Thanh toán ngay với ZaloPay
                </button>
                {paymentState.qrCodeData && (
                  <div className={styles.qrCodeSection}>
                    <p>Hoặc quét mã QR:</p>
                    <img src={paymentState.qrCodeData} alt="Payment QR Code" className={styles.qrCode} />
                  </div>
                )}
                <div className={styles.transactionInfo}>
                  <span>Mã giao dịch: {paymentState.transactionId}</span>
                </div>
              </div>
            ) : (
              <div className={styles.paymentOffline}>
                <p>Thông tin thanh toán sẽ được gửi qua Zalo trong 24 giờ.</p>
                <p>Nhân viên RoboKids sẽ hướng dẫn bạn các bước thanh toán tiếp theo.</p>
              </div>
            )}
          </div>

          <div className={styles.successActions}>
            <button onClick={handleBackToHome} className={styles.successButton}>
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logoSection}>
          <span className={styles.logo}>🤖</span>
          <div>
            <h1 className={styles.title}>RoboKids Vietnam</h1>
            <p className={styles.subtitle}>Đăng ký chương trình Beta</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>📝 Phiếu đăng ký</h2>
          <p className={styles.formDesc}>
            Cho con bạn cơ hội trải nghiệm lập trình robot thú vị cùng RoboKids!
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Parent Info Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👨‍👩‍👧 Thông tin phụ huynh</h3>

            <div className={styles.field}>
              <label className={styles.label}>Họ và tên phụ huynh</label>
              <input
                type="text"
                name="parentName"
                value={formData.parentName}
                onChange={handleChange}
                placeholder="Nhập tên của bạn"
                className={`${styles.input} ${errors.parentName ? styles.inputError : ''}`}
              />
              {errors.parentName && <span className={styles.errorText}>{errors.parentName}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              />
              {errors.email && <span className={styles.errorText}>{errors.email}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Số điện thoại Zalo</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="09xxxxxxxx"
                className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
              />
              {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
              <span className={styles.hint}>Chúng tôi sẽ liên hệ qua Zalo để hướng dẫn các bước tiếp theo</span>
            </div>
          </div>

          {/* Child Info Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👶 Thông tin bé</h3>

            <div className={styles.field}>
              <label className={styles.label}>Tên bé</label>
              <input
                type="text"
                name="childName"
                value={formData.childName}
                onChange={handleChange}
                placeholder="Nhập tên của bé"
                className={`${styles.input} ${errors.childName ? styles.inputError : ''}`}
              />
              {errors.childName && <span className={styles.errorText}>{errors.childName}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Độ tuổi của bé</label>
              <select
                name="childAge"
                value={formData.childAge}
                onChange={handleChange}
                className={`${styles.select} ${errors.childAge ? styles.inputError : ''}`}
              >
                <option value="">-- Chọn độ tuổi --</option>
                <option value="6">6 tuổi</option>
                <option value="7">7 tuổi</option>
                <option value="8">8 tuổi (Lớp 1-2)</option>
                <option value="9">9 tuổi (Lớp 3)</option>
                <option value="10">10 tuổi (Lớp 4)</option>
                <option value="11">11 tuổi (Lớp 5)</option>
                <option value="12">12 tuổi (Lớp 6)</option>
                <option value="13">13 tuổi (Lớp 7)</option>
                <option value="14">14 tuổi (Lớp 8)</option>
                <option value="15">15 tuổi (Lớp 9)</option>
                <option value="16">16 tuổi (Lớp 10)</option>
              </select>
              {errors.childAge && <span className={styles.errorText}>{errors.childAge}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Lịch học mong muốn</label>
              <div className={styles.scheduleTabs}>
                <button
                  type="button"
                  className={`${styles.scheduleTab} ${formData.classSchedule && formData.classSchedule !== 'summer-camp' ? styles.scheduleTabActive : ''}`}
                  onClick={() => handleScheduleTypeChange('weekday-afternoon')}
                >
                  📅 Theo tuần
                </button>
                <button
                  type="button"
                  className={`${styles.scheduleTab} ${formData.classSchedule === 'summer-camp' ? styles.scheduleTabActive : ''}`}
                  onClick={() => handleScheduleTypeChange('summer-camp')}
                >
                  ☀️ Summer Camp
                </button>
              </div>
              {formData.classSchedule && (
                <div className={styles.scheduleHint}>
                  {formData.classSchedule === 'summer-camp'
                    ? 'Chọn đợt Summer Camp phù hợp với lịch của bé'
                    : 'Chọn khung giờ cụ thể bên dưới'}
                </div>
              )}
              {errors.classSchedule && <span className={styles.errorText}>{errors.classSchedule}</span>}
            </div>

            {/* Time Slot Picker */}
            {formData.classSchedule && (
              <div className={styles.field}>
                <label className={styles.label}>
                  {formData.classSchedule === 'summer-camp' ? '📅 Chọn đợt Summer Camp' : '🕐 Chọn khung giờ cụ thể'}
                </label>

                {formData.classSchedule === 'summer-camp' ? (
                  <div className={styles.summerCampGrid}>
                    {SUMMER_CAMPS.map(camp => {
                      const isSelected = formData.selectedSummerCamp === camp.id;
                      const isFull = camp.slots >= camp.maxSlots;
                      return (
                        <div
                          key={camp.id}
                          className={`${styles.summerCampCard} ${isSelected ? styles.summerCampCardSelected : ''} ${isFull ? styles.summerCampCardFull : ''}`}
                          onClick={() => !isFull && handleSummerCampSelect(camp.id)}
                        >
                          <div className={styles.summerCampLabel}>{camp.label}</div>
                          <div className={styles.summerCampWeeks}>{camp.weeks}</div>
                          <div className={`${styles.summerCampSlots} ${isFull ? styles.slotsFull : ''}`}>
                            {isFull ? '❌ Hết chỗ' : `📚 ${camp.slots}/${camp.maxSlots} chỗ`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.timeSlotGrid}>
                    {/* Morning slots */}
                    <div className={styles.timeSlotPeriod}>
                      <span className={styles.timeSlotPeriodLabel}>🌅 Buổi sáng</span>
                      <div className={styles.timeSlotRow}>
                        {AVAILABLE_SLOTS.filter(s => s.period === 'morning').map(slot => {
                          const isSelected = formData.selectedTimeSlot === slot.id;
                          const isFull = !slot.available;
                          return (
                            <div
                              key={slot.id}
                              className={`${styles.timeSlotCard} ${isSelected ? styles.timeSlotCardSelected : ''} ${isFull ? styles.timeSlotCardFull : ''}`}
                              onClick={() => !isFull && handleTimeSlotSelect(slot.id)}
                            >
                              <div className={styles.timeSlotDay}>{slot.dayVi}</div>
                              <div className={styles.timeSlotTime}>{slot.time}</div>
                              <div className={`${styles.timeSlotAvailability} ${isFull ? styles.availabilityFull : ''}`}>
                                {isFull ? '❌' : `📚 ${slot.slots}/${slot.maxSlots}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Afternoon slots */}
                    <div className={styles.timeSlotPeriod}>
                      <span className={styles.timeSlotPeriodLabel}>🌇 Buổi chiều</span>
                      <div className={styles.timeSlotRow}>
                        {AVAILABLE_SLOTS.filter(s => s.period === 'afternoon').map(slot => {
                          const isSelected = formData.selectedTimeSlot === slot.id;
                          const isFull = !slot.available;
                          return (
                            <div
                              key={slot.id}
                              className={`${styles.timeSlotCard} ${isSelected ? styles.timeSlotCardSelected : ''} ${isFull ? styles.timeSlotCardFull : ''}`}
                              onClick={() => !isFull && handleTimeSlotSelect(slot.id)}
                            >
                              <div className={styles.timeSlotDay}>{slot.dayVi}</div>
                              <div className={styles.timeSlotTime}>{slot.time}</div>
                              <div className={`${styles.timeSlotAvailability} ${isFull ? styles.availabilityFull : ''}`}>
                                {isFull ? '❌' : `📚 ${slot.slots}/${slot.maxSlots}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {errors.selectedTimeSlot && <span className={styles.errorText}>{errors.selectedTimeSlot}</span>}
                {errors.selectedSummerCamp && <span className={styles.errorText}>{errors.selectedSummerCamp}</span>}
              </div>
            )}

            {/* Legacy schedule select (hidden, for form submission compatibility) */}
            <input type="hidden" name="classSchedule" value={formData.classSchedule} />
          </div>

          {/* Consent Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>✅ Đồng ý và Xác nhận</h3>

            <div className={styles.checkboxField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="consentDataProcessing"
                  checked={formData.consentDataProcessing}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <span>
                  Tôi đồng ý cho RoboKids Vietnam xử lý dữ liệu cá nhân của con tôi theo
                  <span className={styles.linkText}> Chính sách bảo mật </span>
                  và
                  <span className={styles.linkText}> Điều khoản sử dụng </span>
                  để phục vụ việc đăng ký chương trình học robotics.
                </span>
              </label>
              {errors.consentDataProcessing && (
                <span className={styles.errorText}>{errors.consentDataProcessing}</span>
              )}
            </div>

            <div className={styles.checkboxField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="consentMarketing"
                  checked={formData.consentMarketing}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <span>
                  Tôi đồng ý nhận thông tin về chương trình học, ưu đãi và hoạt động của
                  RoboKids Vietnam qua Zalo và email.
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          {submitStatus === 'error' && (
            <div className={styles.errorBanner}>
              ⚠️ {errorMessage || 'Có lỗi xảy ra. Vui lòng thử lại.'}
            </div>
          )}

          <button
            type="submit"
            disabled={submitStatus === 'submitting'}
            className={styles.submitButton}
            style={{ opacity: submitStatus === 'submitting' ? 0.7 : 1 }}
          >
            {submitStatus === 'submitting' ? '⏳ Đang gửi...' : '🚀 Đăng ký ngay'}
          </button>

          <p className={styles.disclaimer}>
            * Sau khi đăng ký, nhân viên RoboKids sẽ liên hệ qua Zalo để xác nhận và
            hướng dẫn các bước tiếp theo.
          </p>
        </form>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p>
          🤖 RoboKids Vietnam - STEM Robotics Education
        </p>
        <p className={styles.footerSmall}>
          Liên hệ: zalo.me/robokidsvn | hello@robokids.edu.vn
        </p>
      </div>
    </div>
  );
}