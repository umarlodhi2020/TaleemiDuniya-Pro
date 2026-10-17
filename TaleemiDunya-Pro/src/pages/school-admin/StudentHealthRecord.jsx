import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Activity, 
  Plus, 
  Trash2, 
  Search, 
  Phone, 
  Send, 
  ShieldAlert, 
  User, 
  Thermometer, 
  Bandage, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  Clock, 
  FileText,
  Filter,
  Eye,
  Save
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const PRELOADED_HEALTH_RECORDS = [
  {
    id: 'hlth_1',
    studentId: 'STD-101',
    name: 'Muhammad Ahmad',
    rollNo: '104',
    className: 'Class 9',
    bloodGroup: 'B+',
    height: '5 ft 6 in',
    weight: '58 kg',
    bmi: '20.6 (Normal)',
    allergies: 'Peanut allergy, Dust allergy',
    chronicConditions: 'Mild Asthma (Uses inhaler during sports)',
    emergencyDoctor: 'Dr. Kamran Malik (0301-8765432)',
    vision: 'Uses Eyeglasses (Left: -1.5, Right: -1.75)',
    vaccination: 'Fully Vaccinated (Polio, Typhoid, MMR)'
  },
  {
    id: 'hlth_2',
    studentId: 'STD-102',
    name: 'Aisha Fatima',
    rollNo: '108',
    className: 'Class 9',
    bloodGroup: 'O+',
    height: '5 ft 2 in',
    weight: '49 kg',
    bmi: '19.8 (Normal)',
    allergies: 'None reported',
    chronicConditions: 'None',
    emergencyDoctor: 'Dr. Saima (0321-4567890)',
    vision: 'Normal (6/6)',
    vaccination: 'Fully Vaccinated'
  },
  {
    id: 'hlth_3',
    studentId: 'STD-103',
    name: 'Ali Raza Lodhi',
    rollNo: '112',
    className: 'Class 8',
    bloodGroup: 'A+',
    height: '5 ft 0 in',
    weight: '44 kg',
    bmi: '19.1 (Normal)',
    allergies: 'Penicillin allergy',
    chronicConditions: 'Prone to seasonal migraine',
    emergencyDoctor: 'Dr. Tariq (0333-9876543)',
    vision: 'Normal (6/6)',
    vaccination: 'Fully Vaccinated'
  }
];

const PRELOADED_DISPENSARY_LOGS = [
  {
    id: 'disp_1',
    studentName: 'Muhammad Ahmad',
    className: 'Class 9',
    date: new Date().toISOString().split('T')[0],
    time: '11:15 AM',
    complaint: 'Mild headache & fever (99.8°F)',
    treatment: 'Paracetamol 500mg given with water, 20 mins bed rest in sick room.',
    disposition: 'Returned to class after rest',
    parentNotified: true
  },
  {
    id: 'disp_2',
    studentName: 'Ali Raza Lodhi',
    className: 'Class 8',
    date: new Date().toISOString().split('T')[0],
    time: '09:40 AM',
    complaint: 'Knee scrape during physical education / PT period',
    treatment: 'Antiseptic Pyodine cleaning and sterile bandage applied.',
    disposition: 'Returned to class',
    parentNotified: false
  }
];

const StudentHealthRecord = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';

  const [healthRecords, setHealthRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(`student_health_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRELOADED_HEALTH_RECORDS;
  });

  const [dispensaryLogs, setDispensaryLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(`dispensary_logs_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRELOADED_DISPENSARY_LOGS;
  });

  const [activeTab, setActiveTab] = useState('PROFILES'); // 'PROFILES' | 'SICK_BAY'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showAddVisitModal, setShowAddVisitModal] = useState(false);

  // New Profile Form
  const [newProfile, setNewProfile] = useState({
    name: '',
    rollNo: '',
    className: 'Class 9',
    bloodGroup: 'B+',
    height: '5 ft 4 in',
    weight: '50 kg',
    allergies: 'None',
    chronicConditions: 'None',
    emergencyDoctor: '',
    vision: 'Normal (6/6)',
    vaccination: 'Fully Vaccinated'
  });

  // New Visit Form
  const [newVisit, setNewVisit] = useState({
    studentName: '',
    className: 'Class 9',
    complaint: 'Headache & nausea',
    treatment: 'First aid & rest administered',
    disposition: 'Returned to class'
  });

  const saveProfiles = (list) => {
    setHealthRecords(list);
    try {
      localStorage.setItem(`student_health_${schoolId}`, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const saveLogs = (list) => {
    setDispensaryLogs(list);
    try {
      localStorage.setItem(`dispensary_logs_${schoolId}`, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProfile = (e) => {
    e.preventDefault();
    if (!newProfile.name || !newProfile.rollNo) return;
    const obj = { id: `hlth_${Date.now()}`, ...newProfile };
    const updated = [obj, ...healthRecords];
    saveProfiles(updated);
    setShowAddProfileModal(false);
  };

  const handleCreateVisit = (e) => {
    e.preventDefault();
    if (!newVisit.studentName) return;
    const obj = {
      id: `disp_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      parentNotified: false,
      ...newVisit
    };
    const updated = [obj, ...dispensaryLogs];
    saveLogs(updated);
    setShowAddVisitModal(false);
  };

  const handleNotifyParentWhatsApp = (log) => {
    let msg = `*🏥 Lodhi School System — First Aid & Sick Bay Notice*\n\n`;
    msg += `Bara-e-meharbani muttala farmayein ke aap ka bacha *${log.studentName}* (${log.className}) aaj *${log.time}* par school sick room tashreef laya tha.\n\n`;
    msg += `📌 *Complaint:* ${log.complaint}\n`;
    msg += `💊 *Treatment Administered:* ${log.treatment}\n`;
    msg += `🩺 *Current Status:* ${log.disposition}\n\n`;
    msg += `Bacha is waqt bilkul theek hai. Kisi mazeed maloomat ke liye school reception se rabta karein.\n`;

    const encoded = encodeURI(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const filteredRecords = healthRecords.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.rollNo.includes(searchTerm);
    const matchesBlood = selectedBloodGroup === 'All' || r.bloodGroup === selectedBloodGroup;
    return matchesSearch && matchesBlood;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-50/90 via-white to-pink-50/70 border border-rose-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse size={14} className="text-rose-600" />
              Student Medical & Safety Vault
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              Emergency First Aid Logs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Student Health & Medical Records</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Track student blood groups, chronic allergies, vision prescriptions, emergency doctor contacts, and record real-time sick bay / dispensary visits.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto relative z-10">
          <button 
            onClick={() => setShowAddVisitModal(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Bandage size={15} />
            <span>Log Sick Bay Visit</span>
          </button>

          <button 
            onClick={() => setShowAddProfileModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-slate-300 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>New Health Card</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Health Profiles</span>
          <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
            {healthRecords.length} Students
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Known Allergies / Asthma</span>
          <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">
            {healthRecords.filter(r => r.allergies !== 'None' || r.chronicConditions !== 'None').length} Students
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Dispensary Visits Today</span>
          <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
            {dispensaryLogs.length} Cases
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Universal Donors (O-)</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
            {healthRecords.filter(r => r.bloodGroup.includes('O')).length} Donors
          </span>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('PROFILES')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'PROFILES' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <HeartPulse size={15} />
          <span>Student Health Profiles ({healthRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SICK_BAY')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'SICK_BAY' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <Bandage size={15} />
          <span>Dispensary & Sick Bay Logs ({dispensaryLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: HEALTH PROFILES */}
      {activeTab === 'PROFILES' && (
        <div className="space-y-4">
          
          {/* SEARCH & BLOOD FILTER */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student by name or roll number..."
                className="w-full text-xs font-bold pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Blood Group:</span>
              <select
                value={selectedBloodGroup}
                onChange={(e) => setSelectedBloodGroup(e.target.value)}
                className="text-xs font-bold py-2 px-3 rounded-xl bg-slate-50 border border-slate-200"
              >
                <option value="All">All Groups</option>
                <option value="A+">A+</option>
                <option value="B+">B+</option>
                <option value="O+">O+</option>
                <option value="AB+">AB+</option>
                <option value="A-">A-</option>
                <option value="B-">B-</option>
                <option value="O-">O-</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          {/* HEALTH CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRecords.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-black text-sm">
                      {r.bloodGroup}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-950 text-sm leading-snug">{r.name}</h3>
                      <p className="text-[11px] text-slate-500 font-bold">{r.className} • Roll #{r.rollNo}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                    BMI: {r.bmi}
                  </span>
                </div>

                {/* Medical Details */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
                      <AlertCircle size={11} className="text-amber-600" /> Allergies & Conditions:
                    </span>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {r.allergies} {r.chronicConditions !== 'None' ? `• ${r.chronicConditions}` : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Height / Weight</span>
                      <span className="font-bold text-slate-800">{r.height} • {r.weight}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Eyesight</span>
                      <span className="font-bold text-slate-800 truncate block">{r.vision}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 truncate max-w-[170px]" title={r.emergencyDoctor}>
                    🩺 {r.emergencyDoctor || 'No doctor assigned'}
                  </span>
                  <button 
                    onClick={() => saveProfiles(healthRecords.filter(item => item.id !== r.id))}
                    className="text-slate-300 hover:text-red-500 p-1"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 2: SICK BAY LOGS */}
      {activeTab === 'SICK_BAY' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-black text-slate-900 text-base">Dispensary & Sick Room Incident Register</h2>
              <p className="text-xs text-slate-500">Record treatments given to students and notify parents directly.</p>
            </div>
            <button 
              onClick={() => setShowAddVisitModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} /> New Incident
            </button>
          </div>

          <div className="space-y-3">
            {dispensaryLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono text-[10px] font-bold">
                      {log.time} • {log.date}
                    </span>
                    <h3 className="font-black text-slate-950 text-sm">{log.studentName}</h3>
                    <span className="text-xs font-bold text-slate-500">({log.className})</span>
                  </div>

                  <p className="text-xs text-slate-700">
                    <strong className="text-slate-900">Complaint:</strong> {log.complaint}
                  </p>
                  <p className="text-xs text-emerald-800 font-medium">
                    <strong className="text-slate-900">Treatment:</strong> {log.treatment}
                  </p>
                  <p className="text-[11px] text-slate-500 font-bold">
                    Status: {log.disposition}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleNotifyParentWhatsApp(log)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Send size={13} />
                    <span>WhatsApp Parent</span>
                  </button>
                  <button
                    onClick={() => saveLogs(dispensaryLogs.filter(item => item.id !== log.id))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD HEALTH PROFILE */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <HeartPulse size={18} className="text-rose-600" />
              <span>Create Student Health Profile</span>
            </h3>

            <form onSubmit={handleCreateProfile} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Student Full Name</label>
                <input 
                  type="text" 
                  value={newProfile.name}
                  onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                  placeholder="e.g. Muhammad Ahmad"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Roll No</label>
                  <input 
                    type="text" 
                    value={newProfile.rollNo}
                    onChange={(e) => setNewProfile({ ...newProfile, rollNo: e.target.value })}
                    placeholder="e.g. 104"
                    required
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Blood Group</label>
                  <select
                    value={newProfile.bloodGroup}
                    onChange={(e) => setNewProfile({ ...newProfile, bloodGroup: e.target.value })}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  >
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="O+">O+</option>
                    <option value="AB+">AB+</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="O-">O-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Height</label>
                  <input 
                    type="text" 
                    value={newProfile.height}
                    onChange={(e) => setNewProfile({ ...newProfile, height: e.target.value })}
                    placeholder="e.g. 5 ft 4 in"
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Weight</label>
                  <input 
                    type="text" 
                    value={newProfile.weight}
                    onChange={(e) => setNewProfile({ ...newProfile, weight: e.target.value })}
                    placeholder="e.g. 52 kg"
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Allergies (Dust, Peanuts, Medicine)</label>
                <input 
                  type="text" 
                  value={newProfile.allergies}
                  onChange={(e) => setNewProfile({ ...newProfile, allergies: e.target.value })}
                  placeholder="e.g. Peanuts allergy / Penicillin / None"
                  className="w-full text-xs font-medium rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Emergency Doctor / Clinic Contact</label>
                <input 
                  type="text" 
                  value={newProfile.emergencyDoctor}
                  onChange={(e) => setNewProfile({ ...newProfile, emergencyDoctor: e.target.value })}
                  placeholder="e.g. Dr. Kamran (0300-1234567)"
                  className="w-full text-xs font-medium rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-black"
                >
                  Save Health Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SICK BAY VISIT */}
      {showAddVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Bandage size={18} className="text-rose-600" />
              <span>Log Sick Bay / Dispensary Visit</span>
            </h3>

            <form onSubmit={handleCreateVisit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Student Name</label>
                <input 
                  type="text" 
                  value={newVisit.studentName}
                  onChange={(e) => setNewVisit({ ...newVisit, studentName: e.target.value })}
                  placeholder="e.g. Muhammad Ahmad"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Complaint / Symptoms</label>
                <input 
                  type="text" 
                  value={newVisit.complaint}
                  onChange={(e) => setNewVisit({ ...newVisit, complaint: e.target.value })}
                  placeholder="e.g. Fever (100°F), stomach pain, cut on finger"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">First Aid / Medicine Given</label>
                <input 
                  type="text" 
                  value={newVisit.treatment}
                  onChange={(e) => setNewVisit({ ...newVisit, treatment: e.target.value })}
                  placeholder="e.g. Paracetamol syrup, Pyodine dressing, 15 min rest"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddVisitModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black"
                >
                  Save Incident Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentHealthRecord;
