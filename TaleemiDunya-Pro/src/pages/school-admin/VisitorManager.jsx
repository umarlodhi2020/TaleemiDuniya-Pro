import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Plus, 
  Trash2, 
  Search, 
  Clock, 
  LogOut, 
  Printer, 
  QrCode, 
  Phone, 
  FileText, 
  User, 
  Car, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Filter
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const PRELOADED_VISITORS = [
  {
    id: 'vis_101',
    passNo: 'VP-2026-081',
    name: 'Tariq Mahmood Lodhi',
    cnic: '35201-1234567-1',
    phone: '0300-1234567',
    purpose: 'Fee Deposit & Parent Inquiry',
    meetingWith: 'Accounts Office (Sir Bilal)',
    personsCount: 1,
    vehicleNo: 'LEA-4920 (Car)',
    timeIn: '09:15 AM',
    timeOut: null,
    date: new Date().toISOString().split('T')[0],
    status: 'INSIDE'
  },
  {
    id: 'vis_102',
    passNo: 'VP-2026-082',
    name: 'Kamran Ashraf (TCS Courier)',
    cnic: '35202-9876543-3',
    phone: '0321-7654321',
    purpose: 'Document / Courier Delivery',
    meetingWith: 'Admin Reception',
    personsCount: 1,
    vehicleNo: 'LHO-8812 (Bike)',
    timeIn: '10:05 AM',
    timeOut: '10:20 AM',
    date: new Date().toISOString().split('T')[0],
    status: 'CHECKED_OUT'
  },
  {
    id: 'vis_103',
    passNo: 'VP-2026-083',
    name: 'Engr. Zafar Iqbal',
    cnic: '35201-5544332-9',
    phone: '0333-4455667',
    purpose: 'Meeting regarding IT Lab CCTV Setup',
    meetingWith: 'Principal Office',
    personsCount: 2,
    vehicleNo: 'LEB-1019 (Car)',
    timeIn: '10:30 AM',
    timeOut: null,
    date: new Date().toISOString().split('T')[0],
    status: 'INSIDE'
  }
];

const VisitorManager = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';
  const schoolName = schoolData?.name || userData?.schoolName || 'Lodhi Model School System';

  const [visitors, setVisitors] = useState(() => {
    try {
      const saved = localStorage.getItem(`visitors_log_${schoolId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return PRELOADED_VISITORS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'INSIDE' | 'CHECKED_OUT'
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPassForPrint, setSelectedPassForPrint] = useState(null);

  // New Visitor Form State
  const [form, setForm] = useState({
    name: '',
    cnic: '',
    phone: '',
    purpose: 'Meeting with Principal',
    meetingWith: 'Principal Office',
    personsCount: 1,
    vehicleNo: ''
  });

  const saveVisitors = (list) => {
    setVisitors(list);
    try {
      localStorage.setItem(`visitors_log_${schoolId}`, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateVisitor = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    const newPass = {
      id: `vis_${Date.now()}`,
      passNo: `VP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeOut: null,
      date: new Date().toISOString().split('T')[0],
      status: 'INSIDE',
      ...form
    };

    const updated = [newPass, ...visitors];
    saveVisitors(updated);
    setForm({
      name: '',
      cnic: '',
      phone: '',
      purpose: 'Meeting with Principal',
      meetingWith: 'Principal Office',
      personsCount: 1,
      vehicleNo: ''
    });
    setShowAddModal(false);
    setSelectedPassForPrint(newPass);
  };

  const handleCheckOut = (id) => {
    const updated = visitors.map(v => {
      if (v.id === id) {
        return {
          ...v,
          timeOut: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'CHECKED_OUT'
        };
      }
      return v;
    });
    saveVisitors(updated);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this visitor entry?')) return;
    const updated = visitors.filter(v => v.id !== id);
    saveVisitors(updated);
  };

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          v.phone.includes(searchTerm) || 
                          v.passNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border border-emerald-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-700" />
              Campus Security & Gate Access
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              Real-Time Gate Pass Logs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Security Visitor & Guest Gate Pass</h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
            Issue electronic visitor passes with QR codes, record CNIC & mobile contacts, monitor visitors currently on campus, and record checkout exit timestamps.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>New Visitor Gate Pass</span>
        </button>
      </div>

      {/* KPI METRICS */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Active On Campus Now</span>
          <span className="text-2xl font-black text-emerald-600 font-mono mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            {visitors.filter(v => v.status === 'INSIDE').length} Visitors
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Checked Out</span>
          <span className="text-2xl font-black text-slate-700 font-mono mt-1 block">
            {visitors.filter(v => v.status === 'CHECKED_OUT').length} Exited
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Passes Today</span>
          <span className="text-2xl font-black text-indigo-600 font-mono mt-1 block">
            {visitors.length} Passes
          </span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Gate Security Officer</span>
          <span className="text-sm font-black text-slate-900 mt-2 block">
            Guard Riaz (Gate #1)
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search visitor by name, phone, or pass number..."
            className="w-full text-xs font-bold pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Filter Status:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('INSIDE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === 'INSIDE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Inside Campus
            </button>
            <button
              onClick={() => setFilterStatus('CHECKED_OUT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === 'CHECKED_OUT' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Checked Out
            </button>
          </div>
        </div>
      </div>

      {/* VISITOR LOGS LIST */}
      <div className="print:hidden bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-black text-slate-900 text-base">Visitor Logs Register</h2>
          <span className="text-xs font-bold text-slate-500">{filteredVisitors.length} Entries</span>
        </div>

        <div className="space-y-3">
          {filteredVisitors.map((v) => {
            const isInside = v.status === 'INSIDE';

            return (
              <div 
                key={v.id} 
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isInside ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-white">
                      {v.passNo}
                    </span>
                    <h3 className="font-black text-slate-950 text-sm">{v.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${isInside ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {isInside ? '🟢 Inside Campus' : '✓ Exited'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">
                    <strong className="text-slate-900">Purpose:</strong> {v.purpose} • <strong className="text-slate-900">Visiting:</strong> {v.meetingWith}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium pt-0.5">
                    <span>📞 {v.phone}</span>
                    {v.cnic && <span>🆔 {v.cnic}</span>}
                    {v.vehicleNo && <span>🚗 {v.vehicleNo}</span>}
                    <span className="font-mono font-bold text-slate-700">Time In: {v.timeIn} {v.timeOut ? `| Out: ${v.timeOut}` : ''}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => setSelectedPassForPrint(v)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all"
                    title="Print Gate Pass Badge"
                  >
                    <Printer size={13} />
                    <span>Print Pass</span>
                  </button>

                  {isInside && (
                    <button
                      onClick={() => handleCheckOut(v.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      title="Checkout Visitor"
                    >
                      <LogOut size={13} />
                      <span>Check Out</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
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

      {/* MODAL: ADD VISITOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <span>Issue New Visitor Gate Pass</span>
            </h3>

            <form onSubmit={handleCreateVisitor} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Visitor Full Name</label>
                <input 
                  type="text" 
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Tariq Mahmood"
                  required
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone</label>
                  <input 
                    type="text" 
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 0300-1234567"
                    required
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">CNIC (Optional)</label>
                  <input 
                    type="text" 
                    value={form.cnic}
                    onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                    placeholder="35201-xxxxxxx-x"
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Visiting Department / Person</label>
                <select
                  value={form.meetingWith}
                  onChange={(e) => setForm({ ...form, meetingWith: e.target.value })}
                  className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                >
                  <option value="Principal Office">Principal Office</option>
                  <option value="Accounts / Fee Office">Accounts / Fee Office</option>
                  <option value="Admissions Inquiry Desk">Admissions Inquiry Desk</option>
                  <option value="Class Teacher Meeting">Class Teacher Meeting</option>
                  <option value="Student Relative / Guardian">Student Meeting</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle No (Bike / Car)</label>
                  <input 
                    type="text" 
                    value={form.vehicleNo}
                    onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
                    placeholder="e.g. LEA-4920"
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Persons Count</label>
                  <input 
                    type="number" 
                    min="1"
                    max="10"
                    value={form.personsCount}
                    onChange={(e) => setForm({ ...form, personsCount: Number(e.target.value) })}
                    className="w-full text-xs font-bold rounded-xl border-slate-200 bg-slate-50 py-2.5 px-3 focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
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
                  Generate Pass & Print
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINT VISITOR BADGE */}
      {selectedPassForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="border-2 border-slate-900 rounded-2xl p-4 text-left space-y-3 font-sans">
              <div className="border-b-2 border-slate-900 pb-2 text-center">
                <h4 className="font-black text-sm uppercase text-slate-950">{schoolName}</h4>
                <p className="text-[10px] font-bold text-slate-600 uppercase">OFFICIAL VISITOR SECURITY PASS</p>
                <span className="inline-block px-3 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold text-xs mt-1">
                  {selectedPassForPrint.passNo}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <p><strong>Visitor:</strong> {selectedPassForPrint.name}</p>
                <p><strong>Phone:</strong> {selectedPassForPrint.phone}</p>
                <p><strong>Visiting:</strong> {selectedPassForPrint.meetingWith}</p>
                <p><strong>Purpose:</strong> {selectedPassForPrint.purpose}</p>
                {selectedPassForPrint.vehicleNo && <p><strong>Vehicle:</strong> {selectedPassForPrint.vehicleNo}</p>}
                <p><strong>Time In:</strong> {selectedPassForPrint.timeIn} | {selectedPassForPrint.date}</p>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-3 flex items-center justify-between text-[10px] text-slate-500">
                <span>Guard Signature: ________</span>
                <span>Exit Stamp: ________</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button 
                onClick={() => setSelectedPassForPrint(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button 
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-black hover:bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 shadow-md"
              >
                <Printer size={14} />
                <span>Print Pass Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VisitorManager;
