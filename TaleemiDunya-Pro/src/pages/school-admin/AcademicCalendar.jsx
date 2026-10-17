import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CalendarDays, 
  Plus, 
  Trash2, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PartyPopper, 
  BookOpen, 
  Award, 
  Bell, 
  Share2, 
  Printer, 
  Sun, 
  CloudRain, 
  Filter
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const PRELOADED_EVENTS = [
  { id: 'ev_1', title: 'Session Commencement 2026-2027', date: '2026-04-01', category: 'Academic', description: 'New academic term classes start for all grades.', isHoliday: false },
  { id: 'ev_2', title: '1st Monthly Assessments', date: '2026-05-18', category: 'Exam', description: 'First monthly tests across all subjects.', isHoliday: false },
  { id: 'ev_3', title: 'Summer Vacations Start', date: '2026-06-01', endDate: '2026-08-14', category: 'Holiday', description: 'Annual summer break announced as per government notification.', isHoliday: true },
  { id: 'ev_4', title: 'Independence Day Celebrations', date: '2026-08-14', category: 'Event', description: 'Flag hoisting ceremony and student national speeches.', isHoliday: true },
  { id: 'ev_5', title: 'School Reopens after Summer Break', date: '2026-08-15', category: 'Academic', description: 'Regular academic classes resume.', isHoliday: false },
  { id: 'ev_6', title: 'Eid Milad-un-Nabi (12 Rabi-ul-Awwal)', date: '2026-09-05', category: 'Holiday', description: 'Official gazetted holiday.', isHoliday: true },
  { id: 'ev_7', title: 'Mid-Term Examinations', date: '2026-10-12', category: 'Exam', description: 'Comprehensive mid-term exams.', isHoliday: false },
  { id: 'ev_8', title: 'Iqbal Day', date: '2026-11-09', category: 'Holiday', description: 'National holiday in honor of Allama Muhammad Iqbal.', isHoliday: true },
  { id: 'ev_9', title: 'Annual Sports Gala', date: '2026-12-05', category: 'Event', description: 'Inter-house athletics, cricket, and prize distribution.', isHoliday: false },
  { id: 'ev_10', title: 'Winter Vacations', date: '2026-12-24', endDate: '2027-01-02', category: 'Holiday', description: 'Winter break for extreme cold weather.', isHoliday: true },
  { id: 'ev_11', title: 'Kashmir Solidarity Day', date: '2027-02-05', category: 'Holiday', description: 'National public holiday.', isHoliday: true },
  { id: 'ev_12', title: 'Final Annual Board Examinations', date: '2027-03-10', category: 'Exam', description: 'Final examinations and annual result preparation.', isHoliday: false }
];

const CATEGORIES = ['All', 'Holiday', 'Exam', 'Academic', 'Event', 'Emergency'];

const AcademicCalendar = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || userData?.schoolName || 'Lodhi Model School System';

  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(`academic_calendar_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRELOADED_EVENTS;
  });

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBlastModal, setShowBlastModal] = useState(false);
  const [selectedEventForBlast, setSelectedEventForBlast] = useState(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState('');
  const [formCategory, setFormCategory] = useState('Holiday');
  const [formDescription, setFormDescription] = useState('');
  const [formIsHoliday, setFormIsHoliday] = useState(true);

  // Emergency Closure Generator
  const [emergencyReason, setEmergencyReason] = useState('Smog / Heavy Rain Notification');

  const saveEvents = (updated) => {
    setEvents(updated);
    try {
      localStorage.setItem(`academic_calendar_${schoolId}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!formTitle || !formDate) return;

    const newObj = {
      id: `ev_${Date.now()}`,
      title: formTitle,
      date: formDate,
      endDate: formEndDate || undefined,
      category: formCategory,
      description: formDescription,
      isHoliday: formIsHoliday
    };

    const updated = [newObj, ...events];
    saveEvents(updated);
    setFormTitle('');
    setFormDescription('');
    setShowAddModal(false);
  };

  const handleDeleteEvent = (id) => {
    if (!window.confirm('Delete this calendar event?')) return;
    const updated = events.filter(e => e.id !== id);
    saveEvents(updated);
  };

  // 1-Click WhatsApp Holiday Blast
  const triggerHolidayBlast = (ev) => {
    const holidayTitle = ev ? ev.title : emergencyReason;
    const holidayDate = ev ? ev.date : new Date().toISOString().split('T')[0];
    const holidayDesc = ev ? ev.description : 'Government notification ke mutabiq kal school band rahay ga.';

    let msg = `*📢 ${schoolName.toUpperCase()} — OFFICIAL HOLIDAY NOTICE*\n\n`;
    msg += `Bara-e-meharbani muttala farmayein ke *${holidayTitle}* ke baais school *${holidayDate}* ko band rahay ga.\n\n`;
    if (holidayDesc) {
      msg += `📌 *Details:* ${holidayDesc}\n\n`;
    }
    msg += `Tamam parents aur talba se guzarish hai ke ghar par assignments mukammal karein.\n\n`;
    msg += `🔗 *Online Portal:* https://taleemidunya-pro-ed44e.web.app/#/parent-quick-view/demo`;

    const encoded = encodeURI(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const filteredEvents = events.filter(e => {
    if (selectedCategory === 'All') return true;
    return e.category === selectedCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/70 border border-blue-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays size={14} className="text-blue-600" />
              Annual Academic Year 2026-2027
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              Automatic Parent Alerts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Academic Calendar & Holiday Engine</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Schedule term exams, gazetted holidays, sports days, and send 1-click WhatsApp emergency holiday notifications to all parents in seconds.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto relative z-10">
          <button 
            onClick={() => setShowBlastModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Send size={15} />
            <span>Emergency Holiday Blast</span>
          </button>

          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-slate-300 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Event / Holiday</span>
          </button>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Holidays</span>
          <span className="text-2xl font-black text-red-600 font-mono mt-1 block">
            {events.filter(e => e.isHoliday).length} Days
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Scheduled Exams</span>
          <span className="text-2xl font-black text-indigo-600 font-mono mt-1 block">
            {events.filter(e => e.category === 'Exam').length} Sessions
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Upcoming This Month</span>
          <span className="text-2xl font-black text-amber-500 font-mono mt-1 block">
            {events.slice(0, 3).length} Events
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">School Working Days</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            214 Days
          </span>
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* EVENTS TIMELINE LIST */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-black text-slate-900 text-base flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600" />
            <span>Academic Year Calendar Timeline ({filteredEvents.length} Events)</span>
          </h2>
          <button 
            onClick={() => window.print()}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <Printer size={14} /> Print Calendar Sheet
          </button>
        </div>

        <div className="space-y-3">
          {filteredEvents.map((ev, idx) => {
            const isExam = ev.category === 'Exam';
            const isHoliday = ev.isHoliday || ev.category === 'Holiday';

            return (
              <div 
                key={ev.id || idx}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isHoliday ? 'bg-red-50/50 border-red-200/80' : isExam ? 'bg-indigo-50/50 border-indigo-200/80' : 'bg-slate-50/80 border-slate-200'}`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 ${isHoliday ? 'bg-red-500 text-white shadow-sm' : isExam ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-white'}`}>
                    <span className="text-[10px] font-bold uppercase tracking-tight leading-none">
                      {new Date(ev.date).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="text-base font-black leading-none mt-0.5">
                      {new Date(ev.date).getDate()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950 text-sm">{ev.title}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${isHoliday ? 'bg-red-100 text-red-800' : isExam ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-800'}`}>
                        {ev.category} {ev.isHoliday && '• School Off'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {ev.description || 'Official academic event scheduled.'}
                    </p>

                    {ev.endDate && (
                      <p className="text-[11px] font-mono text-slate-500">
                        Duration: {ev.date} to {ev.endDate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {isHoliday && (
                    <button
                      onClick={() => triggerHolidayBlast(ev)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      title="Send WhatsApp Holiday Alert"
                    >
                      <Send size={13} />
                      <span>WhatsApp Blast</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: ADD EVENT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              <span>Add Academic Event / Holiday</span>
            </h3>

            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Event / Holiday Title</label>
                <input 
                  type="text" 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Winter Break / Sports Day / Eid Holiday"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                  <input 
                    type="date" 
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">End Date (Optional)</label>
                  <input 
                    type="date" 
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select 
                    value={formCategory} 
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  >
                    <option value="Holiday">Holiday (چھٹی)</option>
                    <option value="Exam">Exam (امتحانات)</option>
                    <option value="Academic">Academic (اکیڈمک)</option>
                    <option value="Event">Event (تقریب)</option>
                    <option value="Emergency">Emergency Closure</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">School Off?</label>
                  <select 
                    value={formIsHoliday ? 'yes' : 'no'} 
                    onChange={(e) => setFormIsHoliday(e.target.value === 'yes')}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  >
                    <option value="yes">Yes (Holiday)</option>
                    <option value="no">No (Working Day)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description / Guidelines</label>
                <textarea 
                  rows="2"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Instructions for students and parents..."
                  className="w-full text-xs font-medium rounded-xl border-slate-200 bg-slate-50 py-2 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
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
                  Save to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EMERGENCY HOLIDAY BLAST */}
      {showBlastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>Instant Emergency Holiday Blast</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Barish, Smog, ya kisi bhi achanak aane wali chutti ka notification foran parents ke WhatsApp par bhaijne ke liye reason select karein:
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Holiday Reason</label>
              <select 
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
              >
                <option value="Smog & Air Quality Emergency Holiday">Smog Emergency Notification (حکومتی نوٹیفکیشن برائے اسموگ)</option>
                <option value="Heavy Rain / Monsoon Emergency Closure">Heavy Rain & Urban Flooding (شدید بارش کے باعث چھٹی)</option>
                <option value="Severe Cold Wave / Winter Weather Alert">Extreme Cold Wave (شدید سردی کی لہر)</option>
                <option value="General Administration / Local Holiday">Administrative Holiday (انتظامی تعطیل)</option>
              </select>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-black text-amber-950 block">Message Preview:</span>
              <p className="text-[11px] leading-relaxed italic">
                "{schoolName} — Official Notice: Kal bazaria sarkari hukam {emergencyReason} ke tehat school band rahay ga."
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowBlastModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowBlastModal(false);
                  triggerHolidayBlast();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
              >
                <Send size={14} />
                <span>Blast via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AcademicCalendar;
