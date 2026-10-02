import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  FileText, 
  Filter, 
  Users, 
  GraduationCap, 
  Search, 
  Calendar, 
  Sparkles, 
  BookOpen, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  School,
  ChevronDown
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { getRecords } from '../../services/db';

const StudentRemarkReport = () => {
  const { userData } = useAuth();
  const { schoolData, schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  // Active Tab Mode: 'class' | 'family'
  const [activeTab, setActiveTab] = useState('class');

  // Common PTM Metadata Filters
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [termName, setTermName] = useState('Mid-Term PTM');
  const [ptmDate, setPtmDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Class-wise Report Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [studentStatus, setStudentStatus] = useState('active');

  // Family-wise Report Filters
  const [selectedFamilyKey, setSelectedFamilyKey] = useState('');
  const [familySearch, setFamilySearch] = useState('');

  // Data Loading & State
  const [students, setStudents] = useState([]);
  const [classDetailsMap, setClassDetailsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);

  // Helper for signatures
  const getSignatureUrl = (type, studentClass = null) => {
    if (!schoolData?.signatureSettings?.rules) return null;
    
    if (type === 'Teacher') {
      const rule = schoolData.signatureSettings.rules.find(r => r.type === 'Teacher' && String(r.class).trim().toUpperCase() === String(studentClass).trim().toUpperCase());
      return rule?.signatureUrl || null;
    }
    if (type === 'Principal') {
      const rule = schoolData.signatureSettings.rules.find(r => r.type === 'Principal');
      return rule?.signatureUrl || schoolData?.signatureSettings?.principalSignatureUrl || null;
    }
    return null;
  };

  // Fetch student records on mount
  useEffect(() => {
    if (!schoolId) return;
    fetchInitialData();
  }, [schoolId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([
        getRecords('students', schoolId),
        getRecords('classes', schoolId)
      ]);

      setStudents(studentsData || []);

      // Build map for class details (sections, class teachers)
      const cMap = {};
      (classesData || []).forEach(c => {
        if (c.name) {
          cMap[c.name] = {
            classTeacher: c.classTeacher || c.teacherName || '',
            sections: Array.isArray(c.sections) ? c.sections : (typeof c.sections === 'string' ? c.sections.split(',').map(s => s.trim()) : [])
          };
        }
      });
      setClassDetailsMap(cMap);

      // Auto-select first available class if present
      const uniqueClasses = [...new Set((studentsData || []).map(s => s.class))].filter(Boolean).sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

      if (uniqueClasses.length > 0) {
        setSelectedClass(uniqueClasses[0]);
      }
    } catch (err) {
      console.error('Error fetching student remark report data:', err);
    } fontinally: {
      setLoading(false);
    }
  };

  // Derive all unique class names from both schoolClasses context and student records
  const availableClasses = useMemo(() => {
    const set = new Set();
    (schoolClasses || []).forEach(c => c.name && set.add(c.name));
    students.forEach(s => s.class && set.add(s.class));
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b));
    });
  }, [schoolClasses, students]);

  // Derive sections for the selected class
  const availableSections = useMemo(() => {
    if (!selectedClass) return ['All'];
    const sectionSet = new Set(['All']);
    
    // Check from classDetailsMap
    if (classDetailsMap[selectedClass]?.sections) {
      classDetailsMap[selectedClass].sections.forEach(sec => sec && sectionSet.add(sec));
    }
    // Check from students
    students.filter(s => s.class === selectedClass).forEach(s => {
      if (s.section) sectionSet.add(s.section);
    });

    return Array.from(sectionSet);
  }, [selectedClass, classDetailsMap, students]);

  // Compute family grouping (Phase 5 compliant: familyId -> fatherCnic -> phone -> fatherName)
  const families = useMemo(() => {
    const groupMap = new Map();

    students.forEach((st) => {
      // Respect status filter
      if (studentStatus === 'active' && (st.status === 'inactive' || st.status === 'withdrawn')) {
        return;
      }

      const cnicKey = st.fatherCnic ? st.fatherCnic.replace(/[^0-9]/g, '') : null;
      const phoneKey = st.parentPhone || st.fatherPhone || st.phone;
      const cleanPhone = phoneKey ? phoneKey.replace(/[^0-9]/g, '') : null;
      const nameKey = st.fatherName ? st.fatherName.trim().toLowerCase() : 'unknown_father';

      const familyKey = st.familyId 
        || (cnicKey && cnicKey.length >= 8 ? `cnic_${cnicKey}` : null) 
        || (cleanPhone && cleanPhone.length >= 7 ? `phone_${cleanPhone}` : null) 
        || `name_${nameKey}`;

      if (!groupMap.has(familyKey)) {
        groupMap.set(familyKey, {
          key: familyKey,
          familyId: st.familyId || null,
          fatherName: st.fatherName || 'Unknown Father',
          fatherCnic: st.fatherCnic || st.cnic || '-',
          motherName: st.motherName || st.guardianMotherName || '-',
          phone: st.parentPhone || st.fatherPhone || st.phone || '-',
          address: st.address || '-',
          children: []
        });
      }

      const grp = groupMap.get(familyKey);
      grp.children.push(st);

      // Enhance family meta with fallback values if available
      if (grp.fatherCnic === '-' && st.fatherCnic) grp.fatherCnic = st.fatherCnic;
      if (grp.motherName === '-' && (st.motherName || st.guardianMotherName)) grp.motherName = st.motherName || st.guardianMotherName;
      if (grp.phone === '-' && (st.parentPhone || st.fatherPhone || st.phone)) grp.phone = st.parentPhone || st.fatherPhone || st.phone;
    });

    const list = Array.from(groupMap.values());
    list.sort((a, b) => b.children.length - a.children.length || a.fatherName.localeCompare(b.fatherName));
    return list;
  }, [students, studentStatus]);

  // Filtered family options for search dropdown
  const filteredFamilies = useMemo(() => {
    if (!familySearch.trim()) return families;
    const query = familySearch.toLowerCase();
    return families.filter(f => 
      f.fatherName.toLowerCase().includes(query) ||
      f.fatherCnic.includes(query) ||
      f.phone.includes(query) ||
      f.children.some(c => (c.name || '').toLowerCase().includes(query) || (c.rollNumber || '').toString().includes(query))
    );
  }, [families, familySearch]);

  // Selected class students list for Class-wise Report
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(st => {
      if (st.class !== selectedClass) return false;
      if (selectedSection !== 'All' && st.section !== selectedSection) return false;
      if (studentStatus === 'active' && (st.status === 'inactive' || st.status === 'withdrawn')) return false;
      return true;
    }).sort((a, b) => {
      const rollA = parseInt(a.rollNumber || '9999', 10);
      const rollB = parseInt(b.rollNumber || '9999', 10);
      if (rollA !== rollB) return rollA - rollB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [students, selectedClass, selectedSection, studentStatus]);

  // Selected family for Family-wise Report
  const currentSelectedFamily = useMemo(() => {
    if (!selectedFamilyKey) return null;
    return families.find(f => f.key === selectedFamilyKey) || null;
  }, [families, selectedFamilyKey]);

  // Trigger Print Report
  const handlePrint = () => {
    window.print();
  };

  // Generate Report action
  const handleGenerateReport = (e) => {
    if (e) e.preventDefault();
    setReportGenerated(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ═══════════════════════════════════════════════════════
          SCREEN ONLY: HEADER & BREADCRUMB (Hidden on Print)
         ═══════════════════════════════════════════════════════ */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-dark-muted text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Students</span>
            <span>/</span>
            <span className="text-cyan-400">Remark Report</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <FileText size={22} />
            </div>
            <span>PTM Student Remark Report</span>
          </h1>
          <p className="text-xs text-dark-muted mt-1">
            Generate hardcopy printable Parent-Teacher Meeting (PTM) sheets for handwritten parent feedback.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all transform active:scale-[0.99] cursor-pointer"
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SCREEN ONLY: TABS & FILTER PANEL (Hidden on Print)
         ═══════════════════════════════════════════════════════ */}
      <div className="no-print space-y-4">
        {/* Report Mode Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-dark-card border border-dark-border max-w-md">
          <button
            type="button"
            onClick={() => { setActiveTab('class'); setReportGenerated(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'class'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-dark-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap size={15} />
            <span>1. Class-wise Report</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('family'); setReportGenerated(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'family'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-dark-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={15} />
            <span>2. Family-wise Report</span>
          </button>
        </div>

        {/* Filter Card */}
        <GlassCard className="p-5 border-cyan-500/20">
          <form onSubmit={handleGenerateReport} className="space-y-4">
            {/* Top Row: PTM Common Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-dark-border/40">
              <div>
                <label className="block text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">
                  Term / PTM Title
                </label>
                <input
                  type="text"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  placeholder="e.g. Mid-Term PTM"
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">
                  PTM Date
                </label>
                <input
                  type="date"
                  value={ptmDate}
                  onChange={(e) => setPtmDate(e.target.value)}
                  className="w-full bg-dark-hover border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Bottom Row: Tab Specific Filters */}
            {activeTab === 'class' ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">
                    Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection('All'); }}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                  >
                    <option value="">-- Choose Class --</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">
                    Select Section
                  </label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                  >
                    {availableSections.map(s => (
                      <option key={s} value={s}>{s === 'All' ? 'All Sections' : `Section ${s}`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">
                    Student Status
                  </label>
                  <select
                    value={studentStatus}
                    onChange={(e) => setStudentStatus(e.target.value)}
                    className="w-full bg-dark-hover border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                  >
                    <option value="active">Active / Enrolled Only</option>
                    <option value="all">All Statuses</option>
                  </select>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    <Sparkles size={15} />
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">
                    Search / Select Family
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFamilyKey}
                      onChange={(e) => setSelectedFamilyKey(e.target.value)}
                      className="w-full bg-dark-hover border border-dark-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                    >
                      <option value="">-- Choose Family ({families.length} available) --</option>
                      {filteredFamilies.map(f => (
                        <option key={f.key} value={f.key}>
                          {f.fatherName} — ({f.children.length} Children: {f.children.map(c => `${c.name || 'Child'} [${c.class || 'N/A'}]`).join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">
                    Filter List
                  </label>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-dark-muted" />
                    <input
                      type="text"
                      placeholder="Filter by name/phone..."
                      value={familySearch}
                      onChange={(e) => setFamilySearch(e.target.value)}
                      className="w-full bg-dark-hover border border-dark-border rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    <Sparkles size={15} />
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </GlassCard>
      </div>

      {/* ═══════════════════════════════════════════════════════
          LOADING & EMPTY STATES (Screen Only)
         ═══════════════════════════════════════════════════════ */}
      {loading && (
        <GlassCard className="p-12 text-center no-print">
          <RefreshCw size={32} className="mx-auto text-cyan-400 animate-spin mb-3" />
          <p className="text-sm font-bold text-white">Loading student directory & family records...</p>
          <p className="text-xs text-dark-muted mt-1">Please wait while we assemble PTM data.</p>
        </GlassCard>
      )}

      {!loading && activeTab === 'class' && !selectedClass && (
        <GlassCard className="p-10 text-center no-print border-yellow-500/20">
          <AlertCircle size={36} className="mx-auto text-yellow-400 mb-2" />
          <h3 className="text-sm font-bold text-white">Please Select a Class</h3>
          <p className="text-xs text-dark-muted mt-1">Choose a class and section from the filter panel above to generate the class remark report.</p>
        </GlassCard>
      )}

      {!loading && activeTab === 'class' && selectedClass && classStudents.length === 0 && (
        <GlassCard className="p-10 text-center no-print border-red-500/20">
          <AlertCircle size={36} className="mx-auto text-red-400 mb-2" />
          <h3 className="text-sm font-bold text-white">No Students Found</h3>
          <p className="text-xs text-dark-muted mt-1">No active/enrolled students found for Class {selectedClass} (Section: {selectedSection}).</p>
        </GlassCard>
      )}

      {!loading && activeTab === 'family' && !selectedFamilyKey && (
        <GlassCard className="p-10 text-center no-print border-yellow-500/20">
          <AlertCircle size={36} className="mx-auto text-yellow-400 mb-2" />
          <h3 className="text-sm font-bold text-white">Please Select a Family</h3>
          <p className="text-xs text-dark-muted mt-1">Select a family from the dropdown to generate their consolidated PTM report.</p>
        </GlassCard>
      )}

      {!loading && activeTab === 'family' && currentSelectedFamily && currentSelectedFamily.children.length === 0 && (
        <GlassCard className="p-10 text-center no-print border-red-500/20">
          <AlertCircle size={36} className="mx-auto text-red-400 mb-2" />
          <h3 className="text-sm font-bold text-white">No Active Children Found</h3>
          <p className="text-xs text-dark-muted mt-1">No active/enrolled children found for family "{currentSelectedFamily.fatherName}".</p>
        </GlassCard>
      )}

      {/* ═══════════════════════════════════════════════════════
          REPORT DISPLAY AREA (A4 Printable Preview & Print Target)
         ═══════════════════════════════════════════════════════ */}
      {!loading && (
        <div className="printable-report-area text-slate-900 bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-200 max-w-4xl mx-auto print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none font-sans">
          
          {/* TAB 1: CLASS-WISE PRINTABLE REPORT */}
          {activeTab === 'class' && selectedClass && classStudents.length > 0 && (
            <div className="space-y-6">
              {/* Document School Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex flex-col items-center justify-center text-center relative">
                  {/* Tag positioned absolutely to right so it doesn't affect centering */}
                  <div className="absolute right-0 top-0 hidden sm:block">
                    <span className="inline-block bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded">
                      Hardcopy PTM Sheet
                    </span>
                  </div>

                  {schoolData?.branding?.logo || schoolData?.logo ? (
                    <img 
                      src={schoolData.branding?.logo || schoolData.logo} 
                      alt="School Logo" 
                      className="w-20 h-20 object-contain shrink-0 mb-2" 
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shrink-0 mb-2">
                      TD
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                      {schoolData?.name || 'Taleemi Duniya School'}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {schoolData?.address || 'Main Campus, Pakistan'} {schoolData?.phone ? `| Ph: ${schoolData.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-center sm:text-left">
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                      PARENT TEACHER MEETING — CLASS REMARK REPORT
                    </h2>
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Date: <span className="text-slate-900 underline font-black">{ptmDate}</span>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-300 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Academic Year</span>
                  <span className="font-extrabold text-slate-900">{academicYear}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Term / Event</span>
                  <span className="font-extrabold text-slate-900">{termName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Class & Section</span>
                  <span className="font-extrabold text-slate-900">Class {selectedClass} ({selectedSection})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Students</span>
                  <span className="font-extrabold text-slate-900">{classStudents.length} Students</span>
                </div>
              </div>

              {/* Student Remark Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-900 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 uppercase text-[10px] font-black tracking-wider border-b-2 border-slate-900">
                      <th className="p-2 border border-slate-400 w-10 text-center">S.#</th>
                      <th className="p-2 border border-slate-400 w-16 text-center">Roll No</th>
                      <th className="p-2 border border-slate-400 w-44">Student Name</th>
                      <th className="p-2 border border-slate-400 w-44">Parent / Guardian</th>
                      <th className="p-2 border border-slate-400">Parent Remarks (Handwritten by Parent)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((st, idx) => (
                      <tr key={st.id || idx} className="print-page-break-inside-avoid border-b border-slate-400">
                        <td className="p-2 border border-slate-400 text-center font-bold text-slate-700 align-top">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-400 text-center font-extrabold text-slate-900 align-top">
                          {st.rollNumber || '-'}
                        </td>
                        <td className="p-2 border border-slate-400 font-bold text-slate-900 align-top">
                          <div>{st.name || 'Unnamed'}</div>
                          <div className="text-[10px] text-slate-500 font-normal">Adm: {st.admissionNumber || st.id?.slice(0, 6)}</div>
                        </td>
                        <td className="p-2 border border-slate-400 text-slate-800 font-medium align-top">
                          <div>{st.fatherName || st.parentName || 'Unknown'}</div>
                          {st.parentPhone || st.fatherPhone ? (
                            <div className="text-[10px] text-slate-500">{st.parentPhone || st.fatherPhone}</div>
                          ) : null}
                        </td>
                        {/* Physical Blank Writing Box for Parent's Handwritten Remarks */}
                        <td className="p-2.5 border border-slate-400 align-top bg-white">
                          <div className="space-y-3 py-1">
                            <div className="border-b border-slate-300 border-dashed h-4" />
                            <div className="border-b border-slate-300 border-dashed h-4" />
                            <div className="border-b border-slate-300 border-dashed h-4" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Footer */}
              <div className="pt-8 mt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-800 print-page-break-inside-avoid">
                <div className="flex flex-col items-center justify-end h-16">
                  {getSignatureUrl('Teacher', selectedClass) ? (
                    <img src={getSignatureUrl('Teacher', selectedClass)} alt="Teacher Signature" className="h-10 object-contain mb-1" />
                  ) : (
                    <div className="border-b-2 border-slate-800 w-48 mx-auto mb-1 h-8" />
                  )}
                  <span>Class Teacher Signature</span>
                </div>
                <div className="flex flex-col items-center justify-end h-16">
                  {getSignatureUrl('Principal') ? (
                    <img src={getSignatureUrl('Principal')} alt="Principal Signature" className="h-24 max-w-[200px] scale-125 origin-bottom origin-bottom mix-blend-multiply object-contain mb-1" />
                  ) : (
                    <div className="border-b-2 border-slate-800 w-48 mx-auto mb-1 h-8" />
                  )}
                  <span>Principal / Coordinator Signature</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FAMILY-WISE PRINTABLE REPORT */}
          {activeTab === 'family' && currentSelectedFamily && currentSelectedFamily.children.length > 0 && (
            <div className="space-y-6">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex flex-col items-center justify-center text-center relative">
                  <div className="absolute right-0 top-0 hidden sm:block">
                    <span className="inline-block bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded">
                      Consolidated Family Report
                    </span>
                  </div>

                  {schoolData?.branding?.logo || schoolData?.logo ? (
                    <img 
                      src={schoolData.branding?.logo || schoolData.logo} 
                      alt="School Logo" 
                      className="w-20 h-20 object-contain shrink-0 mb-2" 
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shrink-0 mb-2">
                      TD
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                      {schoolData?.name || 'Taleemi Duniya School'}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {schoolData?.address || 'Main Campus, Pakistan'} {schoolData?.phone ? `| Ph: ${schoolData.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                      PARENT TEACHER MEETING — FAMILY REMARK REPORT
                    </h2>
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Date: <span className="text-slate-900 underline font-black">{ptmDate}</span>
                  </div>
                </div>
              </div>

              {/* Family Overview Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Father / Guardian</span>
                  <span className="font-extrabold text-slate-900 text-sm">{currentSelectedFamily.fatherName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Mother / Guardian</span>
                  <span className="font-semibold text-slate-800">{currentSelectedFamily.motherName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Contact Phone</span>
                  <span className="font-semibold text-slate-800">{currentSelectedFamily.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Father CNIC</span>
                  <span className="font-semibold text-slate-800">{currentSelectedFamily.fatherCnic}</span>
                </div>

                <div className="col-span-2 sm:col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Academic Term</span>
                  <span className="font-bold text-slate-900">{academicYear} — {termName}</span>
                </div>
                <div className="col-span-2 sm:col-span-2 pt-2 border-t border-slate-200 text-right sm:text-left">
                  <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Enrolled Children</span>
                  <span className="font-black text-slate-900 text-sm">{currentSelectedFamily.children.length} Children</span>
                </div>
              </div>

              {/* Children Sections List */}
              <div className="space-y-5">
                {currentSelectedFamily.children.map((child, idx) => {
                  const teacherInfo = classDetailsMap[child.class]?.classTeacher || '-';
                  return (
                    <div 
                      key={child.id || idx} 
                      className="print-page-break-inside-avoid border-2 border-slate-800 rounded-xl p-4 bg-white space-y-3"
                    >
                      {/* Child Header Bar */}
                      <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 text-[11px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-extrabold tracking-wide uppercase">{child.name}</span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-300">
                          Class: <span className="text-white font-bold">{child.class || 'N/A'}</span> ({child.section || 'Default'}) | Roll: <span className="text-white font-bold">{child.rollNumber || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Child Meta Info */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-500 text-[10px] block font-bold uppercase">Admission No</span>
                          <span className="font-bold text-slate-900">{child.admissionNumber || child.id?.slice(0, 6)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block font-bold uppercase">Class & Section</span>
                          <span className="font-bold text-slate-900">{child.class} - {child.section || 'A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block font-bold uppercase">Roll Number</span>
                          <span className="font-bold text-slate-900">{child.rollNumber || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block font-bold uppercase">Class Teacher</span>
                          <span className="font-semibold text-slate-800">{teacherInfo !== '-' ? teacherInfo : '_________________'}</span>
                        </div>
                      </div>

                      {/* Large Physical Blank Parent Remarks Area */}
                      <div className="pt-1">
                        <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">
                          PARENT REMARKS FOR {child.name?.toUpperCase()}:
                        </label>
                        <div className="border border-slate-300 rounded-lg p-3 bg-white space-y-3">
                          <div className="border-b border-slate-300 border-dashed h-4" />
                          <div className="border-b border-slate-300 border-dashed h-4" />
                          <div className="border-b border-slate-300 border-dashed h-4" />
                          <div className="border-b border-slate-300 border-dashed h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Signatures & Footer */}
              <div className="pt-8 mt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-800 print-page-break-inside-avoid">
                <div className="flex flex-col items-center justify-end h-16">
                  <div className="border-b-2 border-slate-800 w-48 mx-auto mb-1 h-8" />
                  <span>Parent / Guardian Signature</span>
                </div>
                <div className="flex flex-col items-center justify-end h-16">
                  {getSignatureUrl('Principal') ? (
                    <img src={getSignatureUrl('Principal')} alt="Principal Signature" className="h-24 max-w-[200px] scale-125 origin-bottom origin-bottom mix-blend-multiply object-contain mb-1" />
                  ) : (
                    <div className="border-b-2 border-slate-800 w-48 mx-auto mb-1 h-8" />
                  )}
                  <span>Principal Signature & Stamp</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentRemarkReport;
