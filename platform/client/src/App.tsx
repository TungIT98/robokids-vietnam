import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { UserRole } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { CyberLoadingScreen } from './components/CyberLoadingScreen';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PasswordResetPage from './pages/PasswordResetPage';
import ParentEnrollmentPage from './pages/ParentEnrollmentPage';
import ParentCommunicationPage from './pages/ParentCommunicationPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailedPage from './pages/PaymentFailedPage';
import BlocklyIDE from './components/BlocklyIDE';
import LessonView from './pages/LessonView';
import ChallengeArenaPage from './pages/ChallengeArenaPage';
import ChallengeDetailPage from './pages/ChallengeDetailPage';
import ChallengeLeaderboardPage from './pages/ChallengeLeaderboardPage';
import CertificateVerificationPage from './pages/CertificateVerificationPage';
import LandingPage from './pages/LandingPage';
import SchoolPortal from './pages/SchoolPortal';
import SchoolAdminLoginPage from './pages/school-portal/SchoolAdminLoginPage';
import SchoolAdminDashboard from './pages/school-portal/SchoolAdminDashboard';
import TeacherManagement from './pages/school-portal/TeacherManagement';
import StudentOnboarding from './pages/school-portal/StudentOnboarding';
import ClassManagement from './pages/school-portal/ClassManagement';
import ProgressTracking from './pages/school-portal/ProgressTracking';
import BillingModule from './pages/school-portal/BillingModule';
import StaffBilling from './pages/staff-portal/StaffBilling';
import StaffReports from './pages/staff-portal/StaffReports';
import TeacherDashboard from './pages/teacher-portal/TeacherDashboard';
import TeacherClasses from './pages/teacher-portal/TeacherClasses';
import TeacherStudents from './pages/teacher-portal/TeacherStudents';
import TeacherProgress from './pages/teacher-portal/TeacherProgress';
import TeacherMonitoring from './pages/teacher-portal/TeacherMonitoring';
import CurriculumBuilder from './pages/teacher-portal/CurriculumBuilder';
import ClassroomMode from './pages/teacher-portal/ClassroomMode';
import SharedWhiteboardPage from './pages/whiteboard/SharedWhiteboard';
import ABTestingDashboard from './pages/admin/ABTestingDashboard';
import ABTestingDetail from './pages/admin/ABTestingDetail';
import ABTestingForm from './pages/admin/ABTestingForm';
import ApiKeysPage from './pages/admin/ApiKeysPage';
import ArenaLobby from './pages/arena/ArenaLobby';
import GameArena from './components/game/GameArena';
import RobotSimulatorPage from './pages/RobotSimulatorPage';
import QuestPage from './pages/QuestPage';

import NotFound from './pages/NotFound';
import UpgradePage from './pages/UpgradePage';
import { registerLazyRoute, initPrefetch } from './utils/prefetchUtils';

// Lazy-loaded pages for code splitting
const LazyCurriculumBrowser = lazy(() => import('./pages/CurriculumBrowser'));
const LazyMissionsPage = lazy(() => import('./pages/MissionsPage'));
const LazyBadgesPage = lazy(() => import('./pages/BadgesPage'));
const LazyLeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const LazyStudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const LazyParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const LazyCertificateDownloadPage = lazy(() => import('./pages/CertificateDownloadPage'));
const LazyLessonManagementPage = lazy(() => import('./pages/LessonManagementPage'));
const LazyAdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LazySettingsPage = lazy(() => import('./pages/SettingsPage'));
const LazyLiveClassPage = lazy(() => import('./pages/LiveClassPage'));
const LazyLiveClassRoom = lazy(() => import('./pages/LiveClassRoom'));
const LazyStreaksPage = lazy(() => import('./pages/StreaksPage'));
const LazyRewardsStorePage = lazy(() => import('./pages/RewardsStorePage'));

// Lazy-loaded pages with prefetch support
const LazySpaceAcademyPage = lazy(() => import('./pages/SpaceAcademyPage'));
const LazyArenaLobby = lazy(() => import('./pages/arena/ArenaLobby'));
const LazyVoxelBuilderPage = lazy(() => import('./pages/VoxelBuilderPage'));

// Register lazy routes for prefetching
registerLazyRoute('/space-academy', () => import('./pages/SpaceAcademyPage'));
registerLazyRoute('/challenges', () => import('./pages/ChallengeArenaPage'));
registerLazyRoute('/arena', () => import('./pages/arena/ArenaLobby'));
registerLazyRoute('/robot-simulator', () => import('./pages/RobotSimulatorPage'));
registerLazyRoute('/voxel-builder', () => import('./pages/VoxelBuilderPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Đang tải..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      {children}
    </Layout>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Đang tải..." />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

/**
 * RootRedirect - Redirects root path based on auth state
 * Unauthenticated -> /home (landing page)
 * Authenticated -> /dashboard (role-based dashboard)
 */
function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Đang tải..." />;
  }

  if (!user) {
    return <Navigate to="/home" replace />;
  }

  // Authenticated: redirect to role-based dashboard
  return <Navigate to="/dashboard" replace />;
}

/**
 * RoleBasedRoute - Redirects to appropriate dashboard based on user role
 * Used for post-login redirect to role-specific portal
 */
function RoleBasedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, userRole } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Đang tải..." />;
  }

  if (!user) {
    return <Navigate to="/school-portal/login" replace />;
  }

  // Redirect to role-specific dashboard
  if (userRole === 'school_admin') {
    return <Navigate to="/school-admin/dashboard" replace />;
  }
  if (userRole === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  if (userRole === 'robokids_staff' || userRole === 'admin') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Default: student/parent dashboard
  return <Navigate to="/dashboard" replace />;
}

/**
 * RequireRole - Protects routes that require specific roles
 */
function RequireRole({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: UserRole[] }) {
  const { user, isLoading, userRole } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Đang tải..." />;
  }

  if (!user) {
    return <Navigate to="/school-portal/login" replace />;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/school-portal/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  // Initialize prefetch system
  useEffect(() => {
    initPrefetch();
  }, []);

  return (
    <ChakraProvider value={defaultSystem}>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/home" element={<LandingPage />} />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicRoute>
                      <SignupPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicRoute>
                      <PasswordResetPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/enroll"
                  element={
                    <PublicRoute>
                      <ParentEnrollmentPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/payment/success"
                  element={<PaymentSuccessPage />}
                />
                <Route
                  path="/payment/failed"
                  element={<PaymentFailedPage />}
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <BlocklyIDE />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/live-classes"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyLiveClassPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/live-class/:sessionId"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyLiveClassRoom />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/curriculum"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyCurriculumBrowser />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyStudentDashboard />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/missions"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyMissionsPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/badges"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyBadgesPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/streaks"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyStreaksPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rewards-store"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyRewardsStorePage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyLeaderboardPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/parent-dashboard"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyParentDashboard />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/parent-communication"
                  element={
                    <ProtectedRoute>
                      <ParentCommunicationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/verify/:code"
                  element={<CertificateVerificationPage />}
                />
                <Route
                  path="/certificate"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyCertificateDownloadPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lesson-management"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyLessonManagementPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazyAdminDashboard />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ab-testing"
                  element={
                    <ProtectedRoute>
                      <ABTestingDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ab-testing/new"
                  element={
                    <ProtectedRoute>
                      <ABTestingForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ab-testing/:id"
                  element={
                    <ProtectedRoute>
                      <ABTestingDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ab-testing/:id/edit"
                  element={
                    <ProtectedRoute>
                      <ABTestingForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/api-keys"
                  element={
                    <ProtectedRoute>
                      <ApiKeysPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải..." />}>
                        <LazySettingsPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upgrade"
                  element={
                    <ProtectedRoute>
                      <UpgradePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/space-academy"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<CyberLoadingScreen text="Đang tải Space Academy..." />}>
                        <LazySpaceAcademyPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/robot-simulator"
                  element={
                    <ProtectedRoute>
                      <RobotSimulatorPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/voxel-builder"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<CyberLoadingScreen text="Đang tải Voxel Builder..." />}>
                        <LazyVoxelBuilderPage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/challenges"
                  element={
                    <ProtectedRoute>
                      <ChallengeArenaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quests"
                  element={
                    <ProtectedRoute>
                      <QuestPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/challenges/leaderboard"
                  element={
                    <ProtectedRoute>
                      <ChallengeLeaderboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/challenges/:id"
                  element={
                    <ProtectedRoute>
                      <ChallengeDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lesson/:slug"
                  element={
                    <ProtectedRoute>
                      <LessonView />
                    </ProtectedRoute>
                  }
                />

                {/* ============================================ */}
                {/* MULTIPLAYER ARENA ROUTES */}
                {/* ============================================ */}
                <Route
                  path="/arena"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingSpinner fullScreen text="Đang tải Arena..." />}>
                        <LazyArenaLobby />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/arena/:roomId"
                  element={
                    <ProtectedRoute>
                      <GameArena />
                    </ProtectedRoute>
                  }
                />

                {/* ============================================ */}
                {/* SCHOOL PARTNERSHIP PORTAL ROUTES */}
                {/* ============================================ */}

                {/* Public portal login */}
                <Route
                  path="/school-portal/login"
                  element={
                    <PublicRoute>
                      <SchoolAdminLoginPage />
                    </PublicRoute>
                  }
                />

                {/* Role-based redirect after login */}
                <Route
                  path="/school-portal"
                  element={
                    <RoleBasedRoute>
                      <div />
                    </RoleBasedRoute>
                  }
                />

                {/* School Admin Portal */}
                <Route
                  path="/school-admin/dashboard"
                  element={
                    <RequireRole allowedRoles={['school_admin']}>
                      <PortalLayout variant="school_admin">
                        <SchoolPortal />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/school-admin/teachers"
                  element={
                    <RequireRole allowedRoles={['school_admin']}>
                      <PortalLayout variant="school_admin">
                        <TeacherManagement />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/school-admin/students"
                  element={
                    <RequireRole allowedRoles={['school_admin', 'teacher']}>
                      <PortalLayout variant="school_admin">
                        <StudentOnboarding />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/school-admin/classes"
                  element={
                    <RequireRole allowedRoles={['school_admin', 'teacher']}>
                      <PortalLayout variant="school_admin">
                        <ClassManagement />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/school-admin/progress"
                  element={
                    <RequireRole allowedRoles={['school_admin', 'teacher']}>
                      <PortalLayout variant="school_admin">
                        <ProgressTracking />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/school-admin/billing"
                  element={
                    <RequireRole allowedRoles={['school_admin']}>
                      <PortalLayout variant="school_admin">
                        <BillingModule />
                      </PortalLayout>
                    </RequireRole>
                  }
                />

                {/* Teacher Portal */}
                <Route
                  path="/teacher/dashboard"
                  element={
                    <RequireRole allowedRoles={['teacher']}>
                      <PortalLayout variant="teacher">
                        <TeacherDashboard />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/teacher/classes"
                  element={
                    <RequireRole allowedRoles={['teacher']}>
                      <PortalLayout variant="teacher">
                        <TeacherClasses />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/teacher/students"
                  element={
                    <RequireRole allowedRoles={['teacher']}>
                      <PortalLayout variant="teacher">
                        <TeacherStudents />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/teacher/progress"
                  element={
                    <RequireRole allowedRoles={['teacher']}>
                      <PortalLayout variant="teacher">
                        <TeacherProgress />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/teacher/monitoring"
                  element={
                    <RequireRole allowedRoles={['teacher']}>
                      <PortalLayout variant="teacher">
                        <TeacherMonitoring />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/teacher/curriculum-builder"
                  element={
                    <RequireRole allowedRoles={['teacher']}>
                      <PortalLayout variant="teacher">
                        <CurriculumBuilder />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/teacher/classroom"
                  element={
                    <RequireRole allowedRoles={['teacher']}>
                      <PortalLayout variant="teacher">
                        <ClassroomMode />
                      </PortalLayout>
                    </RequireRole>
                  }
                />

                {/* Shared Whiteboard Routes */}
                <Route
                  path="/whiteboard"
                  element={
                    <ProtectedRoute>
                      <SharedWhiteboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/whiteboard/:sessionId"
                  element={
                    <ProtectedRoute>
                      <SharedWhiteboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* RoboKids Staff Portal */}
                <Route
                  path="/staff/dashboard"
                  element={
                    <RequireRole allowedRoles={['robokids_staff', 'admin']}>
                      <PortalLayout variant="robokids_staff">
                        <SchoolPortal />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/staff/schools"
                  element={
                    <RequireRole allowedRoles={['robokids_staff', 'admin']}>
                      <PortalLayout variant="robokids_staff">
                        <SchoolPortal />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/staff/billing"
                  element={
                    <RequireRole allowedRoles={['robokids_staff', 'admin']}>
                      <PortalLayout variant="robokids_staff">
                        <StaffBilling />
                      </PortalLayout>
                    </RequireRole>
                  }
                />
                <Route
                  path="/staff/reports"
                  element={
                    <RequireRole allowedRoles={['robokids_staff', 'admin']}>
                      <PortalLayout variant="robokids_staff">
                        <StaffReports />
                      </PortalLayout>
                    </RequireRole>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </ChakraProvider>
  );
}

export default App;
