import React, { useState, useEffect } from 'react';
import { 
  Clipboard, Save, Copy, RefreshCw, X, CheckSquare, Square, 
  Check, Calendar, BookOpen, Layers
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSchool } from '../../../context/SchoolContext';
import { getRecords, addRecord, updateRecord } from '../../../services/db';
import Swal from 'sweetalert2';

const DEFAULT_TERMS = [
  '1st Assessment 2025-26',
  '2nd Assessment 2025-26',
  '3rd Assessment 2025-26',
  '4th Assessment 2025-26',
  'First Term 2025-26',
  'Mid Term Exam 2026',
  'Second Term 2026',
  'Final Term Exam 2026',
  'Annual Exam 2026',
  'Monthly Test',
  'Pre-Board Exam'
];

const DEFAULT_SUBJECTS_LIST = [
  'Biology',
  'Chemistry',
  'English',
  'Math',
  'Pakistan Study',
  'Physics',
  'Sindhi',
  'Computer',
  'Drawing',
  'G.K + Reader',
  'Islamiat',
  'Madarsa',
  'Poem + Islamiat',
  'Science',
  'Social Study',
  'Urdu'
];

const ExamMasterFile = () => {
  const { userData } = useAuth();
  const { schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  // Selection States
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Master Data
  const [masterSubjects, setMasterSubjects] = useState([]);
  const [masterFiles, setMasterFiles] = useState([]);
  const [createdExams, setCreatedExams] = useState([]);
  const [currentFileDoc, setCurrentFileDoc] = useState(null);
  const [subjectRows, setSubjectRows] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Copy Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetClasses, setTargetClasses] = useState([]);
  const [copying, setCopying] = useState(false);

  const availableClasses = schoolClasses?.length > 0
    ? schoolClasses.map(c => c.name)
    : [];

  useEffect(() => {
    loadInitialData();
  }, [schoolId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [subjectsData, filesData, examsData] = await Promise.all([
        getRecords('subjects', schoolId),
        getRecords('examMasterFiles', schoolId),
        getRecords('exams', schoolId)
      ]);

      const subList = (subjectsData && subjectsData.length > 0)
        ? subjectsData.map(s => {
            let n = s.subjectName || s.name;
            return typeof n === 'string' ? n : (n ? String(n) : '');
          }).filter(Boolean)
        : DEFAULT_SUBJECTS_LIST;

      setMasterSubjects(Array.from(new Set(subList)));
      setMasterFiles(filesData || []);

      const examNames = examsData ? examsData.map(e => e.examName || e.title).filter(Boolean) : [];
      setCreatedExams(Array.from(new Set(examNames)));
    } catch (err) {
      console.error('Error loading Exam Master File data:', err);
    } finally {
      setLoading(false);
    }
  };

  // When class or term changes, load/build subjects for that pair
  useEffect(() => {
    if (!selectedClass || !selectedTerm) {
      setSubjectRows([]);
      setCurrentFileDoc(null);
      return;
    }

    const found = masterFiles.find(
      f => (f.className === selectedClass || f.classId === selectedClass) && f.term === selectedTerm
    );

    const fullSubjectNames = masterSubjects.length > 0 ? masterSubjects : DEFAULT_SUBJECTS_LIST;

    const sortSubjects = (list) => {
      return [...list].sort((a, b) => {
        // 1. Included ones on top (true before false)
        if (a.included && !b.included) return -1;
        if (!a.included && b.included) return 1;
        // 2. Secondary sort: Alphabetical by subject name
        return (a.subjectName || '').localeCompare(b.subjectName || '');
      });
    };

    if (found && Array.isArray(found.subjects)) {
      setCurrentFileDoc(found);

      // Merge saved subjects with all master subjects
      const savedMap = new Map();
      found.subjects.forEach(s => savedMap.set(s.subjectName, s));

      const mergedRows = fullSubjectNames.map((sName) => {
        if (savedMap.has(sName)) {
          const s = savedMap.get(sName);
          return {
            subjectName: sName,
            included: Boolean(s.included ?? true),
            examDate: s.examDate || '',
            maxMarks: s.maxMarks !== undefined && s.maxMarks !== null ? Number(s.maxMarks).toFixed(2) : '25.00',
            failable: Boolean(s.failable ?? true),
            syllabus: s.syllabus || ''
          };
        } else {
          return {
            subjectName: sName,
            included: false,
            examDate: '',
            maxMarks: '0.00',
            failable: false,
            syllabus: ''
          };
        }
      });

      setSubjectRows(sortSubjects(mergedRows));
    } else {
      setCurrentFileDoc(null);
      // Default: first 7 included like photo, rest not included
      const defaultRows = fullSubjectNames.map((sName, idx) => {
        const isIncludedDefault = idx < 7;
        return {
          subjectName: sName,
          included: isIncludedDefault,
          examDate: '',
          maxMarks: isIncludedDefault ? '25.00' : '0.00',
          failable: isIncludedDefault,
          syllabus: ''
        };
      });

      setSubjectRows(sortSubjects(defaultRows));
    }
  }, [selectedClass, selectedTerm, masterFiles, masterSubjects]);

  const handleToggleInclude = (index) => {
    setSubjectRows(prev => {
      const updated = [...prev];
      const current = updated[index];
      const newIncluded = !current.included;
      updated[index] = {
        ...current,
        included: newIncluded,
        maxMarks: newIncluded ? (Number(current.maxMarks) > 0 ? current.maxMarks : '25.00') : '0.00',
        failable: newIncluded ? true : false
      };
      
      // Auto sort: Included (checked) on top, Unselected (unchecked) at the bottom
      return [...updated].sort((a, b) => {
        if (a.included && !b.included) return -1;
        if (!a.included && b.included) return 1;
        return (a.subjectName || '').localeCompare(b.subjectName || '');
      });
    });
  };

  const handleRowChange = (index, field, value) => {
    setSubjectRows(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleSaveMasterFile = async () => {
    if (!selectedClass || !selectedTerm) {
      return Swal.fire('Warning', 'Please select both Class and Term', 'warning');
    }

    setSaving(true);
    try {
      const payload = {
        className: selectedClass || '',
        classId: selectedClass || '',
        term: selectedTerm || '',
        subjects: subjectRows.map(s => ({
          subjectName: String(s.subjectName || ''),
          included: Boolean(s.included),
          examDate: String(s.examDate || ''),
          maxMarks: Number(s.maxMarks || 0),
          failable: Boolean(s.failable),
          syllabus: String(s.syllabus || '')
        })),
        schoolId,
        updatedAt: new Date().toISOString()
      };

      if (currentFileDoc?.id) {
        const res = await updateRecord('examMasterFiles', currentFileDoc.id, payload, schoolId);
        if (res && res.success === false) throw new Error('Update failed');
      } else {
        payload.createdAt = new Date().toISOString();
        const docRef = await addRecord('examMasterFiles', payload, schoolId);
        if (docRef && docRef.success === false) throw new Error('Add failed');
        payload.id = docRef?.id || docRef;
      }

      Swal.fire({
        title: 'Master File Saved!',
        text: `Exam Master File for Class ${selectedClass} (${selectedTerm}) saved successfully.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1f37',
        color: '#fff'
      });

      const updatedFiles = await getRecords('examMasterFiles', schoolId);
      setMasterFiles(updatedFiles);
    } catch (err) {
      console.error('Error saving master file:', err);
      Swal.fire('Error', 'Failed to save master file', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Copy to other classes
  const handleOpenCopyModal = () => {
    if (!selectedClass || !selectedTerm) {
      return Swal.fire('Selection Required', 'Please select a Class and Term first to copy.', 'info');
    }

    setTargetClasses(availableClasses.filter(c => c !== selectedClass));
    setIsCopyModalOpen(true);
  };

  const handleToggleTargetClass = (cls) => {
    setTargetClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleSelectAllTargetClasses = () => {
    const otherClasses = availableClasses.filter(c => c !== selectedClass);
    if (targetClasses.length === otherClasses.length) {
      setTargetClasses([]);
    } else {
      setTargetClasses(otherClasses);
    }
  };

  const handleExecuteCopy = async () => {
    if (targetClasses.length === 0) {
      return Swal.fire('Warning', 'Please select at least one class to copy to.', 'warning');
    }

    setCopying(true);
    try {
      const cleanSubjects = subjectRows.map(s => ({
        subjectName: String(s.subjectName || ''),
        included: Boolean(s.included),
        examDate: String(s.examDate || ''),
        maxMarks: Number(s.maxMarks || 0),
        failable: Boolean(s.failable),
        syllabus: String(s.syllabus || '')
      }));

      for (const targetCls of targetClasses) {
        const existing = masterFiles.find(
          f => (f.className === targetCls || f.classId === targetCls) && f.term === selectedTerm
        );

        const payload = {
          className: targetCls,
          classId: targetCls,
          term: selectedTerm,
          subjects: cleanSubjects,
          schoolId,
          updatedAt: new Date().toISOString()
        };

        if (existing?.id) {
          const res = await updateRecord('examMasterFiles', existing.id, payload, schoolId);
          if (res && res.success === false) throw new Error('Update failed in copy');
        } else {
          payload.createdAt = new Date().toISOString();
          const docRef = await addRecord('examMasterFiles', payload, schoolId);
          if (docRef && docRef.success === false) throw new Error('Add failed in copy');
        }
      }

      Swal.fire({
        title: 'Copied Successfully!',
        text: `Master File copied to ${targetClasses.length} classes for ${selectedTerm}.`,
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#15803d'
      });

      setIsCopyModalOpen(false);
      const updatedFiles = await getRecords('examMasterFiles', schoolId);
      setMasterFiles(updatedFiles);
    } catch (err) {
      console.error('Error copying to other classes:', err);
      Swal.fire('Error', 'Failed to copy to other classes', 'error');
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto font-sans animate-fade-in pb-24 text-gray-800">
      
      {/* 🏷️ Top Page Title matching Screenshot */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-[#0070f3] tracking-tight">
          Exam Master File
        </h1>
      </div>

      {/* 📋 SELECTOR CARD (Matching screenshot exactly) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Select Class */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="">Select Class</option>
              {availableClasses.map((cls, idx) => (
                <option key={idx} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Select Term */}
          <div>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">
              Select Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="">Select Term</option>
              {createdExams.map((term, idx) => (
                <option key={idx} value={term}>{term}</option>
              ))}
            </select>
          </div>

        </div>

        {/* 🟩 Copy To Other Classes Button */}
        <div>
          <button
            type="button"
            onClick={handleOpenCopyModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#15803d] hover:bg-[#166534] active:scale-95 text-white font-bold text-sm rounded-lg shadow-sm transition-all"
          >
            <span>📋</span>
            <span>Copy To Other Classes</span>
          </button>
        </div>

      </div>

      {/* ℹ️ Status Bar / Banner (Matching screenshot) */}
      {(!selectedClass || !selectedTerm) ? (
        <div className="p-4 bg-[#e0f2fe] border border-[#bae6fd] rounded-xl text-[#0369a1] text-sm font-semibold shadow-sm animate-fade-in flex items-center gap-2">
          <span>Select a class and term to load subjects.</span>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          
          {/* 🏷️ Selected Status Badge Bar */}
          <div className="p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-gray-800 text-sm font-bold shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs md:text-sm text-gray-800">
              <span className="flex items-center gap-1.5 font-bold">
                <span>📱</span>
                <span>Class: <b>{selectedClass}</b></span>
              </span>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1.5 font-bold">
                <span>🏷️</span>
                <span>Term: <b>{selectedTerm}</b></span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveMasterFile}
              disabled={saving}
              className="px-5 py-1.5 bg-[#0070f3] hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Master File</span>
            </button>
          </div>

          {/* 📋 SUBJECTS TABLE / CARD LIST MATCHING PHOTO */}
          <div className="space-y-2.5">
            
            {/* Table Header Row */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider items-center">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-2">Include</div>
              <div className="col-span-3">Subject Name</div>
              <div className="col-span-2 text-center">Exam Date</div>
              <div className="col-span-1 text-center">Max Marks</div>
              <div className="col-span-1 text-center">Failable</div>
              <div className="col-span-2">Syllabus</div>
            </div>

            {/* Rows */}
            {subjectRows.map((row, index) => {
              const isInc = Boolean(row.included);

              return (
                <div
                  key={index}
                  className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-2xl transition-all duration-200 border shadow-sm ${
                    isInc
                      ? 'bg-[#3b82f6] text-white border-[#2563eb] shadow-blue-500/10'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  
                  {/* # Circle */}
                  <div className="col-span-1 flex justify-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                        isInc
                          ? 'bg-white text-[#3b82f6] shadow-sm'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                  </div>

                  {/* Include Checkbox */}
                  <div className="col-span-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={isInc}
                        onChange={() => handleToggleInclude(index)}
                        className={`w-4 h-4 rounded cursor-pointer ${
                          isInc
                            ? 'text-white bg-blue-600 border-white focus:ring-0'
                            : 'text-blue-600 border-gray-300'
                        }`}
                      />
                      <span>Include</span>
                    </label>
                  </div>

                  {/* Subject Name */}
                  <div className="col-span-3 font-bold text-sm md:text-base">
                    {String(row.subjectName || '')}
                  </div>

                  {/* Exam Date */}
                  <div className="col-span-2">
                    <input
                      type="date"
                      value={row.examDate}
                      onChange={(e) => handleRowChange(index, 'examDate', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none ${
                        isInc
                          ? 'bg-white text-gray-900 border-white font-medium shadow-inner'
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </div>

                  {/* Max Marks */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.maxMarks}
                      onChange={(e) => handleRowChange(index, 'maxMarks', e.target.value)}
                      className={`w-full px-2 py-1.5 text-xs text-center rounded-lg border font-bold focus:outline-none ${
                        isInc
                          ? 'bg-white text-gray-900 border-white shadow-inner'
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </div>

                  {/* Failable Checkbox */}
                  <div className="col-span-1 flex justify-center">
                    <input
                      type="checkbox"
                      checked={Boolean(row.failable)}
                      onChange={(e) => handleRowChange(index, 'failable', e.target.checked)}
                      className={`w-4 h-4 rounded cursor-pointer ${
                        isInc
                          ? 'text-blue-600 bg-white border-white focus:ring-0'
                          : 'text-blue-600 border-gray-300'
                      }`}
                    />
                  </div>

                  {/* Syllabus */}
                  <div className="col-span-2">
                    <textarea
                      rows="1"
                      placeholder="Enter syllabus"
                      value={row.syllabus}
                      onChange={(e) => handleRowChange(index, 'syllabus', e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none resize-none placeholder:text-gray-400 ${
                        isInc
                          ? 'bg-white text-gray-900 border-white font-medium shadow-inner'
                          : 'bg-white text-gray-900 border-gray-300'
                      }`}
                    />
                  </div>

                </div>
              );
            })}

          </div>

          {/* Bottom Save Button */}
          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={handleSaveMasterFile}
              disabled={saving}
              className="px-7 py-2.5 bg-[#15803d] hover:bg-[#166534] active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Master File</span>
            </button>
          </div>

        </div>
      )}

      {/* 📋 COPY TO OTHER CLASSES MODAL */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 text-gray-800">
            
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <span>Copy Subjects To Other Classes</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Source: Class <b>{selectedClass}</b> • Term: <b>{selectedTerm}</b>
                </p>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Select Target Classes:
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllTargetClasses}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                >
                  {targetClasses.length === availableClasses.filter(c => c !== selectedClass).length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-2xl">
                {availableClasses.filter(c => c !== selectedClass).map((cls, idx) => {
                  const isSelected = targetClasses.includes(cls);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleToggleTargetClass(cls)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span>Class {cls}</span>
                      {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteCopy}
                disabled={copying || targetClasses.length === 0}
                className="px-6 py-2 bg-[#15803d] hover:bg-[#166534] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {copying ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
                <span>Copy Now ({targetClasses.length} Classes)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ExamMasterFile;
