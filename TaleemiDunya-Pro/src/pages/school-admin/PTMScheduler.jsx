import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Phone, 
  Send, 
  Printer, 
  FileText, 
  UserCheck, 
  AlertCircle,
  HelpCircle,
  Share2
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const PRELOADED_SLOTS = [
  { id: 'slot_1', time: '09:00 AM - 09:15 AM', status: 'BOOKED', studentName: 'Muhammad Ahmad', parentName: 'Tariq Mahmood Lodhi', phone: '0300-1234567', agenda: 'Discussing Math marks & Board Exam preparation' },
  { id: 'slot_2', time: '09:15 AM - 09:30 AM', status: 'BOOKED', studentName: 'Aisha Fatima', parentName: 'Farooq Ashraf', phone: '0321-9876543', agenda: 'Reviewing Physics practical work' },
  { id: 'slot_3', time: '09:30 AM - 09:45 AM', status: 'AVAILABLE', studentName: null, parentName: null, phone: null, agenda: null },
  { id: 'slot_4', time: '09:45 AM - 10:00 AM', status: 'BOOKED', studentName: 'Ali Raza Lodhi', parentName: 'Raza Lodhi', phone: '0333-5566778', agenda: 'Late arrival and assembly discipline' },
  { id: 'slot_5', time: '10:00 AM - 10:15 AM', status: 'AVAILABLE', studentName: null, parentName: null, phone: null, agenda: null },
  { id: 'slot_6', time: '10:15 AM - 10:30 AM', status: 'AVAILABLE', studentName: null, parentName: null, phone: null, agenda: null },
  { id: 'slot_7', time: '10:30 AM - 10:45 AM', status: 'BOOKED', studentName: 'Hamza Khan', parentName: 'Jamshed Khan', phone: '0301-2233445', agenda: 'General progress & sports balance' },
  { id: 'slot_8', time: '10:45 AM - 11:00 AM', status: 'AVAILABLE', studentName: null, parentName: null, phone: null, agenda: null }
];

const PTMScheduler = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || userData?.schoolName || 'Lodhi Model School System';

  const [ptmTitle, setPtmTitle] = useState('Mid-Term Result & Progress Parent-Teacher Meeting');
  const [ptmDate, setPtmDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('Class 9');
  const [selectedTeacher, setSelectedTeacher] = useState('Sir Usman (Class Incharge)');

  const [slots, setSlots] = useState(() => {
    try {
      const saved = localStorage.getItem(`ptm_slots_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRELOADED_SLOTS;
  });

  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState(null);

  // Booking Form State
  const [bookStudent, setBookStudent] = useState('');
  const [bookParent, setBookParent] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookAgenda, setBookAgenda] = useState('');

  const saveSlots = (updated) => {
    setSlots(updated);
    try {
      localStorage.setItem(`ptm_slots_${schoolId}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmBooking = (e) => {
    e.preventDefault();
    if (!selectedSlotForBooking || !bookStudent) return;

    const updated = slots.map(s => {
      if (s.id === selectedSlotForBooking.id) {
        return {
          ...s,
          status: 'BOOKED',
          studentName: bookStudent,
          parentName: bookParent || 'Parent / Guardian',
          phone: bookPhone || '0300-1234567',
          agenda: bookAgenda || 'Academic and behavioral review'
        };
      }
      return s;
    });

    saveSlots(updated);
    setShowBookModal(false);
    setBookStudent('');
    setBookParent('');
    setBookPhone('');
    setBookAgenda('');
  };

  const handleCancelBooking = (slotId) => {
    if (!window.confirm('Cancel this slot booking and make it available again?')) return;
    const updated = slots.map(s => {
      if (s.id === slotId) {
        return {
          ...s,
          status: 'AVAILABLE',
          studentName: null,
          parentName: null,
          phone: null,
          agenda: null
        };
      }
      return s;
    });
    saveSlots(updated);
  };

  const handleSendReminderWhatsApp = (slot) => {
    let msg = `*🤝 ${schoolName.toUpperCase()} — PTM APPOINTMENT REMINDER*\n\n`;
    msg += `Assalam-o-Alaikum ${slot.parentName} Sb!\n\n`;
    msg += `Aap ki Parent-Teacher Meeting (PTM) for *${slot.studentName}* (${selectedClass}) scheduled hai:\n\n`;
    msg += `📅 *Date:* ${ptmDate}\n`;
    msg += `⏰ *Reserved Time Slot:* ${slot.time}\n`;
    msg += `👨‍🏫 *Teacher Incharge:* ${selectedTeacher}\n\n`;
    msg += `Bara-e-meharbani apne makhsoos waqt par tashreef layein taake kisi qism ki takheer ya line mein intezar na karna paray.\n\n`;
    msg += `Shukriya!`;

    const encoded = encodeURI(msg);
    window.open(`https://wa.me/${slot.phone ? slot.phone.replace(/[^0-9]/g, '') : ''}?text=${encoded}`, '_blank');
  };

  const totalSlots = slots.length;
  const bookedSlots = slots.filter(s => s.status === 'BOOKED').length;
  const availableSlots = totalSlots - bookedSlots;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/70 border border-indigo-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600" />
              Smart PTM Appointment Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              Zero-Rush Queue Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Parent-Teacher Meeting (PTM) Scheduler</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Eliminate long 2-hour queues and waiting chaos. Reserve 15-minute dedicated discussion slots for parents and send automatic WhatsApp time slot confirmations.
          </p>
        </div>

        <button 
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-slate-300 shadow-sm active:scale-95 transition-all self-start md:self-auto cursor-pointer"
        >
          <Printer size={16} />
          <span>Print Teacher Day Schedule</span>
        </button>
      </div>

      {/* METRIC OVERVIEW */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total 15-Min Slots</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {totalSlots} Slots
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Reserved by Parents</span>
          <span className="text-2xl font-black text-indigo-600 font-mono mt-1 block">
            {bookedSlots} Booked
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Available Open Slots</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            {availableSlots} Available
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Meeting Date</span>
          <span className="text-sm font-black text-slate-800 mt-2 block font-mono">
            {ptmDate}
          </span>
        </div>
      </div>

      {/* MEETING DETAILS BAR */}
      <div className="print:hidden bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">PTM Session Title</label>
            <input 
              type="text" 
              value={ptmTitle}
              onChange={(e) => setPtmTitle(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Meeting Date</label>
            <input 
              type="date" 
              value={ptmDate}
              onChange={(e) => setPtmDate(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Class & Assigned Teacher</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
            >
              <option value="Class 10">Class 10 — Sir Rashid</option>
              <option value="Class 9">Class 9 — Sir Usman</option>
              <option value="Class 8">Class 8 — Madam Sarah</option>
              <option value="Class 7">Class 7 — Sir Bilal</option>
            </select>
          </div>
        </div>
      </div>

      {/* SLOTS LIST & SCHEDULE */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-black text-slate-900 text-base">
              {selectedClass} PTM Time Slots Register
            </h2>
            <p className="text-xs text-slate-500">
              Teacher: <strong>{selectedTeacher}</strong> • Date: <strong>{ptmDate}</strong>
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">
            {bookedSlots}/{totalSlots} Slots Reserved
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slots.map((slot) => {
            const isBooked = slot.status === 'BOOKED';

            return (
              <div 
                key={slot.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${isBooked ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/70 border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className={isBooked ? 'text-indigo-600' : 'text-slate-400'} />
                    <span className="font-mono font-black text-xs text-slate-950">{slot.time}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isBooked ? 'bg-indigo-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {isBooked ? 'Reserved Slot' : 'Available'}
                  </span>
                </div>

                {isBooked ? (
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-900">
                      Student: <span className="text-indigo-950 font-black">{slot.studentName}</span>
                    </p>
                    <p className="text-slate-600">
                      Parent: {slot.parentName} • 📞 {slot.phone}
                    </p>
                    <p className="text-[11px] text-slate-500 italic bg-white/70 p-2 rounded-xl border border-indigo-100">
                      "Agenda: {slot.agenda}"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    Slot is open for parent reservation.
                  </p>
                )}

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs print:hidden">
                  {isBooked ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <button
                        onClick={() => handleSendReminderWhatsApp(slot)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Send size={13} />
                        <span>WhatsApp Reminder</span>
                      </button>

                      <button
                        onClick={() => handleCancelBooking(slot.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-700"
                      >
                        Cancel Slot
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedSlotForBooking(slot);
                        setShowBookModal(true);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Plus size={14} />
                      <span>Book Slot for Parent</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: BOOK SLOT */}
      {showBookModal && selectedSlotForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-indigo-600" />
              <span>Reserve PTM Slot ({selectedSlotForBooking.time})</span>
            </h3>

            <form onSubmit={handleConfirmBooking} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Student Full Name</label>
                <input 
                  type="text" 
                  value={bookStudent}
                  onChange={(e) => setBookStudent(e.target.value)}
                  placeholder="e.g. Muhammad Ahmad"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Parent / Guardian Name</label>
                  <input 
                    type="text" 
                    value={bookParent}
                    onChange={(e) => setBookParent(e.target.value)}
                    placeholder="e.g. Tariq Mahmood"
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone (WhatsApp)</label>
                  <input 
                    type="text" 
                    value={bookPhone}
                    onChange={(e) => setBookPhone(e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Specific Discussion Agenda / Concern</label>
                <textarea 
                  rows="2"
                  value={bookAgenda}
                  onChange={(e) => setBookAgenda(e.target.value)}
                  placeholder="e.g. Math homework difficulties, discipline, or exam marks"
                  className="w-full text-xs font-medium rounded-xl border-slate-200 bg-slate-50 py-2 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-black"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PTMScheduler;
