// ==========================================
// TaleemiDunya-Pro SaaS Features Configuration & Matrix
// Single Source of Truth for 4-Tier Plan-based Feature Toggles & Access Control
// ==========================================

export const SAAS_FEATURE_MODULES = [
  { id: 'core', title: 'Core & Executive Hub', icon: 'LayoutDashboard' },
  { id: 'crm', title: 'Admissions CRM & Inquiries', icon: 'UserPlus' },
  { id: 'academic', title: 'Academics & Examination Engine', icon: 'BookOpen' },
  { id: 'finance', title: 'Finance, Fee & Accounting', icon: 'DollarSign' },
  { id: 'security', title: 'Security, Gate Pass & IoT', icon: 'ShieldCheck' },
  { id: 'logistics', title: 'Logistics, Hostel & Transport', icon: 'Bus' },
  { id: 'automation', title: 'AI Copilot & WhatsApp Automation', icon: 'Bot' },
  { id: 'portals', title: 'Multi-User Portals & E-Services', icon: 'Globe' }
];

export const SAAS_FEATURE_CATALOG = [
  // CORE & EXECUTIVE HUB
  {
    key: 'executive-dashboard',
    title: 'Executive Dashboard & Live Stats',
    path: '/school-admin/dashboard',
    module: 'core',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'High-level KPI meters, attendance gauges, fee summary, and administrative quick action center.'
  },
  {
    key: 'multi-branch',
    title: 'Multi-Branch Hub & Campus Network',
    path: '/school-admin/branches',
    module: 'core',
    defaultPlans: ['enterprise'],
    addonPriceMonthly: 3500,
    description: 'Centralized administration of multiple campuses, inter-branch transfers, and consolidated financial reporting.'
  },
  {
    key: 'franchise-manager',
    title: 'Franchise Network & Royalty Management',
    path: '/school-admin/franchise-manager',
    module: 'core',
    defaultPlans: ['enterprise'],
    addonPriceMonthly: 4000,
    description: 'Complete franchise monitoring, royalty calculation, brand standard checklists, and network distribution.'
  },
  {
    key: 'ai-copilot',
    title: 'AI School Copilot & Smart Assistant',
    path: '/school-admin/copilot',
    module: 'automation',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 2500,
    description: 'Intelligent AI voice & text assistant to query school data, generate letters, draft reports, and analyze performance.'
  },
  {
    key: 'reports-hub',
    title: 'Automated BI Reports & Analytics Hub',
    path: '/school-admin/reports-hub',
    module: 'core',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 2000,
    description: '36+ visual charts, custom query export, academic trajectory graphs, and deep financial health analytics.'
  },
  {
    key: 'certificates',
    title: 'Official Certificate & Document Press',
    path: '/school-admin/certificates',
    module: 'core',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Generate leaving certificates, character letters, bonafide slips, and merit awards with verified QR codes.'
  },

  // ADMISSIONS CRM & INQUIRIES
  {
    key: 'inquiry-student',
    title: 'Student Inquiry & Walk-in Desk',
    path: '/school-admin/inquiries',
    module: 'crm',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Capture walk-in inquiries, lead tracking, follow-up reminders, and admission funnel status.'
  },
  {
    key: 'admission-crm',
    title: 'Online Admission CRM & Lead Funnel',
    path: '/school-admin/admissions/crm',
    module: 'crm',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 1800,
    description: 'Automated online admission portal, entrance exam booking, document verification, and conversion tracking.'
  },
  {
    key: 'students-manager',
    title: 'Comprehensive Student Registry',
    path: '/school-admin/students',
    module: 'crm',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Manage student records, guardian profiles, medical notes, academic history, and promotion workflows.'
  },
  {
    key: 'family-tree',
    title: 'Family Tree & Sibling Linking Hub',
    path: '/school-admin/family-tree',
    module: 'crm',
    defaultPlans: ['standard', 'premium', 'enterprise'],
    addonPriceMonthly: 1200,
    description: 'Link siblings under single guardian accounts, unified fee challan discounts, and joint parent communication.'
  },
  {
    key: 'staff-manager',
    title: 'Staff HR & Faculty Registry',
    path: '/school-admin/staff',
    module: 'crm',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Teacher qualifications, employment contracts, document vault, and designation management.'
  },
  {
    key: 'staff-payroll',
    title: 'Staff Salary & Payroll Cashbook',
    path: '/school-admin/staff/payroll',
    module: 'finance',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 2000,
    description: 'Automated salary slip generation, leave deductions, provident fund calculations, and tax withholding.'
  },
  {
    key: 'student-attendance',
    title: 'Student Attendance & Daily Register',
    path: '/school-admin/attendance',
    module: 'crm',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Mark daily attendance, subject-wise attendance, absent SMS alerts, and monthly attendance sheets.'
  },
  {
    key: 'id-cards',
    title: 'Smart ID Cards & Badge Generator',
    path: '/school-admin/students/id-cards',
    module: 'crm',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Design and print professional student & staff ID cards with barcodes and QR verification tags.'
  },
  {
    key: 'data-import',
    title: 'Bulk Excel & CSV Data Import Engine',
    path: '/school-admin/import',
    module: 'core',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Rapid onboarding tool to import thousands of students, staff, and past fee records in seconds.'
  },
  {
    key: 'cloud-backup',
    title: 'Google Drive & Cloud Vault Backup',
    path: '/school-admin/cloud-backup',
    module: 'core',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 1500,
    description: 'Automated daily database snapshots and offsite cloud vault storage for zero data loss guarantee.'
  },

  // FINANCE, FEE & ACCOUNTING
  {
    key: 'challan-manager',
    title: 'Challan Manager & Fee Ledger',
    path: '/school-admin/fees',
    module: 'finance',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Create customized fee structures, monthly tuition slips, scholarship adjustments, and ledger tracking.'
  },
  {
    key: 'fee-defaulters',
    title: 'Fee Defaulters & Recovery Automation',
    path: '/school-admin/fees/defaulters',
    module: 'finance',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 1800,
    description: 'Auto-identify overdue accounts, trigger WhatsApp recovery reminders, and block portal access for chronic defaulters.'
  },
  {
    key: 'challan-generate',
    title: 'Bulk Challan Generator Engine',
    path: '/school-admin/fees/generate',
    module: 'finance',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'One-click batch generation of fee challans for entire classes, grades, or individual student categories.'
  },
  {
    key: 'collection-tracker',
    title: 'Daily Collection & Cash Counter',
    path: '/school-admin/collection',
    module: 'finance',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Live daily cash collection register, bank deposit slips, and counter reconciliation.'
  },
  {
    key: 'accounts-ledger',
    title: 'Double-Entry Accounts & Balance Sheet',
    path: '/school-admin/accounts',
    module: 'finance',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 2500,
    description: 'General ledger, income statement, balance sheet, Trial Balance, and bank reconciliation reports.'
  },
  {
    key: 'challan-book',
    title: 'Multi-part Bank Challan Book Press',
    path: '/school-admin/fees/challan-book',
    module: 'finance',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Print 3-part or 4-part physical bank challan booklets ready for branch deposits.'
  },
  {
    key: 'expense-cashbook',
    title: 'Expense Manager & Petty Cashbook',
    path: '/school-admin/accounts/expenses',
    module: 'finance',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Track daily school utility bills, vendor payments, maintenance costs, and petty cash voucher approvals.'
  },
  {
    key: 'other-income',
    title: 'Other Income & Miscellaneous Invoicing',
    path: '/school-admin/other-income',
    module: 'finance',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 1200,
    description: 'Manage uniform sales, bookshop revenue, canteen contracts, hall rentals, and custom invoicing.'
  },

  // ACADEMICS & EXAMINATION ENGINE
  {
    key: 'online-quiz',
    title: 'Online MCQ Quiz & Auto-Marking Engine',
    path: '/school-admin/academics/online-quiz',
    module: 'academic',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 2200,
    description: 'Create interactive online assessments, timed MCQ tests, automatic grading, and instant performance ranking.'
  },
  {
    key: 'daily-diary',
    title: 'Daily Homework & Digital Diary',
    path: '/school-admin/academics/daily-diary',
    module: 'academic',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Post daily homework assignments, syllabus coverage notes, and voice instructions for parents and students.'
  },
  {
    key: 'academics-manager',
    title: 'Curriculum & Gradebook Manager',
    path: '/school-admin/academics',
    module: 'academic',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Configure academic years, terms, classes, sections, and subject teacher assignments.'
  },
  {
    key: 'exams-hub',
    title: 'Examination Controller & Result Tabulator',
    path: '/school-admin/exams',
    module: 'academic',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Schedule date sheets, enter marks, compute GPA/percentage, and generate class award lists.'
  },
  {
    key: 'period-bell',
    title: 'Period Bell IoT & Automated Timers',
    path: '/school-admin/period-bell',
    module: 'academic',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 1500,
    description: 'Connect IoT smart school bells, schedule automatic ring tones for periods, breaks, and emergency drills.'
  },
  {
    key: 'report-templates',
    title: 'Custom Report Card Template Designer',
    path: '/school-admin/academics/report-templates',
    module: 'academic',
    defaultPlans: ['standard', 'premium', 'enterprise'],
    addonPriceMonthly: 1800,
    description: 'Design custom result cards with school logos, remarks, grading scales, and parent signature slots.'
  },
  {
    key: 'timetable-builder',
    title: 'AI Timetable Builder & Clash Resolver',
    path: '/school-admin/academics/timetable-builder',
    module: 'academic',
    defaultPlans: ['standard', 'premium', 'enterprise'],
    addonPriceMonthly: 2000,
    description: 'Intelligent conflict-free timetable generator for teachers and classes with drag-and-drop customization.'
  },
  {
    key: 'digital-library',
    title: 'Digital Library & Study Material Notes Hub',
    path: '/school-admin/library',
    module: 'academic',
    defaultPlans: ['standard', 'premium', 'enterprise'],
    addonPriceMonthly: 1500,
    description: 'Upload eBooks, past papers, video lectures, and syllabus guides accessible directly by students.'
  },

  // SECURITY, GATE PASS & IOT
  {
    key: 'gate-scanner',
    title: 'Live ID Card Gate Scanner & Attendance IoT',
    path: '/school-admin/security/gate-scanner',
    module: 'security',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 2800,
    description: 'Real-time QR barcode scanner at school entrance that triggers instant WhatsApp alerts to parents on entry/exit.'
  },
  {
    key: 'gate-pass',
    title: 'Security Gate Pass & Visitor Logbook',
    path: '/school-admin/security/gate-pass',
    module: 'security',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Issue student early exit slips, authorized guardian pickup verification, and visitor entry badges.'
  },
  {
    key: 'system-audit',
    title: 'Commercial Launch Security & Audit Hub',
    path: '/school-admin/system-health-audit',
    module: 'security',
    defaultPlans: ['enterprise'],
    addonPriceMonthly: 3000,
    description: 'Deep security vulnerability scans, data integrity verifications, and compliance monitoring.'
  },
  {
    key: 'roles-access',
    title: 'Granular Roles & Access Management',
    path: '/school-admin/roles',
    module: 'security',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Create custom administrative roles and assign specific menu permissions for accountants, clerks, and coordinators.'
  },

  // LOGISTICS, HOSTEL & TRANSPORT
  {
    key: 'transport-fleet',
    title: 'Bus & Van Fleet Route Tracking',
    path: '/school-admin/transport',
    module: 'logistics',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 2200,
    description: 'Manage school vans, driver details, transport routes, monthly transport fee challans, and bus attendance.'
  },
  {
    key: 'hostel-manager',
    title: 'Hostel & Dormitory Accommodation Manager',
    path: '/school-admin/hostel',
    module: 'logistics',
    defaultPlans: ['enterprise'],
    addonPriceMonthly: 2500,
    description: 'Room allocations, hostel mess charges, dormitory attendance, and warden supervision reports.'
  },
  {
    key: 'inventory-store',
    title: 'Inventory & Stock Store Ledger',
    path: '/school-admin/inventory',
    module: 'logistics',
    defaultPlans: ['standard', 'premium', 'enterprise'],
    addonPriceMonthly: 1500,
    description: 'Track school asset items, lab equipment, stationary stocks, purchase orders, and issuance logs.'
  },
  {
    key: 'reminders-tasks',
    title: 'Reminders & Administrative Task Board',
    path: '/school-admin/reminders',
    module: 'logistics',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Personal and team task checklists, deadline alerts, and meeting schedules.'
  },
  {
    key: 'call-log',
    title: 'Official Call Log & Front Desk Register',
    path: '/school-admin/call-log',
    module: 'logistics',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Record incoming/outgoing parent phone calls, follow-up remarks, and receptionist performance.'
  },

  // AI & AUTOMATION
  {
    key: 'whatsapp-automation',
    title: 'WhatsApp Cron Automation Engine',
    path: '/school-admin/whatsapp-automation',
    module: 'automation',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 3000,
    description: 'Schedule automated daily attendance notifications, birthday wishes, fee reminders, and result announcements via WhatsApp.'
  },
  {
    key: 'sms-bot',
    title: 'WhatsApp & SMS AI Bot Hub',
    path: '/school-admin/sms',
    module: 'automation',
    defaultPlans: ['premium', 'enterprise'],
    addonPriceMonthly: 2500,
    description: 'Interactive SMS & WhatsApp broadcast campaigns with two-way AI conversational auto-replies.'
  },
  {
    key: 'pwa-offline',
    title: 'Mobile App PWA & Offline Engine',
    path: '/school-admin/pwa-offline',
    module: 'automation',
    defaultPlans: ['enterprise'],
    addonPriceMonthly: 3500,
    description: 'Enable offline installation on iOS and Android devices with local storage sync when internet reconnects.'
  },

  // PORTALS & SERVICES
  {
    key: 'student-portal-access',
    title: 'Student Portal & Mobile Access',
    path: '/student/dashboard',
    module: 'portals',
    defaultPlans: ['standard', 'premium', 'enterprise'],
    addonPriceMonthly: 1500,
    description: 'Give students dedicated login credentials to view attendance, homework, timetables, and fee challans.'
  },
  {
    key: 'teacher-portal-access',
    title: 'Teacher Academic Portal',
    path: '/teacher/dashboard',
    module: 'portals',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Dedicated portal for teachers to mark attendance, assign homework, input exam marks, and view schedules.'
  },
  {
    key: 'parent-portal-access',
    title: 'Parent Portal & Live Progress Tracker',
    path: '/parent/dashboard',
    module: 'portals',
    defaultPlans: ['standard', 'premium', 'enterprise'],
    addonPriceMonthly: 1800,
    description: 'Empower parents to check real-time attendance, download fee slips, view exam reports, and message teachers.'
  },
  {
    key: 'e-services',
    title: 'School E-Services & Website Builder',
    path: '/school-admin/e-services',
    module: 'portals',
    defaultPlans: ['standard', 'premium', 'enterprise'],
    addonPriceMonthly: 2000,
    description: 'Instant public-facing school landing page, virtual class links, and online admission application intake.'
  },
  {
    key: 'social-feed',
    title: 'School Social Network & Campus Feed',
    path: '/school-admin/social',
    module: 'portals',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Internal Instagram-style social feed for school events, achievement highlights, and sports photos.'
  },
  {
    key: 'saas-billing-portal',
    title: 'SaaS Plan & Online Payment Portal',
    path: '/school-admin/billing',
    module: 'core',
    defaultPlans: ['basic', 'standard', 'premium', 'enterprise'],
    addonPriceMonthly: 0,
    description: 'Online rent payment, plan upgrades, transaction history, and custom feature add-on store.'
  }
];

/**
 * Computes the exact allowed features map for a school given its plan and custom overrides.
 * @param {string} planId - e.g. 'basic', 'standard', 'premium', 'enterprise'
 * @param {Object} customOverrides - object of { featureKey: boolean } explicitly granted or restricted
 * @returns {Object} map of { [featureKey]: boolean }
 */
export const getAllowedFeaturesForPlan = (planId = 'basic', customOverrides = {}) => {
  const normalizedPlan = (planId || 'basic').toLowerCase().trim();
  const allowedMap = {};

  SAAS_FEATURE_CATALOG.forEach(feature => {
    // Check if the feature is unlocked by default for this plan
    const isUnlockedByDefault = feature.defaultPlans.includes(normalizedPlan) || normalizedPlan === 'enterprise';
    
    // If there is an explicit override in customOverrides for this feature key or path, it takes priority
    if (customOverrides && typeof customOverrides[feature.key] === 'boolean') {
      allowedMap[feature.key] = customOverrides[feature.key];
    } else if (customOverrides && typeof customOverrides[feature.path] === 'boolean') {
      allowedMap[feature.key] = customOverrides[feature.path];
    } else {
      allowedMap[feature.key] = isUnlockedByDefault;
    }
  });

  return allowedMap;
};

/**
 * Checks if a specific feature key or path is allowed
 * @param {string} keyOrPath - either feature key ('online-quiz') or route path ('/school-admin/academics/online-quiz')
 * @param {Object} allowedMap - map returned by getAllowedFeaturesForPlan
 * @returns {boolean}
 */
export const isFeatureAllowedByMap = (keyOrPath, allowedMap = {}) => {
  if (!keyOrPath) return true;
  
  // If it's a super-admin route or basic core route, allow by default
  if (keyOrPath.startsWith('/super-admin') || keyOrPath === '/school-admin/dashboard' || keyOrPath === '/school-admin/billing' || keyOrPath === '/school-admin/settings') {
    return true;
  }

  // Find the feature by key or path
  const feature = SAAS_FEATURE_CATALOG.find(
    f => f.key === keyOrPath || f.path === keyOrPath || (keyOrPath.startsWith(f.path) && f.path !== '/school-admin')
  );

  if (!feature) {
    // If not found in catalog, default to allowed for basic compatibility
    return true;
  }

  return allowedMap[feature.key] !== false;
};

/**
 * Returns feature definition object by key or path
 */
export const getFeatureCatalogItem = (keyOrPath) => {
  return SAAS_FEATURE_CATALOG.find(
    f => f.key === keyOrPath || f.path === keyOrPath || (keyOrPath.startsWith(f.path) && f.path !== '/school-admin')
  );
};
