import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Save, 
  Clock, 
  Layers, 
  Search, 
  Filter, 
  ChevronRight,
  Sparkles,
  BarChart3
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

// Default Curriculum Chapters for fast starter setup
const INITIAL_CURRICULUM = {
  'Class 9': {
    'Mathematics': [
      { id: 'ch1', title: 'Unit 1: Matrices & Determinants', totalTopics: 6, completedTopics: 6, targetDate: '2026-09-15', status: 'Completed', teacher: 'Sir Usman' },
      { id: 'ch2', title: 'Unit 2: Real & Complex Numbers', totalTopics: 7, completedTopics: 7, targetDate: '2026-09-30', status: 'Completed', teacher: 'Sir Usman' },
      { id: 'ch3', title: 'Unit 3: Logarithms', totalTopics: 5, completedTopics: 5, targetDate: '2026-10-15', status: 'Completed', teacher: 'Sir Usman' },
      { id: 'ch4', title: 'Unit 4: Algebraic Expressions & Formulas', totalTopics: 8, completedTopics: 4, targetDate: '2026-10-30', status: 'In Progress', teacher: 'Sir Usman' },
      { id: 'ch5', title: 'Unit 5: Factorization', totalTopics: 6, completedTopics: 0, targetDate: '2026-11-15', status: 'Pending', teacher: 'Sir Usman' },
      { id: 'ch6', title: 'Unit 6: Algebraic Manipulation', totalTopics: 5, completedTopics: 0, targetDate: '2026-11-30', status: 'Pending', teacher: 'Sir Usman' },
      { id: 'ch7', title: 'Unit 7: Linear Equations & Inequalities', totalTopics: 6, completedTopics: 0, targetDate: '2026-12-15', status: 'Pending', teacher: 'Sir Usman' }
    ],
    'Physics': [
      { id: 'ph1', title: 'Ch 1: Physical Quantities & Measurement', totalTopics: 6, completedTopics: 6, targetDate: '2026-09-20', status: 'Completed', teacher: 'Madam Sarah' },
      { id: 'ph2', title: 'Ch 2: Kinematics (Motion & Speed)', totalTopics: 8, completedTopics: 8, targetDate: '2026-10-05', status: 'Completed', teacher: 'Madam Sarah' },
      { id: 'ph3', title: 'Ch 3: Dynamics (Forces & Momentum)', totalTopics: 7, completedTopics: 5, targetDate: '2026-10-25', status: 'In Progress', teacher: 'Madam Sarah' },
      { id: 'ph4', title: 'Ch 4: Turning Effect of Forces', totalTopics: 6, completedTopics: 0, targetDate: '2026-11-10', status: 'Pending', teacher: 'Madam Sarah' },
      { id: 'ph5', title: 'Ch 5: Gravitation', totalTopics: 5, completedTopics: 0, targetDate: '2026-11-25', status: 'Pending', teacher: 'Madam Sarah' }
    ],
    'English': [
      { id: 'en1', title: 'Unit 1: The Saviour of Mankind', totalTopics: 4, completedTopics: 4, targetDate: '2026-09-10', status: 'Completed', teacher: 'Sir Rashid' },
      { id: 'en2', title: 'Unit 2: Patriotism', totalTopics: 4, completedTopics: 4, targetDate: '2026-09-25', status: 'Completed', teacher: 'Sir Rashid' },
      { id: 'en3', title: 'Unit 3: Media and Its Impact', totalTopics: 4, completedTopics: 4, targetDate: '2026-10-10', status: 'Completed', teacher: 'Sir Rashid' },
      { id: 'en4', title: 'Unit 4: Hazrat Asma (R.A)', totalTopics: 4, completedTopics: 2, targetDate: '2026-10-28', status: 'In Progress', teacher: 'Sir Rashid' },
      { id: 'en5', title: 'Unit 5: Daffodils (Poem)', totalTopics: 3, completedTopics: 0, targetDate: '2026-11-12', status: 'Pending', teacher: 'Sir Rashid' }
    ]
  },
  'Class 10': {
    'Mathematics': [
      { id: 'm10_1', title: 'Unit 1: Quadratic Equations', totalTopics: 6, completedTopics: 6, targetDate: '2026-09-15', status: 'Completed', teacher: 'Sir Usman' },
      { id: 'm10_2', title: 'Unit 2: Theory of Quadratic Equations', totalTopics: 8, completedTopics: 8, targetDate: '2026-10-05', status: 'Completed', teacher: 'Sir Usman' },
      { id: 'm10_3', title: 'Unit 3: Variations', totalTopics: 7, completedTopics: 4, targetDate: '2026-10-25', status: 'In Progress', teacher: 'Sir Usman' },
      { id: 'm10_4', title: 'Unit 4: Partial Fractions', totalTopics: 5, completedTopics: 0, targetDate: '2026-11-15', status: 'Pending', teacher: 'Sir Usman' }
    ]
  }
};

const CLASSES_LIST = ['Class 9', 'Class 10', 'Class 8', 'Class 7', 'Class 6', 'Class 5'];
const SUBJECTS_LIST = ['Mathematics', 'Physics', 'English', 'Chemistry', 'Biology', 'Urdu', 'Islamiat', 'Computer Science'];

const SyllabusTracker = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';

  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [curriculumState, setCurriculumState] = useState(() => {
    try {
      const saved = localStorage.getItem(`syllabus_tracker_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CURRICULUM;
  });

  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterTopics, setNewChapterTopics] = useState(5);
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Current chapters
  const classObj = curriculumState[selectedClass] || {};
  const currentChapters = classObj[selectedSubject] || [];

  // Compute Overall Progress
  const totalTopics = currentChapters.reduce((acc, c) => acc + (Number(c.totalTopics) || 0), 0);
  const completedTopics = currentChapters.reduce((acc, c) => acc + (Number(c.completedTopics) || 0), 0);
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const saveToStorage = (updated) => {
    setCurriculumState(updated);
    try {
      localStorage.setItem(`syllabus_tracker_${schoolId}`, JSON.stringify(updated));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTopicProgress = (chapterId, delta) => {
    const updatedChapters = currentChapters.map((ch) => {
      if (ch.id === chapterId) {
        const newCompleted = Math.max(0, Math.min(ch.totalTopics, ch.completedTopics + delta));
        const newStatus = newCompleted === ch.totalTopics ? 'Completed' : newCompleted > 0 ? 'In Progress' : 'Pending';
        return { ...ch, completedTopics: newCompleted, status: newStatus };
      }
      return ch;
    });

    const updated = {
      ...curriculumState,
      [selectedClass]: {
        ...(curriculumState[selectedClass] || {}),
        [selectedSubject]: updatedChapters
      }
    };
    saveToStorage(updated);
  };

  const handleAddChapter = (e) => {
    e.preventDefault();
    if (!newChapterTitle) return;

    const newObj = {
      id: `ch_${Date.now()}`,
      title: newChapterTitle,
      totalTopics: Number(newChapterTopics) || 5,
      completedTopics: 0,
      targetDate: newTargetDate || new Date().toISOString().split('T')[0],
      status: 'Pending',
      teacher: newTeacherName || 'Class Teacher'
    };

    const updatedChapters = [...currentChapters, newObj];
    const updated = {
      ...curriculumState,
      [selectedClass]: {
        ...(curriculumState[selectedClass] || {}),
        [selectedSubject]: updatedChapters
      }
    };

    saveToStorage(updated);
    setNewChapterTitle('');
    setShowAddModal(false);
  };

  const handleDeleteChapter = (chId) => {
    const updatedChapters = currentChapters.filter(c => c.id !== chId);
    const updated = {
      ...curriculumState,
      [selectedClass]: {
        ...(curriculumState[selectedClass] || {}),
        [selectedSubject]: updatedChapters
      }
    };
    saveToStorage(updated);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/90 via-white to-green-50/70 border border-emerald-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-700" />
              Academic Syllabus Pace Tracker
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              Principal & V.P Monitoring
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Syllabus & Lesson Plan Tracker</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Track chapter completion, topic pace, and teacher syllabus coverage across all subjects. Ensure classes are on-track for upcoming board and term exams.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Chapter / Unit</span>
        </button>
      </div>

      {/* FILTER BAR & PROGRESS OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        
        {/* Class & Subject Selector */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Filter Class & Subject</span>
            {saveSuccess && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 size={13} /> Saved Automatically
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase block mb-1">Select Class</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
              >
                {CLASSES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase block mb-1">Select Subject</label>
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
              >
                {SUBJECTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Big Progress KPI Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Subject Coverage Pace</span>
            <span className={`px-2.5 py-0.5 rounded-full font-black text-xs ${progressPercent >= 60 ? 'bg-emerald-100 text-emerald-800' : progressPercent >= 30 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
              {progressPercent >= 60 ? '🟢 On Schedule' : progressPercent >= 30 ? '🟡 Moderate Pace' : '🔴 Behind Pace'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-950">{progressPercent}%</span>
              <span className="text-xs font-mono font-bold text-slate-500">
                {completedTopics} / {totalTopics} Topics Completed
              </span>
            </div>

            {/* Custom Bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${progressPercent >= 60 ? 'bg-emerald-500' : progressPercent >= 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* CHAPTERS & LESSON TRACKER LIST */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-black text-slate-900 text-sm sm:text-base">
              {selectedClass} • {selectedSubject} Syllabus Plan
            </h2>
            <p className="text-xs text-slate-500">
              Update topic progress directly by clicking (+) or (-) buttons.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600">
            {currentChapters.length} Total Units
          </span>
        </div>

        {currentChapters.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <BookOpen size={40} className="mx-auto opacity-40 text-slate-500" />
            <p className="text-sm font-bold text-slate-700">No chapters configured for this subject yet.</p>
            <p className="text-xs text-slate-500">Upar "Add Chapter / Unit" button par click karein aur syllabus shuru karein.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentChapters.map((ch, idx) => {
              const chPercent = ch.totalTopics > 0 ? Math.round((ch.completedTopics / ch.totalTopics) * 100) : 0;
              const isPastTarget = ch.targetDate && new Date(ch.targetDate) < new Date() && chPercent < 100;

              return (
                <div 
                  key={ch.id || idx} 
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${ch.status === 'Completed' ? 'bg-emerald-50/40 border-emerald-200' : isPastTarget ? 'bg-red-50/40 border-red-200' : 'bg-slate-50/80 border-slate-200'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-400">#{idx + 1}</span>
                        <h3 className="font-black text-slate-950 text-sm">{ch.title}</h3>
                        {isPastTarget && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle size={11} /> Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Instructor: <span className="font-bold text-slate-700">{ch.teacher || 'Assigned Teacher'}</span> • Target Completion: <span className="font-mono font-bold text-slate-700">{ch.targetDate}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${ch.status === 'Completed' ? 'bg-emerald-600 text-white' : ch.status === 'In Progress' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {ch.status}
                      </span>
                      <button 
                        onClick={() => handleDeleteChapter(ch.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white"
                        title="Delete Chapter"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Topic Progress:</span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleUpdateTopicProgress(ch.id, -1)}
                          disabled={ch.completedTopics <= 0}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="font-mono font-black text-xs px-2.5 py-1 bg-white border border-slate-300 rounded-lg min-w-[50px] text-center">
                          {ch.completedTopics} / {ch.totalTopics}
                        </span>
                        <button 
                          onClick={() => handleUpdateTopicProgress(ch.id, 1)}
                          disabled={ch.completedTopics >= ch.totalTopics}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Mini Bar */}
                    <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
                      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${chPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                          style={{ width: `${chPercent}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700 min-w-[35px] text-right">
                        {chPercent}%
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD CHAPTER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-indigo-600" />
              <span>Add New Chapter / Unit</span>
            </h3>

            <form onSubmit={handleAddChapter} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Chapter Name / Title</label>
                <input 
                  type="text" 
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="e.g. Unit 5: Linear Equations"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Total Topics / Exercises</label>
                  <input 
                    type="number" 
                    min="1"
                    max="50"
                    value={newChapterTopics}
                    onChange={(e) => setNewChapterTopics(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Date</label>
                  <input 
                    type="date" 
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Subject Teacher</label>
                <input 
                  type="text" 
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="e.g. Sir Usman / Madam Aisha"
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-black"
                >
                  Save Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SyllabusTracker;
