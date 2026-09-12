import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import PublicFamilyUpdate from './pages/public/PublicFamilyUpdate';
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
import ParentManager from './pages/school-admin/ParentManager';
import FeeRecord from './pages/school-admin/FeeRecord';
import SubjectManager from './pages/school-admin/SubjectManager';
import AdmitCard from './pages/school-admin/AdmitCard';
import ReportCard from './pages/school-admin/ReportCard';
import ExamAnalytics from './pages/school-admin/ExamAnalytics';
import ExamResultsDashboard from './pages/school-admin/ExamResultsDashboard';
import GradingRules from './pages/school-admin/GradingRules';
import FaceScannerApp from './pages/school-admin/FaceScannerApp';
import SchoolWebsiteCMS from './pages/school-admin/SchoolWebsiteCMS';
import ParentProfile from './pages/school-admin/ParentProfile';
import StudentManager from './pages/school-admin/Students';
import CollectFee from './pages/school-admin/CollectFee';
import ClassManager from './pages/school-admin/ClassManager';
import ClassFeesSetup from './pages/school-admin/ClassFeesSetup';
import StaffIdCards from './pages/school-admin/StaffIdCards';
import AddStudent from './pages/school-admin/AddStudent';
import StaffManager from './pages/school-admin/StaffManager';
import AddStaff from './pages/school-admin/AddStaff';
import StaffProfile from './pages/school-admin/StaffProfile';
import FeeManager from './pages/school-admin/FeeManager';
import GenerateVoucher from './pages/school-admin/GenerateVoucher';
import PrintFee from './pages/school-admin/PrintFee';
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
import ExamManagement from './pages/school-admin/exams/ExamManagement';
import ExamSubjects from './pages/school-admin/exams/ExamSubjects';
import ExamMasterFile from './pages/school-admin/exams/ExamMasterFile';
import AdmitCards from './pages/school-admin/exams/AdmitCards';
import MarksEntry from './pages/school-admin/exams/MarksEntry';
import GradingManagement from './pages/school-admin/exams/GradingManagement';
import ExamReportSummary from './pages/school-admin/exams/ExamReportSummary';
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
import PortalsHub from './pages/school-admin/PortalsHub';
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
import EditParent from './pages/school-admin/EditParent';

import HostelManager from './pages/school-admin/HostelManager';
import GatePassScanner from './pages/school-admin/GatePassScanner';
import BiometricSetup from './pages/school-admin/BiometricSetup';
import AIGrader from './pages/school-admin/AIGrader';
import LiveClasses from './pages/school-admin/LiveClasses';
import StaffSubstitution from './pages/school-admin/StaffSubstitution';
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
  const { isFeatureAllowed } = useSchool();
  const location = useLocation();

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

  // SaaS Feature Access Control Check
  if (userData?.role && ['school-admin', 'teacher', 'student', 'parent', 'staff'].includes(userData.role)) {
    if (!isFeatureAllowed(location.pathname)) {
      return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
          <div className="p-8 max-w-md w-full text-center bg-dark-card border border-dark-border rounded-2xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.15)]">
            <div className="w-16 h-16 mx-auto bg-amber-500/10 text-amber-500 flex items-center justify-center rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h1 className="text-2xl font-black text-amber-500 mb-2">Feature Locked</h1>
            <p className="text-dark-muted text-sm mb-6">This module has been disabled by Global Administration or is not available in your current subscription plan.</p>
            <a href={`/#${getRoleDashboard(userData.role)}`} className="premium-button-primary w-full block text-center py-3 text-sm">
              Return to Dashboard
            </a>
          </div>
        </div>
      );
    }
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
      <Route path="/family-update/:schoolId/:phone" element={<PublicFamilyUpdate />} />
      <Route path="/family-update/:schoolId/:phone/:fatherName" element={<PublicFamilyUpdate />} />

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
        <Route path="staff/edit/:id" element={<AddStaff />} />
        <Route path="staff/:id" element={<StaffProfile />} />
        <Route path="staff/payroll" element={<PayrollManager />} />
        <Route path="attendance" element={<AttendanceManager />} />
        <Route path="attendance/take" element={<AttendanceManager />} />
        <Route path="attendance-register" element={<AttendanceRegister />} />
        <Route path="biometric-setup" element={<BiometricSetup />} />
        <Route path="security/gate-pass" element={<GatePassManager />} />
        <Route path="security/gate-scanner" element={<GatePassScanner />} />
        <Route path="fees" element={<FeeManager />} />
        <Route path="fees/generate" element={<GenerateVoucher />} />
        <Route path="fees/print/:type/:id" element={<PrintFee />} />
        <Route path="fees/defaulters" element={<FeeDefaulters />} />
        <Route path="fees/challan-book" element={<ChallanBook />} />
        <Route path="academics" element={<Academics />} />
        <Route path="academics/daily-diary" element={<DailyDiary />} />
        <Route path="academics/online-quiz" element={<OnlineQuizEngine />} />
        <Route path="academics/report-templates" element={<ReportCardTemplates />} />
        <Route path="academics/report-card/:studentId" element={<CustomReportCard />} />
        <Route path="academics/report-card" element={<CustomReportCard />} />
        <Route path="academics/timetable-builder" element={<TimetableBuilder />} />
        <Route path="academics/ai-grader" element={<AIGrader />} />
        <Route path="academics/live-classes" element={<LiveClasses />} />
        <Route path="academics/proxy-engine" element={<StaffSubstitution />} />
        <Route path="students/id-cards" element={<StudentIdCards />} />
        <Route path="accounts/expenses" element={<ExpenseManager />} />
        <Route path="accounts/payroll" element={<PayrollManager />} />
        <Route path="expenses" element={<ExpenseManager />} />
        <Route path="accounts" element={<AccountsManager />} />
        <Route path="inventory" element={<InventoryManager />} />
        <Route path="library" element={<DigitalLibrary />} />
        <Route path="transport" element={<TransportManager />} />
        <Route path="hostel" element={<HostelManager />} />
        <Route path="sms" element={<SMSPanel />} />
        <Route path="e-services" element={<EServices />} />
        <Route path="portals-hub" element={<PortalsHub />} />
        <Route path="settings" element={<SchoolSettings />} />
        <Route path="roles" element={<RolesManager />} />
        {/* Dynamic features implemented */}
        <Route path="single-student" element={<SingleStudent360 />} />
        <Route path="students/:id" element={<SingleStudent360 />} />
        <Route path="speaker" element={<SpeakerPASystem />} />
        <Route path="staff-attendance" element={<StaffAttendanceHub />} />
        <Route path="other-income" element={<OtherIncomeManager />} />
        <Route path="reports-hub" element={<ComprehensiveReportsHub />} />
        <Route path="collection" element={<Collection />} />
        <Route path="fees/collect" element={<CollectFee />} />
        <Route path="classes" element={<ClassManager />} />
        <Route path="class-fees" element={<ClassFeesSetup />} />
        <Route path="staff/id-cards" element={<StaffIdCards />} />
        <Route path="parents" element={<ParentManager />} />
        <Route path="parents/edit/:id" element={<EditParent />} />
        <Route path="parents/:id" element={<ParentProfile />} />
        <Route path="fees/record" element={<FeeRecord />} />
        <Route path="subjects" element={<SubjectManager />} />
        
        {/* NEW EXAM & RESULT ENGINE */}
        <Route path="exams" element={<ExamManagement />} />
        <Route path="exams/subjects" element={<ExamSubjects />} />
        <Route path="exams/master-file" element={<ExamMasterFile />} />
        <Route path="exams/master" element={<ExamMasterFile />} />
        <Route path="exams/admit-cards" element={<AdmitCards />} />
        <Route path="exams/marks" element={<MarksEntry />} />
        <Route path="exams/grading" element={<GradingManagement />} />
        <Route path="exams/report-summary" element={<ExamReportSummary />} />

        {/* Backward Compatibility Aliases */}
        <Route path="exams/mark" element={<MarksEntry />} />
        <Route path="exams/mark/:examId" element={<MarksEntry />} />
        <Route path="exams/report-cards" element={<ExamReportSummary />} />
        <Route path="exams/analytics" element={<ExamReportSummary />} />
        <Route path="exams/publish" element={<ExamReportSummary />} />
        <Route path="grading-rules" element={<GradingManagement />} />

        <Route path="face-scanner" element={<FaceScannerApp />} />
        <Route path="website-cms" element={<SchoolWebsiteCMS />} />
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

import { SchoolProvider, useSchool } from './context/SchoolContext';
import { ThemeProvider } from './context/ThemeContext';
import NetworkStatusBar from './components/common/NetworkStatusBar';

function App() {
  // Automatically route deep pathname links to HashRouter
  if (window.location.pathname && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    const targetPath = window.location.pathname + window.location.search;
    window.location.replace('/#' + targetPath);
    return null;
  }
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
