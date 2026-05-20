import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  Sliders, 
  AlertTriangle,
  Save,
  Plus,
  RefreshCw,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/common/GlassCard';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const SUBJECTS = [
  'Mathematics', 'English', 'Urdu', 'General Knowledge', 'Science', 
  'Computer Studies', 'Islamiyat', 'Nazra Quran', 'Drawing & Art', 
  'Physical Education', 'Social Studies', 'Library Hour'
];

const defaultMockStaff = [
  { id: 't1', name: 'Sir Umar Hayat', role: 'teacher' },
  { id: 't2', name: 'Miss Ayesha Malik', role: 'teacher' },
  { id: 't3', name: 'Miss Imama', role: 'teacher' },
  { id: 't4', name: 'Sir Ahmed Raza', role: 'teacher' },
  { id: 't5', name: 'Sir Malik Sajid', role: 'teacher' }
];

const TimetableBuilder = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Lodhi School System';

  const [staff, setStaff] = useState([]);
  const [classesList, setClassesList] = useState(['PREP', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five']);
  const [selectedClass, setSelectedClass] = useState('PREP');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings
  const [periodCount, setPeriodCount] = useState(6);
  const [periodDuration, setPeriodDuration] = useState(40);
  const [startTime, setStartTime] = useState('08:00');

  // Timetable schedule database object
  // Structure: { [classId]: { [day]: { [periodIndex]: { subject, teacherId, room } } } }
  const [masterSchedule, setMasterSchedule] = useState({});

  // Active Period Editor Modal state
  const [editingCell, setEditingCell] = useState(null); // { day, periodIndex }
  const [editSubject, setEditSubject] = useState('Mathematics');
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [conflictWarning, setConflictWarning] = useState(null);

  useEffect(() => {
    fetchStaffAndTimetables();
  }, [schoolId]);

  const fetchStaffAndTimetables = async () => {
    setLoading(true);
    try {
      // Fetch Staff
      const staffData = await getRecords('staff', schoolId);
      if (staffData && staffData.length > 0) {
        setStaff(staffData);
      } else {
        setStaff(defaultMockStaff);
      }

      // Fetch existing Timetables from settings or sub-collection
      const timetableData = await getRecords('timetables', schoolId);
      if (timetableData && timetableData.length > 0) {
        // Hydrate Master Schedule
        const scheduleObj = {};
        timetableData.forEach(t => {
          scheduleObj[t.classId] = t.schedule;
        });
        setMasterSchedule(scheduleObj);
      } else {
        // Fallback mock assignments
        setMasterSchedule({
          'PREP': {
            'Monday': {
              '0': { subject: 'Mathematics', teacherId: 't1', room: 'Room 101' },
              '1': { subject: 'English', teacherId: 't2', room: 'Room 101' },
              '2': { subject: 'Urdu', teacherId: 't3', room: 'Room 101' }
            },
            'Tuesday': {
              '0': { subject: 'Science', teacherId: 't4', room: 'Room 101' },
              '1': { subject: 'Mathematics', teacherId: 't1', room: 'Room 101' }
            }
          },
          'Nursery': {
            'Monday': {
              '0': { subject: 'Urdu', teacherId: 't3', room: 'Room 102' },
              '2': { subject: 'Mathematics', teacherId: 't1', room: 'Room 102' } // Double booking conflict candidate for t1
            }
          }
        });
      }
    } catch (e) {
      console.error("Error fetching timetable details:", e);
      setStaff(defaultMockStaff);
    } finally {
      setLoading(false);
    }
  };

  // Real-time conflict validation engine
  const handleTeacherRoomValidation = (teacherId, room, day, periodIndex) => {
    setConflictWarning(null);
    if (!teacherId && !room) return;

    // Loop through all classes in masterSchedule
    for (const [classId, classDays] of Object.entries(masterSchedule)) {
      // Don't flag conflict for the CURRENT class we are editing
      if (classId === selectedClass) continue;

      const daySchedule = classDays[day];
      if (daySchedule && daySchedule[periodIndex]) {
        const slot = daySchedule[periodIndex];

        // 1. Teacher double-booking check
        if (teacherId && slot.teacherId === teacherId) {
          const teacherName = staff.find(s => s.id === teacherId)?.name || 'Teacher';
          setConflictWarning({
            type: 'teacher',
            message: `CONFLICT: ${teacherName} is already assigned to Class ${classId} for Period ${periodIndex + 1} on ${day}!`
          });
          return;
        }

        // 2. Room double-booking check
        if (room && slot.room && String(slot.room).trim().toLowerCase() === String(room).trim().toLowerCase()) {
          setConflictWarning({
            type: 'room',
            message: `CONFLICT: Room "${room}" is already occupied by Class ${classId} for Period ${periodIndex + 1} on ${day}!`
          });
          return;
        }
      }
    }
  };

  const handleOpenCellEditor = (day, periodIndex) => {
    const classSchedule = masterSchedule[selectedClass] || {};
    const daySchedule = classSchedule[day] || {};
    const existingSlot = daySchedule[periodIndex] || {};

    setEditingCell({ day, periodIndex });
    setEditSubject(existingSlot.subject || SUBJECTS[0]);
    setEditTeacherId(existingSlot.teacherId || (staff[0]?.id || ''));
    setEditRoom(existingSlot.room || `Room ${100 + classesList.indexOf(selectedClass) + 1}`);
    setConflictWarning(null);
  };

  const handleSaveCell = () => {
    if (!editingCell) return;
    const { day, periodIndex } = editingCell;

    // Update master schedule
    const updatedMaster = { ...masterSchedule };
    if (!updatedMaster[selectedClass]) updatedMaster[selectedClass] = {};
    if (!updatedMaster[selectedClass][day]) updatedMaster[selectedClass][day] = {};

    updatedMaster[selectedClass][day][periodIndex] = {
      subject: editSubject,
      teacherId: editTeacherId,
      room: editRoom.trim()
    };

    setMasterSchedule(updatedMaster);
    setEditingCell(null);
  };

  const handleClearCell = (day, periodIndex) => {
    if (!window.confirm("Are you sure you want to clear this timetable slot?")) return;
    const updatedMaster = { ...masterSchedule };
    if (updatedMaster[selectedClass] && updatedMaster[selectedClass][day]) {
      delete updatedMaster[selectedClass][day][periodIndex];
      setMasterSchedule(updatedMaster);
    }
  };

  const handleSaveAllTimetables = async () => {
    setSaving(true);
    try {
      // Save current class timetable to Firestore
      const classSchedule = masterSchedule[selectedClass] || {};
      const res = await addRecord('timetables', {
        classId: selectedClass,
        schedule: classSchedule,
        updatedBy: userData?.name || 'Admin'
      }, schoolId);

      if (res.success) {
        alert(`Timetable for Class ${selectedClass} saved successfully!`);
      }
    } catch (e) {
      console.error("Error saving timetable:", e);
      alert("Timetable saved locally in session!");
    } finally {
      setSaving(false);
    }
  };

  const calculatePeriodTime = (index) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const totalMinutes = index * periodDuration;
    const currentHour = Math.floor(startHour + (startMin + totalMinutes) / 60) % 24;
    const currentMin = (startMin + totalMinutes) % 60;
    
    // Formatting
    const formattedHour = String(currentHour).padStart(2, '0');
    const formattedMin = String(currentMin).padStart(2, '0');
    return `${formattedHour}:${formattedMin}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const activeClassSchedule = masterSchedule[selectedClass] || {};

  return (
    <div className="p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Timetable Print Page Breaks */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #timetable-print-area, #timetable-print-area * {
            visibility: visible;
          }
          #timetable-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">
            Timetable Scheduler & Builder
          </h1>
          <p className="text-xs text-dark-muted font-bold tracking-wider uppercase mt-1">
            Build weekly class lectures, check room occupancies, and eliminate teacher double-bookings
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="premium-button-primary py-2.5 px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase"
          >
            <Printer size={15} />
            <span>Print Timetable Card</span>
          </button>
          <button 
            onClick={handleSaveAllTimetables}
            disabled={saving}
            className="premium-button-secondary py-2.5 px-5 flex items-center justify-center gap-2 font-bold text-xs uppercase"
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
        
        {/* Left Side: Parameters customize */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard className="p-5 border-dark-border/40">
            <h2 className="text-sm font-black text-primary-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Sliders size={16} />
              <span>Timetable Parameters</span>
            </h2>

            <div className="space-y-4 text-xs font-bold">
              {/* Class Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Target Class</label>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs text-primary-400 font-black"
                >
                  {classesList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} className="text-yellow-400" />
                  <span>Lecture Start Time</span>
                </label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs font-sans text-primary-400"
                />
              </div>

              {/* Periods Count */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Number of Daily Periods</label>
                <select 
                  value={periodCount}
                  onChange={(e) => setPeriodCount(parseInt(e.target.value))}
                  className="w-full premium-input bg-dark-card text-xs"
                >
                  {[4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} Lectures</option>
                  ))}
                </select>
              </div>

              {/* Period Duration */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Lecture Duration (Mins)</label>
                <input 
                  type="number" 
                  value={periodDuration}
                  onChange={(e) => setPeriodDuration(parseInt(e.target.value))}
                  className="w-full premium-input bg-dark-card text-xs"
                  placeholder="Minutes"
                />
              </div>
            </div>
          </GlassCard>

          {/* Quick info notes */}
          <GlassCard className="p-5 border-cyan-500/20 bg-cyan-500/5">
            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
              <MapPin size={14} />
              <span>Smart Booking Tips</span>
            </h3>
            <p className="text-[10px] font-medium leading-relaxed text-cyan-200">
              When adding a subject class, click any slot in the timetable matrix. The dynamic conflicts system checks other classes automatically to avoid double-bookings!
            </p>
          </GlassCard>
        </div>

        {/* Right Side: Weekly Schedule Matrix */}
        <div className="lg:col-span-3">
          <GlassCard className="p-6 border-dark-border/40 min-h-[500px] overflow-x-auto">
            <div className="flex items-center justify-between border-b border-dark-border/40 pb-3 mb-6 min-w-[700px]">
              <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-primary-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={16} />
                <span>Class Timetable Matrix (Class: {selectedClass})</span>
              </h2>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw size={36} className="text-primary-500 animate-spin" />
                <p className="text-xs font-black text-dark-muted uppercase">Constructing Matrix Grid...</p>
              </div>
            ) : (
              /* Visual Interactive Grid Matrix */
              <div className="min-w-[800px] border border-dark-border/30 rounded-2xl overflow-hidden bg-dark-card/20 text-xs font-bold">
                {/* Column Headers: Days / Periods */}
                <div className="grid grid-cols-6 bg-dark-card/60 border-b border-dark-border/40 py-2.5 text-center text-[10px] font-black uppercase text-dark-muted">
                  <div className="text-left pl-4">Day / Periods</div>
                  {Array.from({ length: periodCount }).map((_, idx) => (
                    <div key={idx} className="border-l border-dark-border/20">
                      <span className="block text-primary-400">P-{idx + 1}</span>
                      <span className="text-[8.5px] font-medium text-dark-muted lowercase mt-0.5 block">{calculatePeriodTime(idx)}</span>
                    </div>
                  ))}
                </div>

                {/* Day Rows */}
                {DAYS.map((day) => {
                  const daySchedule = activeClassSchedule[day] || {};
                  return (
                    <div key={day} className="grid grid-cols-6 border-b border-dark-border/10 hover:bg-white/5 transition-all py-1.5 items-stretch min-h-[75px]">
                      
                      {/* Day Label column */}
                      <div className="flex items-center pl-4 font-black uppercase text-dark-text tracking-wider text-[11px]">
                        {day}
                      </div>

                      {/* Period Cells */}
                      {Array.from({ length: periodCount }).map((_, periodIndex) => {
                        const slot = daySchedule[periodIndex];
                        const teacherName = staff.find(s => s.id === slot?.teacherId)?.name || 'Unassigned';
                        
                        return (
                          <div 
                            key={periodIndex} 
                            className="border-l border-dark-border/20 px-2 py-1 flex flex-col justify-between group relative min-h-[60px]"
                          >
                            {slot ? (
                              <div className="flex-1 flex flex-col justify-between text-[10px] text-center p-1 rounded-xl bg-primary-500/10 border border-primary-500/20">
                                {/* Slot Details */}
                                <div>
                                  <span className="block font-black text-primary-300 uppercase leading-none truncate">{slot.subject}</span>
                                  <span className="block text-[8px] text-dark-muted truncate mt-1">{teacherName}</span>
                                </div>
                                <span className="block text-[8px] font-mono text-cyan-400 mt-1 font-black leading-none">{slot.room}</span>

                                {/* Hover actions */}
                                <div className="absolute inset-0 bg-dark-card/90 opacity-0 group-hover:opacity-100 transition-all rounded-xl flex items-center justify-center gap-1.5 p-1 no-print">
                                  <button
                                    onClick={() => handleOpenCellEditor(day, periodIndex)}
                                    className="text-[9px] font-black uppercase text-primary-400 hover:text-primary-300 border border-primary-500/20 px-2 py-0.5 rounded"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleClearCell(day, periodIndex)}
                                    className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 border border-red-500/20 px-1 py-0.5 rounded"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleOpenCellEditor(day, periodIndex)}
                                className="flex-1 w-full rounded-xl border border-dashed border-dark-border/30 hover:border-primary-500/40 hover:bg-white/5 flex items-center justify-center text-dark-muted font-black uppercase text-[8px] transition-all"
                              >
                                <Plus size={10} className="mr-0.5" />
                                <span>Assign</span>
                              </button>
                            )}
                          </div>
                        );
                      })}

                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* ========================================================
          SLOT EDITOR POPUP/MODAL DIALOG
      ======================================================== */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print select-none">
          <GlassCard className="p-6 max-w-[420px] w-full border-dark-border relative">
            <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-primary-400 uppercase tracking-widest mb-5 flex items-center gap-1.5">
              <Calendar size={16} />
              <span>Configure: {editingCell.day} (Period {editingCell.periodIndex + 1})</span>
            </h3>

            <div className="space-y-4 text-xs font-bold">
              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Select Subject</label>
                <select
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full premium-input bg-dark-card text-xs text-primary-400 font-bold"
                >
                  {SUBJECTS.map(sub => (
                    <option key={sub} value={sub}>{sub.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Teacher */}
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Select Teacher</label>
                <select
                  value={editTeacherId}
                  onChange={(e) => {
                    setEditTeacherId(e.target.value);
                    handleTeacherRoomValidation(e.target.value, editRoom, editingCell.day, editingCell.periodIndex);
                  }}
                  className="w-full premium-input bg-dark-card text-xs text-cyan-400"
                >
                  <option value="">-- Choose Instructor --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Classroom */}
              <div className="space-y-1">
                <label className="text-[10px] text-dark-muted uppercase tracking-wider">Room Number</label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={(e) => {
                    setEditRoom(e.target.value);
                    handleTeacherRoomValidation(editTeacherId, e.target.value, editingCell.day, editingCell.periodIndex);
                  }}
                  placeholder="e.g. Room 101, Computer Lab"
                  className="w-full premium-input bg-dark-card text-xs"
                />
              </div>

              {/* Real-time Conflict Alert box */}
              {conflictWarning && (
                <div className="p-3 border border-red-500/20 bg-red-500/5 text-[10px] leading-relaxed text-red-400 rounded-xl flex gap-2 items-start mt-2">
                  <AlertTriangle size={15} className="flex-shrink-0 text-red-500 mt-0.5" />
                  <span>{conflictWarning.message}</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveCell}
                disabled={!!conflictWarning}
                className="flex-1 py-2 rounded-xl bg-primary-600 border border-primary-700 text-white hover:bg-primary-700 font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={14} />
                <span>Save Allocation</span>
              </button>
              <button
                onClick={() => setEditingCell(null)}
                className="py-2 px-5 rounded-xl bg-dark-card border border-dark-border text-dark-text hover:bg-white/5 font-bold text-xs uppercase"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ========================================================
          SECRET PRINT HIDDEN CLASS TIMETABLE CARD
      ======================================================== */}
      <div id="timetable-print-area" className="hidden print:block text-black bg-white select-text">
        <div className="max-w-[1000px] mx-auto p-8 border-[2px] border-black bg-white rounded-2xl flex flex-col justify-between min-h-[600px] font-sans">
          
          {/* Header */}
          <div className="text-center pb-4 border-b-[2px] border-black">
            <h2 className="text-lg font-black uppercase text-gray-800 tracking-wider leading-none">
              {schoolName}
            </h2>
            <span className="text-[10px] font-black uppercase text-gray-500 mt-2 block tracking-widest">
              CLASS WEEKLY TIMETABLE SCHEDULE
            </span>
            <span className="inline-block text-[11px] font-extrabold uppercase border border-black py-0.5 px-3 bg-gray-50 text-gray-900 rounded-full mt-2">
              Class: {selectedClass}
            </span>
          </div>

          {/* Timetable Grid */}
          <table className="w-full mt-8 border-collapse border border-gray-300 text-[10px] text-left">
            <thead>
              <tr className="bg-gray-50 text-[9px] font-black uppercase border border-gray-300 text-gray-600 text-center">
                <th className="py-2.5 px-3 text-left border border-gray-300">Day / Periods</th>
                {Array.from({ length: periodCount }).map((_, idx) => (
                  <th key={idx} className="py-2.5 px-1 border border-gray-300">
                    <span className="block text-gray-800">Period {idx + 1}</span>
                    <span className="text-[8px] font-medium text-gray-400 mt-0.5 block">{calculatePeriodTime(idx)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => {
                const daySchedule = activeClassSchedule[day] || {};
                return (
                  <tr key={day} className="border border-gray-300">
                    <td className="py-3 px-3 font-black uppercase border border-gray-300 text-gray-800 bg-gray-50/50">{day}</td>
                    {Array.from({ length: periodCount }).map((_, periodIndex) => {
                      const slot = daySchedule[periodIndex];
                      const teacherName = staff.find(s => s.id === slot?.teacherId)?.name || 'Unassigned';
                      return (
                        <td key={periodIndex} className="p-2 border border-gray-300 text-center min-h-[50px]">
                          {slot ? (
                            <div>
                              <span className="block font-black text-gray-900 uppercase leading-none truncate">{slot.subject}</span>
                              <span className="block text-[8.5px] text-gray-500 truncate mt-1">{teacherName}</span>
                              <span className="block text-[8px] font-mono text-gray-400 font-extrabold mt-1 leading-none">{slot.room}</span>
                            </div>
                          ) : (
                            <span className="text-gray-300 italic text-[8.5px]">--</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer signatures */}
          <div className="mt-16 pt-4 border-t border-gray-200 flex justify-between text-[8px] font-black text-gray-500 uppercase">
            <span className="border-t border-gray-300 pt-1 px-2">Class Coordinator</span>
            <span className="border-t border-gray-300 pt-1 px-2 text-right">Principal Office Stamp</span>
          </div>

        </div>
      </div>

    </div>
  );
};

export default TimetableBuilder;
