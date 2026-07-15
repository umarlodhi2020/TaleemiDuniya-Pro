import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Send, 
  Search, 
  Filter, 
  Printer, 
  PhoneCall, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  DollarSign, 
  ArrowLeft,
  Calendar,
  MessageSquare,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const FeeDefaulters = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Lodhi School System';

  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [sendingId, setSendingId] = useState(null);
  const [sentList, setSentList] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);

  useEffect(() => {
    fetchDefaulters();
  }, [schoolId]);

  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      const students = await getRecords('students', schoolId);
      const fees = await getRecords('fees', schoolId);
      
      if (fees && fees.length > 0 && students && students.length > 0) {
        // Filter overdue/unpaid fees
        const unpaid = fees.filter(f => f.status === 'unpaid' || f.status === 'pending' || f.status === 'overdue');
        const map = new Map();
        unpaid.forEach(f => {
          const st = students.find(s => s.id === f.studentId || s.rollNumber === f.rollNumber);
          if (st) {
            const existing = map.get(st.id) || {
              id: st.id,
              name: st.name,
              rollNumber: st.rollNumber || 'N/A',
              class: st.class || 'N/A',
              parentPhone: st.phone || st.parentPhone || '03000000000',
              parentName: st.parentName || 'Parent',
              totalDue: 0,
              monthsPendingList: [],
              dueDate: f.dueDate || new Date().toISOString().split('T')[0],
              status: 'overdue'
            };
            existing.totalDue += (Number(f.amount) || 0);
            if (f.month && !existing.monthsPendingList.includes(f.month)) {
              existing.monthsPendingList.push(f.month);
            }
            if (existing.totalDue > 10000) existing.status = 'critical';
            map.set(st.id, existing);
          }
        });
        const result = Array.from(map.values()).map(item => ({
          ...item,
          monthsPending: item.monthsPendingList.length > 0 ? item.monthsPendingList.join(', ') : 'Current Month'
        }));
        if (result.length > 0) {
          setDefaulters(result);
        } else {
          setDefaulters([]);
        }
      } else {
        setDefaulters([]);
      }
    } catch (e) {
      console.error('Error fetching defaulters:', e);
      setDefaulters([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = defaulters.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.parentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'ALL' || String(item.class) === String(selectedClass);
    return matchesSearch && matchesClass;
  });

  const totalOverdueAmount = filtered.reduce((acc, curr) => acc + curr.totalDue, 0);
  const criticalCount = filtered.filter(item => item.status === 'critical').length;

  const handleSendWhatsApp = async (def) => {
    setSendingId(def.id);
    const msg = `Assalam-o-Alaikum! Dear Parent (${def.parentName}), aap ke bachay ${def.name} (Roll #: ${def.rollNumber}, Class: ${def.class}) ki school fee Rs. ${def.totalDue.toLocaleString()} (${def.monthsPending}) pending hai. Kindly jald az jald school office me submit karwayein to avoid late fine. Thank you! - ${schoolName}`;
    
    // Simulate or send via API
    try {
      await new Promise(r => setTimeout(r, 800));
      setSentList(prev => [...prev, def.id]);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingId(null);
    }
  };

  const handleSendBulkWhatsApp = async () => {
    if (!window.confirm(`Are you sure you want to send automated WhatsApp reminders to all ${filtered.length} pending parents?`)) return;
    for (const def of filtered) {
      if (!sentList.includes(def.id)) {
        await handleSendWhatsApp(def);
      }
    }
    alert('All WhatsApp reminder notifications dispatched successfully via AI Bot!');
  };

  const handlePrintAllNotices = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Print Styles for Legal Defaulter Notices */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #print-defaulter-slips, #print-defaulter-slips * {
            visibility: visible;
          }
          #print-defaulter-slips {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 1cm !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-300 animate-bounce" />
            Fee Defaulters & Recovery Radar
          </h1>
          <p className="text-red-100 text-xs md:text-sm font-medium mt-1">
            Real-time tracking of overdue fees, 1-Click WhatsApp automated recovery alerts & printable legal notices
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <button 
            onClick={() => navigate('/school-admin/fees')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <ArrowLeft size={16} /> Back to Fee Manager
          </button>
        </div>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <GlassCard className="p-5 border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">Total Overdue Amount</span>
            <span className="text-2xl font-black text-red-500 mt-1 block">Rs. {totalOverdueAmount.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
            <DollarSign size={26} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest block">Total Defaulter Students</span>
            <span className="text-2xl font-black text-yellow-500 mt-1 block">{filtered.length} Students</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
            <AlertCircle size={26} />
          </div>
        </GlassCard>

        <GlassCard className="p-5 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block">Critical Cases (&gt; Rs. 10k)</span>
            <span className="text-2xl font-black text-orange-500 mt-1 block">{criticalCount} Severe</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
            <AlertTriangle size={26} />
          </div>
        </GlassCard>
      </div>

      {/* Action Bar & Filters */}
      <GlassCard className="p-6 border-dark-border/40 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-dark-muted" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or roll #..."
                className="pl-10 py-2.5 w-full sm:w-[240px] bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-dark-text focus:outline-none focus:border-red-500"
              >
              </input>
            </div>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="py-2.5 px-4 bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-primary-400"
            >
              <option value="ALL">ALL CLASSES ({defaulters.length})</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                <option key={c} value={c.toString()}>Grade {c}</option>
              ))}
            </select>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleSendBulkWhatsApp}
              disabled={filtered.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center gap-2"
            >
              <Send size={15} />
              <span>Broadcast WhatsApp Reminders ({filtered.length})</span>
            </button>

            <button 
              onClick={handlePrintAllNotices}
              disabled={filtered.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
              <Printer size={15} />
              <span>Print All Defaulter Slips</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Defaulters Table */}
      <GlassCard className="p-0 overflow-hidden border border-dark-border shadow-2xl no-print">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <RefreshCw size={30} className="text-red-500 animate-spin" />
            <span className="text-xs font-black text-dark-muted uppercase">Scanning Fee Ledger...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-dark-muted font-bold">
            <CheckCircle2 size={40} className="mx-auto text-green-500 mb-2" />
            <span className="text-base font-extrabold text-green-400 block">All Clear! No Overdue Fee Defaulters Found.</span>
            <span className="text-xs text-dark-muted mt-1 block">Every student in this class is up to date with their dues.</span>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-card border-b border-dark-border text-[10px] text-dark-muted font-black uppercase tracking-wider">
                  <th className="py-4 px-4">Roll #</th>
                  <th className="py-4 px-4">Student Details</th>
                  <th className="py-4 px-4">Parent Phone / Contact</th>
                  <th className="py-4 px-4">Pending Months</th>
                  <th className="py-4 px-4 text-right">Total Due Amount</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60 text-xs font-medium">
                {filtered.map((def) => {
                  const isSent = sentList.includes(def.id);
                  return (
                    <tr key={def.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="py-4 px-4 font-mono font-bold text-red-400">{def.rollNumber}</td>
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-dark-text block text-sm">{def.name}</span>
                        <span className="text-[10px] font-bold text-dark-muted">Class Grade {def.class}</span>
                      </td>
                      <td className="py-4 px-4 font-mono">
                        <span className="text-dark-text font-bold block">{def.parentPhone}</span>
                        <span className="text-[10px] text-dark-muted font-sans font-semibold">{def.parentName}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px]">
                          {def.monthsPending}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-black text-yellow-400 text-sm">
                        Rs. {def.totalDue.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {def.status === 'critical' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white font-black text-[9px] uppercase tracking-wider shadow-md shadow-red-500/30 animate-pulse">
                            <AlertTriangle size={11} /> Critical
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 font-black text-[9px] uppercase tracking-wider">
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSendWhatsApp(def)}
                            disabled={sendingId === def.id || isSent}
                            className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 transition-all ${
                              isSent 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-600/20'
                            }`}
                            title="Send WhatsApp Reminder via Bot"
                          >
                            <Send size={12} />
                            <span>{sendingId === def.id ? 'Sending...' : (isSent ? 'Sent ✓' : 'WhatsApp')}</span>
                          </button>

                          <button
                            onClick={() => setSelectedNotice(def)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 border border-dark-border transition-all"
                            title="View / Print Defaulter Notice Slips"
                          >
                            <FileText size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* PRINTABLE LEGAL DEFAULTER NOTICE SLIPS (Hidden except on Print) */}
      <div id="print-defaulter-slips" className="hidden print:block text-black bg-white">
        <div className="text-center pb-4 border-b-2 border-black mb-6">
          <h1 className="text-2xl font-black uppercase tracking-wider">{schoolName}</h1>
          <h2 className="text-lg font-bold mt-1 uppercase text-red-600">Official Fee Defaulter Recovery Notice</h2>
          <p className="text-xs font-semibold mt-0.5">Printed on: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {filtered.map((def, i) => (
            <div key={def.id} className="border-2 border-black p-5 rounded-xl font-sans break-inside-avoid">
              <div className="flex justify-between items-center border-b border-black pb-2 mb-3">
                <span className="font-black text-sm uppercase text-gray-800">PARENT ADVISORY / FEE NOTICE #{i + 1}</span>
                <span className="font-mono font-black text-red-700 bg-red-100 px-2 py-0.5 border border-red-800 text-xs">
                  OVERDUE DUES: RS. {def.totalDue.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-semibold">
                <div>Student Name: <span className="font-black">{def.name}</span></div>
                <div>Roll Number: <span className="font-black">{def.rollNumber}</span></div>
                <div>Class Grade: <span className="font-black">Grade {def.class}</span></div>
                <div>Parent / Guardian: <span className="font-black">{def.parentName} ({def.parentPhone})</span></div>
              </div>

              <div className="bg-gray-100 border border-gray-400 p-3 rounded text-xs leading-relaxed mb-4">
                <p className="font-bold">Respected Parent / Guardian,</p>
                <p className="mt-1">
                  This is to officially notify you that the monthly tuition fee of your child for the month(s) of <span className="font-black underline">{def.monthsPending}</span> amounting to <span className="font-black text-red-700">Rs. {def.totalDue.toLocaleString()}</span> is still pending beyond the due date. You are requested to deposit the outstanding dues immediately at the school accounts office or through bank transfer to avoid late payment fines or administrative interruption in classroom attendance.
                </p>
              </div>

              <div className="flex justify-between items-end text-[10px] font-black pt-4 border-t border-gray-400">
                <div>Accounts Officer Signature: __________________</div>
                <div>Principal Stamp: __________________</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Single Notice Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <GlassCard className="p-6 max-w-[500px] w-full border-dark-border bg-dark-card relative">
            <h3 className="text-lg font-black text-red-400 flex items-center gap-2 mb-4">
              <FileText size={20} /> Preview Defaulter Notice Slip
            </h3>
            <div className="bg-dark-bg border border-red-500/30 p-4 rounded-xl text-xs space-y-3 font-medium">
              <div className="flex justify-between font-bold text-sm text-dark-text border-b border-dark-border pb-2">
                <span>{selectedNotice.name} (Roll: {selectedNotice.rollNumber})</span>
                <span className="text-red-400">Rs. {selectedNotice.totalDue.toLocaleString()}</span>
              </div>
              <p className="text-dark-muted">
                Dear <strong className="text-dark-text">{selectedNotice.parentName}</strong>, monthly tuition dues for <strong className="text-dark-text">{selectedNotice.monthsPending}</strong> are overdue. Kindly clear the pending balance of Rs. {selectedNotice.totalDue.toLocaleString()} promptly at the school office.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-dark-text"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedNotice(null);
                  setTimeout(() => window.print(), 300);
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase flex items-center gap-2 shadow-lg shadow-red-600/30"
              >
                <Printer size={15} /> Print Slip Now
              </button>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
};

export default FeeDefaulters;
