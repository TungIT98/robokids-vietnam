/**
 * SettingsPage - User settings and preferences
 * Features: profile edit, password change, language, notifications, theme, account deletion
 */

import { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Input,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import css from './SettingsPage.module.css';

// Divider replacement for Chakra v3
const Separator = () => <Box borderBottom="1px solid" borderColor="gray.200" my={2} />;

interface ProfileForm {
  fullName: string;
  dateOfBirth: string;
  phone: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'language' | 'danger'>('profile');

  // Profile state - use any for user metadata since Supabase types vary
  const userMeta = (user as any)?.user_metadata || {};
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    fullName: userMeta?.full_name || '',
    dateOfBirth: userMeta?.date_of_birth || '',
    phone: userMeta?.phone || '',
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailLessons: true,
    emailProgress: true,
    emailWeekly: false,
    pushLessons: true,
    pushAchievements: true,
    pushReminders: true,
  });

  // Language & theme
  const [language, setLanguage] = useState('vi');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const handleProfileUpdate = async () => {
    if (!profileForm.fullName.trim()) {
      showToast('error', 'Vui lòng nhập họ tên');
      return;
    }
    setIsLoading(true);
    try {
      // TODO: Call API to update profile
      showToast('success', 'Cập nhật thông tin thành công');
    } catch (error) {
      showToast('error', 'Cập nhật thất bại');
    }
    setIsLoading(false);
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', 'Mật khẩu mới không khớp');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showToast('error', 'Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    setIsLoading(true);
    // TODO: Call API to change password
    showToast('success', 'Đổi mật khẩu thành công');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsLoading(false);
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
    showToast('success', 'Đã lưu cài đặt');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản? Hành động này không thể hoàn tác.')) {
      return;
    }
    setIsLoading(true);
    // TODO: Call API to delete account
    showToast('info', 'Vui lòng liên hệ hỗ trợ để xóa tài khoản');
    setIsLoading(false);
  };

  const tabs = [
    { id: 'profile', label: 'Hồ sơ', icon: '👤' },
    { id: 'password', label: 'Mật khẩu', icon: '🔐' },
    { id: 'notifications', label: 'Thông báo', icon: '🔔' },
    { id: 'language', label: 'Ngôn ngữ', icon: '🌐' },
    { id: 'danger', label: 'Nguy hiểm', icon: '⚠️' },
  ];

  return (
    <Box className={css.container}>
      <Container maxW="container.md" py={8}>
        <Heading size="lg" mb={6} color="gray.800">
          Cài đặt
        </Heading>

        <HStack gap={4} alignItems="flex-start" className={css.tabs}>
          {/* Sidebar tabs */}
          <VStack gap={1} alignItems="stretch" className={css.tabList}>
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'solid' : 'ghost'}
                justifyContent="flex-start"
                onClick={() => setActiveTab(tab.id as any)}
                className={activeTab === tab.id ? css.tabActive : css.tab}
              >
                {tab.icon} {tab.label}
              </Button>
            ))}
          </VStack>

          {/* Content */}
          <Box className={css.tabContent}>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <VStack gap={4} alignItems="stretch">
                <Heading size="md">Hồ sơ cá nhân</Heading>

                <HStack gap={4}>
                  <Box
                    w={12}
                    h={12}
                    borderRadius="full"
                    bg="blue.500"
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xl"
                    fontWeight="bold"
                  >
                    {profileForm.fullName?.charAt(0).toUpperCase() || '👤'}
                  </Box>
                  <Button variant="outline" size="sm">
                    Đổi ảnh
                  </Button>
                </HStack>

                <Box>
                  <Text mb={2}>Họ và tên</Text>
                  <Input
                    value={profileForm.fullName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, fullName: e.target.value })
                    }
                    placeholder="Nhập họ và tên"
                  />
                </Box>

                <Box>
                  <Text mb={2}>Ngày sinh</Text>
                  <Input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, dateOfBirth: e.target.value })
                    }
                  />
                </Box>

                <Box>
                  <Text mb={2}>Số điện thoại</Text>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    placeholder="0xxx xxx xxx"
                  />
                </Box>

                <Box>
                  <Text mb={2}>Email</Text>
                  <Input value={(user as any)?.email || ''} readOnly bg="gray.50" />
                </Box>

                <Button
                  colorScheme="blue"
                  onClick={handleProfileUpdate}
                  loading={isLoading}
                >
                  Lưu thay đổi
                </Button>
              </VStack>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <VStack gap={4} alignItems="stretch">
                <Heading size="md">Đổi mật khẩu</Heading>

                <Box>
                  <Text mb={2}>Mật khẩu hiện tại</Text>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </Box>

                <Box>
                  <Text mb={2}>Mật khẩu mới</Text>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    placeholder="Ít nhất 8 ký tự"
                  />
                </Box>

                <Box>
                  <Text mb={2}>Xác nhận mật khẩu mới</Text>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </Box>

                <Button
                  colorScheme="blue"
                  onClick={handlePasswordChange}
                  loading={isLoading}
                >
                  Đổi mật khẩu
                </Button>
              </VStack>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <VStack gap={4} alignItems="stretch">
                <Heading size="md">Thông báo</Heading>

                <Text fontSize="sm" color="gray.600">
                  Chọn cách bạn nhận thông báo từ RoboKids
                </Text>

                <Separator />

                <Heading size="sm">Email</Heading>
                <HStack justifyContent="space-between">
                  <Text>Thông báo khi hoàn thành bài học</Text>
                  <input
                    type="checkbox"
                    checked={notifications.emailLessons}
                    onChange={(e) =>
                      handleNotificationChange('emailLessons', e.target.checked)
                    }
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </HStack>
                <HStack justifyContent="space-between">
                  <Text>Báo cáo tiến độ hàng tuần</Text>
                  <input
                    type="checkbox"
                    checked={notifications.emailWeekly}
                    onChange={(e) =>
                      handleNotificationChange('emailWeekly', e.target.checked)
                    }
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </HStack>

                <Separator />

                <Heading size="sm">Push Notifications</Heading>
                <HStack justifyContent="space-between">
                  <Text>Thông báo khi hoàn thành bài học</Text>
                  <input
                    type="checkbox"
                    checked={notifications.pushLessons}
                    onChange={(e) =>
                      handleNotificationChange('pushLessons', e.target.checked)
                    }
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </HStack>
                <HStack justifyContent="space-between">
                  <Text>Khi nhận được huy hiệu mới</Text>
                  <input
                    type="checkbox"
                    checked={notifications.pushAchievements}
                    onChange={(e) =>
                      handleNotificationChange('pushAchievements', e.target.checked)
                    }
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </HStack>
                <HStack justifyContent="space-between">
                  <Text>Nhắc nhở học tập</Text>
                  <input
                    type="checkbox"
                    checked={notifications.pushReminders}
                    onChange={(e) =>
                      handleNotificationChange('pushReminders', e.target.checked)
                    }
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </HStack>
              </VStack>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <VStack gap={4} alignItems="stretch">
                <Heading size="md">Ngôn ngữ</Heading>

                <Box>
                  <Text mb={2}>Giao diện</Text>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: 'gray.300',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </Box>

                <Separator />

                <Heading size="md">Giao diện</Heading>
                <HStack gap={4}>
                  <Button
                    variant={theme === 'light' ? 'solid' : 'outline'}
                    onClick={() => setTheme('light')}
                  >
                    ☀️ Sáng
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'solid' : 'outline'}
                    onClick={() => setTheme('dark')}
                  >
                    🌙 Tối
                  </Button>
                </HStack>
              </VStack>
            )}

            {/* Danger Zone */}
            {activeTab === 'danger' && (
              <VStack gap={4} alignItems="stretch">
                <Heading size="md" color="red.600">
                  Vùng nguy hiểm
                </Heading>

                <Box bg="red.50" p={4} borderRadius="md" border="1px solid" borderColor="red.200">
                  <VStack alignItems="stretch" gap={3}>
                    <Text fontWeight="bold">Xóa tài khoản</Text>
                    <Text fontSize="sm">
                      Khi xóa tài khoản, tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
                      Bạn sẽ không thể khôi phục được.
                    </Text>
                    <Button colorScheme="red" variant="outline" onClick={handleDeleteAccount}>
                      Xóa tài khoản
                    </Button>
                  </VStack>
                </Box>

                <Box bg="gray.50" p={4} borderRadius="md">
                  <VStack alignItems="stretch" gap={3}>
                    <Text fontWeight="bold">Đăng xuất</Text>
                    <Text fontSize="sm">
                      Đăng xuất khỏi tài khoản này.
                    </Text>
                    <Button variant="outline" onClick={logout}>
                      Đăng xuất
                    </Button>
                  </VStack>
                </Box>
              </VStack>
            )}
          </Box>
        </HStack>
      </Container>
    </Box>
  );
}
