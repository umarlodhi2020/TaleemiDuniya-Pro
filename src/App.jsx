import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import LandingPage from './pages/public/LandingPage';
import Checkout from './pages/public/Checkout';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import TermsOfService from './pages/public/TermsOfService';
import Login from './pages/auth/Login';
import SuperAdminSetup from './pages/auth/SuperAdminSetup';
import SuperAdminDashboard from './pages/super-admin/Dashboard';
import SchoolsManager from './pages/super-admin/Schools';
import AddSchool from './pages/super-admin/AddSchool';
import EditSchool from './pages/super-admin/EditSchool';
import Subscriptions from './pages/super-admin/Subscriptions';
import Revenue from './pages/super-admin/Revenue';
import NotificationsCenter from './pages/super-admin/Notifications';
import SupportCenter from './pages/super-admin/Support';
import SuperAdminSettings from './pages/super-admin/SuperAdminSettings';
import SuperAdminAiAgent from './pages/super-admin/AiAgent';
import LandingPageCMS from './pages/super-admin/LandingPageCMS';
import EServices from './pages/school-admin/EServices';
import SchoolAdminDashboard from './pages/school-admin/Dashboard';
import InquiryManager from './pages/school-admin/InquiryManager';
import AddInquiry from './pages/school-admin/AddInquiry';
import StudentManager from './pages/school-admin/Students';
import AddStudent from './pages/school-admin/AddStudent';
import StaffManager from './pages/school-admin/StaffManager';
import AddStaff from './pages/school-admin/AddStaff';
import FeeManager from './pages/school-admin/FeeManager';
import AddFee from './pages/school-admin/AddFee';
import GenerateChallan from './pages/school-admin/GenerateChallan';
import AttendanceManager from './pages/school-admin/AttendanceManager';
import AttendanceRegister from './pages/school-admin/AttendanceRegister';
import FeeDefaulters from './pages/school-admin/FeeDefaulters';
import DailyDiary from './pages/school-admin/DailyDiary';
import PayrollManager from './pages/school-admin/PayrollManager';
import AdmissionCRM from './pages/school-admin/AdmissionCRM';
import OnlineQuizEngine from './pages/school-admin/OnlineQuizEngine';
import GatePassManager from './pages/school-admin/GatePassManager';
import MiniPocketApp from './pages/school-admin/MiniPocketApp';
import SchoolSubscriptionPortal from './pages/school-admin/SchoolSubscriptionPortal';
import Academics from './pages/school-admin/Academics';
import CustomReportCard from './pages/school-admin/CustomReportCard';
import ReportCardTemplates from './pages/school-admin/ReportCardTemplates';
import TimetableBuilder from './pages/school-admin/TimetableBuilder';
import StudentIdCards from './pages/school-admin/StudentIdCards';
import ChallanBook from './pages/school-admin/ChallanBook';
import ExpenseManager from './pages/school-admin/ExpenseManager';
import Exams from './pages/school-admin/Exams';
import AccountsManager from './pages/school-admin/AccountsManager';
import InventoryManager from './pages/school-admin/InventoryManager';
import SMSPanel from './pages/school-admin/SMSPanel';
import MarkResults from './pages/school-admin/MarkResults';
import FamilyTree from './pages/school-admin/FamilyTree';
import SingleStudent360 from './pages/school-admin/SingleStudent360';
import SpeakerPASystem from './pages/school-admin/SpeakerPASystem';
import StaffAttendanceHub from './pages/school-admin/StaffAttendanceHub';
import OtherIncomeManager from './pages/school-admin/OtherIncomeManager';
import ComprehensiveReportsHub from './pages/school-admin/ComprehensiveReportsHub';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherStudents from './pages/teacher/Students';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherExams from './pages/teacher/ExamsAndMarks';
import TeacherHomework from './pages/teacher/Homework';
import TeacherTimetable from './pages/teacher/Timetable';
import TeacherCommunication from './pages/teacher/Communication';
import TeacherLeave from './pages/teacher/LeaveManager';
import TeacherMaterial from './pages/teacher/StudyMaterial';
import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import StudentExams from './pages/student/Exams';
import StudentHomework from './pages/student/Homework';
import StudentTimetable from './pages/student/Timetable';
import StudentMaterial from './pages/student/StudyMaterial';
import ParentDashboard from './pages/parent/Dashboard';
import ParentAttendance from './pages/parent/Attendance';
import ParentFees from './pages/parent/Fees';
import ParentExams from './pages/parent/Exams';
import ParentAiChatbot from './pages/parent/AiChatbot';
import SchoolSettings from './pages/school-admin/Settings';
import DigitalLibrary from './pages/school-admin/DigitalLibrary';
import TransportManager from './pages/school-admin/TransportManager';
import RolesManager from './pages/school-admin/RolesManager';
import Collection from './pages/school-admin/Collection';
import PeriodBell from './pages/school-admin/PeriodBell';
import CertificateGenerator from './pages/school-admin/CertificateGenerator';
import HostelManager from './pages/school-admin/HostelManager';
import GatePassScanner from './pages/school-admin/GatePassScanner';
import BiometricSetup from './pages/school-admin/BiometricSetup';
import Reminders from './pages/school-admin/Reminders';
import CallLog from './pages/school-admin/CallLog';
import Social from './pages/school-admin/Social';
import AiAgent from './pages/school-admin/AiAgent';
import DataImport from './pages/school-admin/DataImport';
import DemoDataInjector from './pages/school-admin/DemoDataInjector';
import GoogleDriveBackupVault from './pages/school-admin/GoogleDriveBackupVault';
import WhatsAppCronAutomation from './pages/school-admin/WhatsAppCronAutomation';
import MobileAppPwaOffline from './pages/school-admin/MobileAppPwaOffline';
import CommercialLaunchAudit from './pages/school-admin/CommercialLaunchAudit';
import MultiBranchHub from './pages/school-admin/MultiBranchHub';
import FranchiseManager from './pages/school-admin/FranchiseManager';
import ComingSoon from './pages/school-admin/ComingSoon';
import GlassCard from './components/common/GlassCard';

const getRoleDashboard = (role) => {
  switch (role) {
    case 'super-admin': return '/super-admin/dashboard';
    case 'school-admin': return '/school-admin/dashboard';
    case 'teacher': return '/teacher/dashboard';
    case 'student': return '/student/dashboard';
    case 'parent': return '/parent/dashboard';
    default: return '/login';
  }
};

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, userData, loading } = useAuth();

  // Wait for Firebase auth state to resolve
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p className="text-dark-muted text-sm mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userData?.role !== requiredRole) {
    // 🔥 UPDATE: Allow school-admin & super-admin full access to bypass ALL role checks for sandbox previews
    if (userData?.role === 'school-admin' || userData?.role === 'super-admin') {
      return children;
    }
    // Redirect to correct dashboard instead of unauthorized page
    return <Navigate to={getRoleDashboard(userData?.role)} replace />;
  }

  return children;
};

const UnauthorizedPage = () => {
  const { userData, logout } = useAuth();
  const correctDashboard = getRoleDashboard(userData?.role);

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <GlassCard className="p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="text-red-500" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-red-500 mb-2">Access Denied</h1>
        <p className="text-dark-muted text-sm mb-8">You don't have permission to access this page.</p>
        {userData?.role && (
          <p className="text-xs text-dark-muted mb-6">Your role: <span className="text-primary-400 font-black uppercase">{userData.role}</span></p>
        )}
        <div className="flex gap-3">
          <a href={correctDashboard} className="flex-1 premium-button-primary py-3 text-center text-sm">
            Go to My Dashboard
          </a>
          <button onClick={logout} className="flex-1 premium-button-secondary py-3 text-sm">
            Logout
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

const AppRoutes = () => {
  const isFirebaseHosting = window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com');

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/setup" element={<SuperAdminSetup />} />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute requiredRole="super-admin">
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="ai-agent" element={<SuperAdminAiAgent />} />
        <Route path="schools" element={<SchoolsManager />} />
        <Route path="schools/add" element={<AddSchool />} />
        <Route path="schools/edit/:schoolId" element={<EditSchool />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="notifications" element={<NotificationsCenter />} />
        <Route path="support" element={<SupportCenter />} />
        <Route path="settings" element={<SuperAdminSettings />} />
        <Route path="landing-page" element={<LandingPageCMS />} />
      </Route>

      {/* School Admin Routes */}
      <Route
        path="/school-admin"
        element={
          <ProtectedRoute requiredRole="school-admin">
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SchoolAdminDashboard />} />
        <Route path="pocket-app" element={<MiniPocketApp />} />
        <Route path="subscription" element={<SchoolSubscriptionPortal />} />
        <Route path="inquiries" element={<InquiryManager />} />
        <Route path="inquiry-student" element={<InquiryManager />} />
        <Route path="inquiry" element={<InquiryManager />} />
        <Route path="inquiries/add" element={<AddInquiry />} />
        <Route path="admissions/crm" element={<AdmissionCRM />} />
        <Route path="students" element={<StudentManager />} />
        <Route path="students/add" element={<AddStudent />} />
        <Route path="students/edit/:studentId" element={<AddStudent />} />
        <Route path="family-tree" element={<FamilyTree />} />
        <Route path="staff" element={<StaffManager />} />
        <Route path="staff/add" element={<AddStaff />} />
        <Route path="staff/payroll" element={<PayrollManager />} />
        <Route path="attendance" element={<AttendanceManager />} />
        <Route path="attendance/take" element={<AttendanceManager />} />
        <Route path="attendance-register" element={<AttendanceRegister />} />
        <Route path="biometric-setup" element={<BiometricSetup />} />
        <Route path="security/gate-pass" element={<GatePassManager />} />
        <Route path="security/gate-scanner" element={<GatePassScanner />} />
        <Route path="fees" element={<FeeManager />} />
        <Route path="fees/add" element={<AddFee />} />
        <Route path="fees/generate" element={<GenerateChallan />} />
        <Route path="fees/defaulters" element={<FeeDefaulters />} />
        <Route path="fees/challan-book" element={<ChallanBook />} />
        <Route path="academics" element={<Academics />} />
        <Route path="academics/daily-diary" element={<DailyDiary />} />
        <Route path="academics/online-quiz" element={<OnlineQuizEngine />} />
        <Route path="academics/report-templates" element={<ReportCardTemplates />} />
        <Route path="academics/report-card/:studentId" element={<CustomReportCard />} />
        <Route path="academics/report-card" element={<CustomReportCard />} />
        <Route path="academics/timetable-builder" element={<TimetableBuilder />} />
        <Route path="students/id-cards" element={<StudentIdCards />} />
        <Route path="accounts/expenses" element={<ExpenseManager />} />
        <Route path="expenses" element={<ExpenseManager />} />
        <Route path="exams" element={<Exams />} />
        <Route path="exams/mark/:examId" element={<MarkResults />} />
        <Route path="accounts" element={<AccountsManager />} />
        <Route path="inventory" element={<InventoryManager />} />
        <Route path="library" element={<DigitalLibrary />} />
        <Route path="transport" element={<TransportManager />} />
        <Route path="hostel" element={<HostelManager />} />
        <Route path="sms" element={<SMSPanel />} />
        <Route path="e-services" element={<EServices />} />
        <Route path="settings" element={<SchoolSettings />} />
        <Route path="roles" element={<RolesManager />} />
        {/* Dynamic features implemented */}
        <Route path="single-student" element={<SingleStudent360 />} />
        <Route path="speaker" element={<SpeakerPASystem />} />
        <Route path="staff-attendance" element={<StaffAttendanceHub />} />
        <Route path="other-income" element={<OtherIncomeManager />} />
        <Route path="reports-hub" element={<ComprehensiveReportsHub />} />
        <Route path="collection" element={<Collection />} />
        <Route path="period-bell" element={<PeriodBell />} />
        <Route path="certificates" element={<CertificateGenerator />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="call-log" element={<CallLog />} />
        <Route path="social" element={<Social />} />
        <Route path="ai-agent" element={<AiAgent />} />
        <Route path="import" element={<DataImport />} />
        <Route path="demo-data" element={<DemoDataInjector />} />
        <Route path="cloud-backup" element={<GoogleDriveBackupVault />} />
        <Route path="whatsapp-automation" element={<WhatsAppCronAutomation />} />
        <Route path="pwa-offline" element={<MobileAppPwaOffline />} />
        <Route path="system-health-audit" element={<CommercialLaunchAudit />} />
        <Route path="branches" element={<MultiBranchHub />} />
        <Route path="franchise-manager" element={<FranchiseManager />} />
        <Route path="copilot" element={<AiAgent />} />
        <Route path="billing" element={<SchoolSubscriptionPortal />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route
        path="/teacher"
        element={
          <ProtectedRoute requiredRole="teacher">
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="exams" element={<TeacherExams />} />
        <Route path="homework" element={<TeacherHomework />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="communication" element={<TeacherCommunication />} />
        <Route path="leave" element={<TeacherLeave />} />
        <Route path="material" element={<TeacherMaterial />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole="student">
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="homework" element={<StudentHomework />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="material" element={<StudentMaterial />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route
        path="/parent"
        element={
          <ProtectedRoute requiredRole="parent">
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route path="attendance" element={<ParentAttendance />} />
        <Route path="fees" element={<ParentFees />} />
        <Route path="exams" element={<ParentExams />} />
        <Route path="ai-chatbot" element={<ParentAiChatbot />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route path="/" element={isFirebaseHosting ? <Navigate to="/login" replace /> : <LandingPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

import { SchoolProvider } from './context/SchoolContext';
import { ThemeProvider } from './context/ThemeContext';
import NetworkStatusBar from './components/common/NetworkStatusBar';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SchoolProvider>
          <Router>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
            <NetworkStatusBar />
          </Router>
        </SchoolProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
