import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
const LandingPage = React.lazy(() => import('./pages/public/LandingPage'));
const Checkout = React.lazy(() => import('./pages/public/Checkout'));
const PrivacyPolicy = React.lazy(() => import('./pages/public/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/public/TermsOfService'));
const PublicFamilyUpdate = React.lazy(() => import('./pages/public/PublicFamilyUpdate'));
const MobilePhotoCapture = React.lazy(() => import('./pages/public/MobilePhotoCapture'));
const PublicApply = React.lazy(() => import('./pages/public/PublicApply'));
const PublicVoucher = React.lazy(() => import('./pages/public/PublicVoucher'));
const SchoolWebsiteTemplate = React.lazy(() => import('./pages/public/SchoolWebsiteTemplate'));
const Login = React.lazy(() => import('./pages/auth/Login'));
const SuperAdminSetup = React.lazy(() => import('./pages/auth/SuperAdminSetup'));
const SuperAdminDashboard = React.lazy(() => import('./pages/super-admin/Dashboard'));
const SchoolsManager = React.lazy(() => import('./pages/super-admin/Schools'));
const AddSchool = React.lazy(() => import('./pages/super-admin/AddSchool'));
const EditSchool = React.lazy(() => import('./pages/super-admin/EditSchool'));
const Subscriptions = React.lazy(() => import('./pages/super-admin/Subscriptions'));
const Revenue = React.lazy(() => import('./pages/super-admin/Revenue'));
const NotificationsCenter = React.lazy(() => import('./pages/super-admin/Notifications'));
const SupportCenter = React.lazy(() => import('./pages/super-admin/Support'));
const SuperAdminSettings = React.lazy(() => import('./pages/super-admin/SuperAdminSettings'));
const SuperAdminAiAgent = React.lazy(() => import('./pages/super-admin/AiAgent'));
const LandingPageCMS = React.lazy(() => import('./pages/super-admin/LandingPageCMS'));
const SchoolBackups = React.lazy(() => import('./pages/super-admin/SchoolBackups'));
const LicenseManager = React.lazy(() => import('./pages/super-admin/LicenseManager'));
const BulkPromotionEngine = React.lazy(() => import('./pages/school-admin/BulkPromotionEngine'));
const BulkFeeUpdate = React.lazy(() => import('./pages/school-admin/BulkFeeUpdate'));
const BulkStudentEdit = React.lazy(() => import('./pages/school-admin/BulkStudentEdit'));
const LiveAnalyticsHub = React.lazy(() => import('./pages/school-admin/LiveAnalyticsHub'));
const PayrollDashboard = React.lazy(() => import('./pages/school-admin/PayrollDashboard'));
const PortalsHub = React.lazy(() => import('./pages/school-admin/PortalsHub'));
const ParentsDirectory = React.lazy(() => import('./pages/school-admin/ParentsDirectory'));
const ChallanBook = React.lazy(() => import('./pages/school-admin/ChallanBook'));
const EServices = React.lazy(() => import('./pages/school-admin/EServices'));
const SchoolAdminDashboard = React.lazy(() => import('./pages/school-admin/Dashboard'));
const InquiryManager = React.lazy(() => import('./pages/school-admin/InquiryManager'));
const AddInquiry = React.lazy(() => import('./pages/school-admin/AddInquiry'));
const ParentManager = React.lazy(() => import('./pages/school-admin/ParentManager'));
const EditParent = React.lazy(() => import('./pages/school-admin/EditParent'));
const FeeRecord = React.lazy(() => import('./pages/school-admin/FeeRecord'));
const SubjectManager = React.lazy(() => import('./pages/school-admin/SubjectManager'));
const AdmitCard = React.lazy(() => import('./pages/school-admin/AdmitCard'));
const ReportCard = React.lazy(() => import('./pages/school-admin/ReportCard'));
const ExamAnalytics = React.lazy(() => import('./pages/school-admin/ExamAnalytics'));
const ExamResultsDashboard = React.lazy(() => import('./pages/school-admin/ExamResultsDashboard'));
const GradingRules = React.lazy(() => import('./pages/school-admin/GradingRules'));
const FaceScannerApp = React.lazy(() => import('./pages/school-admin/FaceScannerApp'));
const QrScannerApp = React.lazy(() => import('./pages/school-admin/QrScannerApp'));
const SchoolWebsiteCMS = React.lazy(() => import('./pages/school-admin/SchoolWebsiteCMS'));
const ParentProfile = React.lazy(() => import('./pages/school-admin/ParentProfile'));
const StudentManager = React.lazy(() => import('./pages/school-admin/Students'));
const CollectFee = React.lazy(() => import('./pages/school-admin/CollectFee'));
const ClassManager = React.lazy(() => import('./pages/school-admin/ClassManager'));
const ClassFeesSetup = React.lazy(() => import('./pages/school-admin/ClassFeesSetup'));
const StaffIdCards = React.lazy(() => import('./pages/school-admin/StaffIdCards'));
const StaffProfile = React.lazy(() => import('./pages/school-admin/StaffProfile'));
const AddStudent = React.lazy(() => import('./pages/school-admin/AddStudent'));
const StudentRemarkReport = React.lazy(() => import('./pages/school-admin/StudentRemarkReport'));
const StaffManager = React.lazy(() => import('./pages/school-admin/StaffManager'));
const StaffAttendanceRegister = React.lazy(() => import('./pages/school-admin/StaffAttendanceRegister'));
const AddStaff = React.lazy(() => import('./pages/school-admin/AddStaff'));
const FeeManager = React.lazy(() => import('./pages/school-admin/FeeManager'));
const GenerateVoucher = React.lazy(() => import('./pages/school-admin/GenerateVoucher'));
const PrintFee = React.lazy(() => import('./pages/school-admin/PrintFee'));
const AttendanceManager = React.lazy(() => import('./pages/school-admin/AttendanceManager'));
const AttendanceRegister = React.lazy(() => import('./pages/school-admin/AttendanceRegister'));
const FeeDefaulters = React.lazy(() => import('./pages/school-admin/FeeDefaulters'));
const DailyDiary = React.lazy(() => import('./pages/school-admin/DailyDiary'));
const PayrollManager = React.lazy(() => import('./pages/school-admin/PayrollManager'));
const PayrollReports = React.lazy(() => import('./pages/school-admin/PayrollReports'));
const SalarySetup = React.lazy(() => import('./pages/school-admin/SalarySetup'));
const AdmissionCRM = React.lazy(() => import('./pages/school-admin/AdmissionCRM'));
const OnlineQuizEngine = React.lazy(() => import('./pages/school-admin/OnlineQuizEngine'));
const GatePassManager = React.lazy(() => import('./pages/school-admin/GatePassManager'));
const MiniPocketApp = React.lazy(() => import('./pages/school-admin/MiniPocketApp'));
const SchoolSubscriptionPortal = React.lazy(() => import('./pages/school-admin/SchoolSubscriptionPortal'));
const Academics = React.lazy(() => import('./pages/school-admin/Academics'));
const CustomReportCard = React.lazy(() => import('./pages/school-admin/CustomReportCard'));
const ReportCardTemplates = React.lazy(() => import('./pages/school-admin/ReportCardTemplates'));
const TimetableBuilder = React.lazy(() => import('./pages/school-admin/TimetableBuilder'));
const StudentIdCards = React.lazy(() => import('./pages/school-admin/StudentIdCards'));
const IdCardDesigner = React.lazy(() => import('./pages/school-admin/IdCardDesigner'));
const ExpenseManager = React.lazy(() => import('./pages/school-admin/ExpenseManager'));
const ExamManagement = React.lazy(() => import('./pages/school-admin/exams/ExamManagement'));
const ExamMasterFile = React.lazy(() => import('./pages/school-admin/exams/ExamMasterFile'));
const ExamSubjects = React.lazy(() => import('./pages/school-admin/exams/ExamSubjects'));
const AdmitCards = React.lazy(() => import('./pages/school-admin/exams/AdmitCards'));
const MarksEntry = React.lazy(() => import('./pages/school-admin/exams/MarksEntry'));
const GradingManagement = React.lazy(() => import('./pages/school-admin/exams/GradingManagement'));
const ExamReportSummary = React.lazy(() => import('./pages/school-admin/exams/ExamReportSummary'));
const MarksheetGenerator = React.lazy(() => import('./pages/school-admin/exams/MarksheetGenerator'));
const AccountsManager = React.lazy(() => import('./pages/school-admin/AccountsManager'));
const InventoryManager = React.lazy(() => import('./pages/school-admin/InventoryManager'));
const SMSPanel = React.lazy(() => import('./pages/school-admin/SMSPanel'));
const MarkResults = React.lazy(() => import('./pages/school-admin/MarkResults'));
const FamilyTree = React.lazy(() => import('./pages/school-admin/FamilyTree'));
const SingleStudent360 = React.lazy(() => import('./pages/school-admin/SingleStudent360'));
const SpeakerPASystem = React.lazy(() => import('./pages/school-admin/SpeakerPASystem'));
const StaffAttendanceHub = React.lazy(() => import('./pages/school-admin/StaffAttendanceHub'));
const OtherIncomeManager = React.lazy(() => import('./pages/school-admin/OtherIncomeManager'));
const ComprehensiveReportsHub = React.lazy(() => import('./pages/school-admin/ComprehensiveReportsHub'));
const TeacherDashboard = React.lazy(() => import('./pages/teacher/Dashboard'));
const TeacherStudents = React.lazy(() => import('./pages/teacher/Students'));
const TeacherAttendance = React.lazy(() => import('./pages/teacher/Attendance'));
const TeacherExams = React.lazy(() => import('./pages/teacher/ExamsAndMarks'));
const TeacherHomework = React.lazy(() => import('./pages/teacher/Homework'));
const TeacherTimetable = React.lazy(() => import('./pages/teacher/Timetable'));
const TeacherCommunication = React.lazy(() => import('./pages/teacher/Communication'));
const TeacherLeave = React.lazy(() => import('./pages/teacher/LeaveManager'));
const TeacherMaterial = React.lazy(() => import('./pages/teacher/StudyMaterial'));
const TeacherPayslips = React.lazy(() => import('./pages/teacher/MyPayslips'));
const StudentDashboard = React.lazy(() => import('./pages/student/Dashboard'));
const StudentAttendance = React.lazy(() => import('./pages/student/Attendance'));
const StudentExams = React.lazy(() => import('./pages/student/Exams'));
const StudentHomework = React.lazy(() => import('./pages/student/Homework'));
const StudentTimetable = React.lazy(() => import('./pages/student/Timetable'));
const StudentMaterial = React.lazy(() => import('./pages/student/StudyMaterial'));
const ParentDashboard = React.lazy(() => import('./pages/parent/Dashboard'));
const ParentAttendance = React.lazy(() => import('./pages/parent/Attendance'));
const ParentFees = React.lazy(() => import('./pages/parent/Fees'));
const ParentExams = React.lazy(() => import('./pages/parent/Exams'));
const ParentAiChatbot = React.lazy(() => import('./pages/parent/AiChatbot'));
const SchoolSettings = React.lazy(() => import('./pages/school-admin/Settings'));
const DigitalLibrary = React.lazy(() => import('./pages/school-admin/DigitalLibrary'));
const TransportManager = React.lazy(() => import('./pages/school-admin/TransportManager'));
const RolesManager = React.lazy(() => import('./pages/school-admin/RolesManager'));
const Migration = React.lazy(() => import('./pages/school-admin/Migration'));
const Collection = React.lazy(() => import('./pages/school-admin/Collection'));
const PeriodBell = React.lazy(() => import('./pages/school-admin/PeriodBell'));
const CertificateGenerator = React.lazy(() => import('./pages/school-admin/CertificateGenerator'));

const CCTVMonitoring = React.lazy(() => import('./pages/school-admin/CCTVMonitoring'));
const HostelManager = React.lazy(() => import('./pages/school-admin/HostelManager'));
const GatePassScanner = React.lazy(() => import('./pages/school-admin/GatePassScanner'));
const BiometricSetup = React.lazy(() => import('./pages/school-admin/BiometricSetup'));
const AIGrader = React.lazy(() => import('./pages/school-admin/AIGrader'));
const LiveClasses = React.lazy(() => import('./pages/school-admin/LiveClasses'));
const StaffSubstitution = React.lazy(() => import('./pages/school-admin/StaffSubstitution'));
const Reminders = React.lazy(() => import('./pages/school-admin/Reminders'));
const CallLog = React.lazy(() => import('./pages/school-admin/CallLog'));
const Social = React.lazy(() => import('./pages/school-admin/Social'));
const AiAgent = React.lazy(() => import('./pages/school-admin/AiAgent'));
const DataImport = React.lazy(() => import('./pages/school-admin/DataImport'));
const DemoDataInjector = React.lazy(() => import('./pages/school-admin/DemoDataInjector'));
const GoogleDriveBackupVault = React.lazy(() => import('./pages/school-admin/GoogleDriveBackupVault'));
const WhatsAppCronAutomation = React.lazy(() => import('./pages/school-admin/WhatsAppCronAutomation'));
const MobileAppPwaOffline = React.lazy(() => import('./pages/school-admin/MobileAppPwaOffline'));
const CommercialLaunchAudit = React.lazy(() => import('./pages/school-admin/CommercialLaunchAudit'));
const MultiBranchHub = React.lazy(() => import('./pages/school-admin/MultiBranchHub'));
const FranchiseManager = React.lazy(() => import('./pages/school-admin/FranchiseManager'));
const ComingSoon = React.lazy(() => import('./pages/school-admin/ComingSoon'));
const AIQuestionPaperGenerator = React.lazy(() => import('./pages/school-admin/AIQuestionPaperGenerator'));
const SyllabusTracker = React.lazy(() => import('./pages/school-admin/SyllabusTracker'));
const ParentQuickPortal = React.lazy(() => import('./pages/public/ParentQuickPortal'));
const AcademicCalendar = React.lazy(() => import('./pages/school-admin/AcademicCalendar'));
const StudentHealthRecord = React.lazy(() => import('./pages/school-admin/StudentHealthRecord'));
const VisitorManager = React.lazy(() => import('./pages/school-admin/VisitorManager'));
const HouseMeritSystem = React.lazy(() => import('./pages/school-admin/HouseMeritSystem'));
const LostAndFound = React.lazy(() => import('./pages/school-admin/LostAndFound'));
const PTMScheduler = React.lazy(() => import('./pages/school-admin/PTMScheduler'));
const AIVoiceTelephonyAgent = React.lazy(() => import('./pages/school-admin/AIVoiceTelephonyAgent'));
const CanteenWalletManager = React.lazy(() => import('./pages/school-admin/CanteenWalletManager'));
const StudentRetentionPredictor = React.lazy(() => import('./pages/school-admin/StudentRetentionPredictor'));
const AlumniDirectory = React.lazy(() => import('./pages/school-admin/AlumniDirectory'));
import GlassCard from './components/common/GlassCard';
const FeatureVideos = React.lazy(() => import('./pages/super-admin/FeatureVideos'));

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
  const isFirebaseHosting = window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com'); const isDesktopApp = window.location.protocol === 'file:' || navigator.userAgent.toLowerCase().includes('electron');

  return (
    <Suspense fallback={<div className='flex h-screen items-center justify-center bg-[#09090b] text-cyan-400'><div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500'></div></div>}>
          <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/setup" element={<SuperAdminSetup />} />
      <Route path="/parent-quick-view/:studentId" element={<ParentQuickPortal />} />
      <Route path="/parent-quick-view" element={<ParentQuickPortal />} />
      <Route path="/p/:studentId" element={<ParentQuickPortal />} />
      <Route path="/p" element={<ParentQuickPortal />} />

      {/* Public Online Admission Application Routes (with wildcard & multiple slash fallbacks) */}
      <Route path="/apply/:schoolId" element={<PublicApply />} />
      <Route path="/apply" element={<PublicApply />} />
      <Route path="/apply/*" element={<PublicApply />} />
      <Route path="//apply/:schoolId" element={<PublicApply />} />
      <Route path="//apply" element={<PublicApply />} />
      <Route path="//apply/*" element={<PublicApply />} />
      <Route path="/admission/:schoolId" element={<PublicApply />} />
      <Route path="/admission" element={<PublicApply />} />
      <Route path="/admission/*" element={<PublicApply />} />
      <Route path="//admission/:schoolId" element={<PublicApply />} />
      <Route path="//admission" element={<PublicApply />} />
      <Route path="//admission/*" element={<PublicApply />} />

      {/* Public School Website & Fee Voucher Routes */}
      <Route path="/school/:schoolSlug" element={<SchoolWebsiteTemplate />} />
      <Route path="/v/:schoolId/:type/:id" element={<PublicVoucher />} />
      <Route path="/voucher/:schoolId/:type/:id" element={<PublicVoucher />} />

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
        <Route path="feature-videos" element={<FeatureVideos />} />
        <Route path="settings" element={<SuperAdminSettings />} />
        <Route path="landing-page" element={<LandingPageCMS />} />
        <Route path="school-backups" element={<SchoolBackups />} />
        <Route path="licenses" element={<LicenseManager />} />
        <Route path="drm" element={<LicenseManager />} />
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
        <Route path="students/remark-report" element={<StudentRemarkReport />} />
        <Route path="family-tree" element={<FamilyTree />} />
        <Route path="staff" element={<StaffManager />} />
        <Route path="staff/add" element={<AddStaff />} />
        <Route path="staff/edit/:id" element={<AddStaff />} />
        <Route path="staff/:id" element={<StaffProfile />} />
        <Route path="staff/payroll" element={<PayrollManager />} />
        <Route path="staff/payroll-reports" element={<PayrollReports />} />
        <Route path="staff/salary-setup" element={<SalarySetup />} />
        <Route path="staff/attendance" element={<StaffAttendanceRegister />} />
        <Route path="staff-attendance" element={<StaffAttendanceRegister />} />
        <Route path="attendance" element={<AttendanceManager />} />
        <Route path="attendance/take" element={<AttendanceManager />} />
        <Route path="attendance-register" element={<AttendanceRegister />} />
        <Route path="biometric-setup" element={<BiometricSetup />} />
        <Route path="security/gate-pass" element={<GatePassManager />} />
        <Route path="security/gate-scanner" element={<GatePassScanner />} />
        <Route path="fees" element={<FeeManager />} />
        <Route path="fees/generate" element={<GenerateVoucher />} />
        <Route path="fees/generate-voucher" element={<GenerateVoucher />} />
        <Route path="generate-voucher" element={<GenerateVoucher />} />
        <Route path="fees/print/:type/:id" element={<PrintFee />} />
        <Route path="fees/defaulters" element={<FeeDefaulters />} />
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
        <Route path="id-card-designer" element={<IdCardDesigner />} />
        <Route path="accounts/expenses" element={<ExpenseManager />} />
        <Route path="accounts/payroll" element={<PayrollManager />} />
        <Route path="accounts/payroll-reports" element={<PayrollReports />} />
        <Route path="payroll-reports" element={<PayrollReports />} />
        <Route path="expenses" element={<ExpenseManager />} />
        <Route path="accounts" element={<AccountsManager />} />
        <Route path="inventory" element={<InventoryManager />} />
        <Route path="library" element={<DigitalLibrary />} />
        <Route path="transport" element={<TransportManager />} />
        <Route path="hostel" element={<HostelManager />} />
        <Route path="sms" element={<SMSPanel />} />
        <Route path="e-services" element={<EServices />} />
        <Route path="settings" element={<SchoolSettings />} />
        <Route path="migration" element={<Migration />} />
        <Route path="roles" element={<RolesManager />} />
        {/* Dynamic features implemented */}
        <Route path="single-student" element={<SingleStudent360 />} />
        <Route path="students/:id" element={<SingleStudent360 />} />
        <Route path="speaker" element={<SpeakerPASystem />} />
        <Route path="staff-attendance" element={<StaffAttendanceRegister />} />
        <Route path="staff-attendance-hub" element={<StaffAttendanceHub />} />
        <Route path="other-income" element={<OtherIncomeManager />} />
        <Route path="reports-hub" element={<ComprehensiveReportsHub />} />
        <Route path="collection" element={<Collection />} />
        <Route path="fees/collect" element={<CollectFee />} />
        <Route path="classes" element={<ClassManager />} />
        <Route path="class-fees" element={<ClassFeesSetup />} />
        <Route path="staff/id-cards" element={<StaffIdCards />} />
        <Route path="parents" element={<ParentManager />} />
        <Route path="parents/edit/:parentId" element={<EditParent />} />
        <Route path="parents/:id" element={<ParentProfile />} />
        <Route path="fees/record" element={<FeeRecord />} />
        <Route path="subjects" element={<SubjectManager />} />
        
        {/* NEW 6-FEATURE EXAM & RESULT ENGINE */}
        <Route path="exams" element={<ExamManagement />} />
        <Route path="exams/master-file" element={<ExamMasterFile />} />
        <Route path="exams/master" element={<ExamMasterFile />} />
        <Route path="exams/subjects" element={<ExamSubjects />} />
        <Route path="exams/admit-cards" element={<AdmitCards />} />
        <Route path="exams/marks" element={<MarksEntry />} />
        <Route path="exams/grading" element={<GradingManagement />} />
        <Route path="exams/marksheet" element={<MarksheetGenerator />} />
        <Route path="exams/marksheet-generator" element={<MarksheetGenerator />} />
        <Route path="exams/individual-marksheet" element={<MarksheetGenerator />} />
        <Route path="exams/class-report" element={<ExamReportSummary />} />
        <Route path="exams/report-summary" element={<ExamReportSummary />} />
        <Route path="exams/ai-question-paper" element={<AIQuestionPaperGenerator />} />
        <Route path="academics/ai-question-paper" element={<AIQuestionPaperGenerator />} />
        <Route path="ai-question-paper" element={<AIQuestionPaperGenerator />} />
        <Route path="academics/syllabus-tracker" element={<SyllabusTracker />} />
        <Route path="syllabus-tracker" element={<SyllabusTracker />} />
        <Route path="academic-calendar" element={<AcademicCalendar />} />
        <Route path="academics/calendar" element={<AcademicCalendar />} />
        <Route path="student-health" element={<StudentHealthRecord />} />
        <Route path="students/health" element={<StudentHealthRecord />} />
        <Route path="visitors" element={<VisitorManager />} />
        <Route path="security/visitors" element={<VisitorManager />} />
        <Route path="house-system" element={<HouseMeritSystem />} />
        <Route path="students/house-system" element={<HouseMeritSystem />} />
        <Route path="lost-and-found" element={<LostAndFound />} />
        <Route path="ptm-scheduler" element={<PTMScheduler />} />
        <Route path="academics/ptm-scheduler" element={<PTMScheduler />} />
        <Route path="ai-voice-telephony" element={<AIVoiceTelephonyAgent />} />
        <Route path="telephony" element={<AIVoiceTelephonyAgent />} />
        <Route path="canteen-wallet" element={<CanteenWalletManager />} />
        <Route path="canteen" element={<CanteenWalletManager />} />
        <Route path="retention-predictor" element={<StudentRetentionPredictor />} />
        <Route path="student-retention" element={<StudentRetentionPredictor />} />
        <Route path="alumni-directory" element={<AlumniDirectory />} />
        <Route path="alumni" element={<AlumniDirectory />} />

        {/* Backward Compatibility Aliases */}
        <Route path="exams/mark" element={<MarksEntry />} />
        <Route path="exams/mark/:examId" element={<MarksEntry />} />
        <Route path="exams/report-cards" element={<ExamReportSummary />} />
        <Route path="exams/analytics" element={<ExamReportSummary />} />
        <Route path="exams/publish" element={<ExamReportSummary />} />
        <Route path="grading-rules" element={<GradingManagement />} />

        <Route path="security/cctv" element={<CCTVMonitoring />} />
        <Route path="cctv" element={<CCTVMonitoring />} />
        <Route path="face-scanner" element={<FaceScannerApp />} />
        <Route path="qr-scanner" element={<QrScannerApp />} />
        <Route path="website-cms" element={<SchoolWebsiteCMS />} />
        <Route path="period-bell" element={<PeriodBell />} />
        <Route path="certificates" element={<CertificateGenerator />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="call-log" element={<CallLog />} />
        <Route path="social" element={<Social />} />
        <Route path="ai-agent" element={<AiAgent />} />
        <Route path="import" element={<DataImport />} />
        {/* Demo-data route disabled for production tenant safety */}
        {/* <Route path="demo-data" element={<DemoDataInjector />} /> */}
        <Route path="cloud-backup" element={<GoogleDriveBackupVault />} />
        <Route path="whatsapp-automation" element={<WhatsAppCronAutomation />} />
        <Route path="pwa-offline" element={<MobileAppPwaOffline />} />
        <Route path="system-health-audit" element={<CommercialLaunchAudit />} />
        <Route path="branches" element={<MultiBranchHub />} />
        <Route path="franchise-manager" element={<FranchiseManager />} />
        <Route path="copilot" element={<AiAgent />} />
        <Route path="billing" element={<SchoolSubscriptionPortal />} />
        <Route path="bulk-promotion" element={<BulkPromotionEngine />} />
        <Route path="bulk-fee-update" element={<BulkFeeUpdate />} />
        <Route path="bulk-student-edit" element={<BulkStudentEdit />} />
        <Route path="live-analytics" element={<LiveAnalyticsHub />} />
        <Route path="payroll-dashboard" element={<PayrollDashboard />} />
        <Route path="portals-hub" element={<PortalsHub />} />
        <Route path="parents-directory" element={<ParentsDirectory />} />
        <Route path="challan-book" element={<ChallanBook />} />
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
        <Route path="payslips" element={<TeacherPayslips />} />
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

      <Route path="/" element={(isFirebaseHosting || isDesktopApp) ? <Navigate to="/login" replace /> : <LandingPage />} />
      <Route path="/family-update/:schoolId/:phone" element={<PublicFamilyUpdate />} />
      <Route path="/snap/:sessionId" element={<MobilePhotoCapture />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
        </Suspense>
  );
};

import { SchoolProvider } from './context/SchoolContext';
import { LicenseProvider } from './context/LicenseContext';
import LicenseLockModal from './components/licensing/LicenseLockModal';
import { ThemeProvider } from './context/ThemeContext';
import NetworkStatusBar from './components/common/NetworkStatusBar';

function App() {
  // Normalize double slashes in hash e.g. #//apply/ -> #/apply/
  try {
    if (window.location.hash && window.location.hash.startsWith('#//')) {
      const fixedHash = '#' + window.location.hash.replace(/^#\/+/, '/');
      window.location.replace(window.location.pathname + window.location.search + fixedHash);
      return null;
    }
  } catch (e) {}

  const p = window.location.pathname;
  if (
    p.includes('/family-update/') ||
    p.includes('/apply') ||
    p.includes('/admission') ||
    p.includes('/school/') ||
    p.includes('/voucher/') ||
    p.includes('/v/')
  ) {
    const cleanPath = p.replace(/\/+/g, '/');
    window.location.replace('/#' + cleanPath + window.location.search);
    return null;
  }
  return (
    <ThemeProvider>
      <LicenseProvider>
      <AuthProvider>
        <SchoolProvider>
          <Router>
            <ErrorBoundary>
              <AppRoutes />
              <LicenseLockModal />
            </ErrorBoundary>
            <NetworkStatusBar />
          </Router>
        </SchoolProvider>
      </AuthProvider>
    </LicenseProvider>
    </ThemeProvider>
  );
}

export default App;
