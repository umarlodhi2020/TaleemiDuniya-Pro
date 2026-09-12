import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Printer, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  Calendar, 
  PhoneCall, 
  FileText, 
  X, 
  Plus, 
  QrCode, 
  Save, 
  Trash2,
  Lock,
  Unlock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../../services/firebase';

const GatePassManager = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Lodhi School System';

  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);

  // New Gate Pass Form
  const [newPass, setNewPass] = useState({
    rollNumber: '',
    studentName: '',
    classGrade: '10',
    parentPhone: '',
    reason: 'Medical Leave / Doctor Appointment',
    exitType: 'Early Half-Leave'
  });

  useEffect(() => {
    fetchGatePasses();
  }, [schoolId]);

  const fetchGatePasses = async () => {
    setLoading(true);
    try {
      const q = query(collection(firestore, 'gate_passes'), where('schoolId', '==', schoolId));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      if (list.length > 0) {
        setPasses(list);
      } else {
        setPasses([]);
      }
    } catch (e) {
      console.error(e);
      setPasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLookupStudent = async (roll) => {
    if (!roll) return;
    try {
      const students = await getRecords('students', schoolId);
      if (students) {
        const found = students.find(s => String(s.rollNumber) === String(roll) || String(s.id) === String(roll));
        if (found) {
          setNewPass(prev => ({
            ...prev,
            studentName: found.name || '',
            classGrade: found.class || '10',
            parentPhone: found.phone || found.parentPhone || '03000000000'
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePass = async (e) => {
    e.preventDefault();
    if (!newPass.rollNumber || !newPass.studentName) {
      alert('Please provide student roll number and name.');
      return;
    }
    const passObj = {
      ...newPass,
      id: `gp_${Date.now()}`,
      schoolId,
      issuedBy: userData?.name || 'Reception / Admin',
      timeIssued: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateIssued: new Date().toISOString().split('T')[0],
      status: 'approved'
    };
    setPasses([passObj, ...passes]);
    setShowAddModal(false);
    setNewPass({ rollNumber: '', studentName: '', classGrade: '10', parentPhone: '', reason: 'Medical Leave / Doctor Appointment', exitType: 'Early Half-Leave' });
    try {
      await setDoc(doc(firestore, 'gate_passes', passObj.id), passObj);
    } catch (e) {
      console.error(e);
    }
    alert('Security Gate Pass & Exit Slip generated successfully!');
    setSelectedPass(passObj);
  };

  const filtered = passes.filter(p =>
    p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Print Styles for A6 / Thermal Gate Pass Receipt */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #print-gate-pass, #print-gate-pass * {
            visibility: visible;
          }
          #print-gate-pass {
            position: absolute;
            left: 50%;
            top: 40%;
            transform: translate(-50%, -50%);
            width: 380px !important;
            padding: 1cm !important;
            border: 2px dashed #000000 !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-teal-200 animate-pulse" />
            Security Exit Gate Pass & Verification Slips
          </h1>
          <p className="text-teal-100 text-xs md:text-sm font-medium mt-1">
            Generate student early exit slips, verify visitor pickups & print thermal security gate receipts
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <button 
            onClick={() => navigate('/school-admin')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <GlassCard className="p-6 border-dark-border/40 no-print">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-[300px]">
            <Search size={16} className="absolute left-3.5 top-3 text-dark-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student or roll #..."
              className="pl-10 py-2.5 w-full bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-dark-text"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
          >
            <Plus size={16} />
            <span>+ Issue New Gate Pass Slip</span>
          </button>
        </div>
      </GlassCard>

      {/* Gate Passes Table */}
      <GlassCard className="p-0 overflow-hidden border border-dark-border shadow-2xl no-print">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <RefreshCw size={30} className="text-teal-500 animate-spin" />
            <span className="text-xs font-black text-dark-muted uppercase">Verifying Gate Records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-dark-muted font-bold">No gate passes logged today.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-card border-b border-dark-border text-[10px] text-dark-muted font-black uppercase tracking-wider">
                  <th className="py-4 px-4">Roll #</th>
                  <th className="py-4 px-4">Student & Class</th>
                  <th className="py-4 px-4">Exit Type / Reason</th>
                  <th className="py-4 px-4">Parent Phone</th>
                  <th className="py-4 px-4">Issued By & Time</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-center">Print Gate Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/60 text-xs font-medium">
                {filtered.map((pass) => (
                  <tr key={pass.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-4 px-4 font-mono font-bold text-teal-400">{pass.rollNumber}</td>
                    <td className="py-4 px-4">
                      <span className="font-extrabold text-dark-text block text-sm">{pass.studentName}</span>
                      <span className="text-[10px] font-bold text-dark-muted">Class Grade {pass.classGrade}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-yellow-400 block">{pass.exitType}</span>
                      <span className="text-[10px] text-dark-muted font-normal">{pass.reason}</span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-dark-text">
                      {pass.parentPhone}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-dark-text font-bold block">{pass.issuedBy}</span>
                      <span className="text-[10px] text-dark-muted font-mono">{pass.timeIssued}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 font-black text-[9px] uppercase tracking-wider">
                        <CheckCircle2 size={11} /> Approved
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => setSelectedPass(pass)}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500 hover:text-white text-teal-400 border border-teal-500/20 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 mx-auto transition-all"
                      >
                        <Printer size={12} />
                        <span>Gate Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* NEW GATE PASS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print select-text">
          <GlassCard className="p-6 max-w-[460px] w-full border-dark-border bg-dark-card relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-dark-muted hover:text-dark-text"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-teal-400 flex items-center gap-2 mb-4">
              <ShieldCheck size={20} /> Issue Student Exit Gate Pass
            </h3>
            <form onSubmit={handleCreatePass} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-dark-muted uppercase text-[10px] mb-1">Student Roll # *</label>
                  <input
                    type="text"
                    required
                    value={newPass.rollNumber}
                    onChange={(e) => {
                      setNewPass({ ...newPass, rollNumber: e.target.value });
                      handleLookupStudent(e.target.value);
                    }}
                    placeholder="e.g. 102"
                    className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border font-mono text-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-dark-muted uppercase text-[10px] mb-1">Class Grade</label>
                  <select
                    value={newPass.classGrade}
                    onChange={(e) => setNewPass({ ...newPass, classGrade: e.target.value })}
                    className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border text-primary-400 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                      <option key={c} value={c.toString()}>Grade {c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-dark-muted uppercase text-[10px] mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={newPass.studentName}
                  onChange={(e) => setNewPass({ ...newPass, studentName: e.target.value })}
                  placeholder="e.g. Zainab Ahmed"
                  className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border"
                />
              </div>
              <div>
                <label className="block text-dark-muted uppercase text-[10px] mb-1">Parent Contact Phone</label>
                <input
                  type="text"
                  value={newPass.parentPhone}
                  onChange={(e) => setNewPass({ ...newPass, parentPhone: e.target.value })}
                  placeholder="e.g. 03001234567"
                  className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-dark-muted uppercase text-[10px] mb-1">Exit Category</label>
                  <select
                    value={newPass.exitType}
                    onChange={(e) => setNewPass({ ...newPass, exitType: e.target.value })}
                    className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border text-teal-400 font-bold"
                  >
                    <option value="Early Half-Leave">Early Half-Leave</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Regular Exit">Regular Gate Exit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-dark-muted uppercase text-[10px] mb-1">Reason / Purpose</label>
                  <input
                    type="text"
                    value={newPass.reason}
                    onChange={(e) => setNewPass({ ...newPass, reason: e.target.value })}
                    placeholder="e.g. Doctor checkup"
                    className="w-full premium-input bg-dark-bg p-2.5 rounded-xl border border-dark-border"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black uppercase shadow-lg shadow-teal-600/30"
                >
                  Print Security Gate Pass
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* PRINTABLE GATE PASS SLIP MODAL */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 no-print select-none">
          <GlassCard className="p-6 max-w-[400px] w-full border-dark-border relative text-black bg-white select-text">
            <button
              onClick={() => setSelectedPass(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>

            <div className="border-2 border-dashed border-black p-4 rounded-xl flex flex-col justify-between font-sans bg-white min-h-[340px]">
              <div className="text-center border-b-2 border-black pb-2 mb-3">
                <h3 className="text-xs font-black uppercase text-gray-800 tracking-wide">{schoolName}</h3>
                <span className="inline-block text-[10px] font-black uppercase tracking-widest border border-black py-0.5 px-2 bg-gray-100 text-gray-900 rounded mt-1">
                  OFFICIAL GATE PASS SLIP
                </span>
              </div>

              <div className="space-y-2 text-xs font-semibold text-gray-800">
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span>Student Name:</span>
                  <span className="font-black text-gray-900">{selectedPass.studentName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span>Roll Number:</span>
                  <span className="font-mono font-black text-teal-700">{selectedPass.rollNumber}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span>Class Grade:</span>
                  <span className="font-black">Grade {selectedPass.classGrade}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1 text-red-600">
                  <span>Exit Category:</span>
                  <span className="font-black">{selectedPass.exitType}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span>Reason:</span>
                  <span>{selectedPass.reason}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span>Issued Time:</span>
                  <span className="font-mono">{selectedPass.timeIssued}</span>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t-2 border-black flex justify-between text-[8px] font-black text-gray-600 uppercase">
                <div className="text-center min-w-[100px]">
                  <div className="h-5 border-b border-gray-400 w-full mb-1"></div>
                  <span>Admin / Reception</span>
                </div>
                <div className="text-center min-w-[100px]">
                  <div className="h-5 border-b border-gray-400 w-full mb-1"></div>
                  <span>Security Guard Check</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-teal-600 border border-teal-700 text-white hover:bg-teal-700 font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer size={14} />
                <span>Print Gate Slip</span>
              </button>
              <button 
                onClick={() => setSelectedPass(null)}
                className="py-2 px-5 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 font-bold text-xs uppercase"
              >
                Close
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* HIDDEN PRINT CONTAINER */}
      {selectedPass && (
        <div id="print-gate-pass" className="hidden print:block text-black bg-white">
          <div className="border-2 border-dashed border-black p-4 rounded-xl flex flex-col justify-between font-sans bg-white min-h-[350px]">
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <h3 className="text-xs font-black uppercase text-gray-800 tracking-wide">{schoolName}</h3>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest border border-black py-0.5 px-2 bg-gray-100 text-gray-900 rounded mt-1">
                OFFICIAL GATE PASS SLIP
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-semibold text-gray-800">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>Student Name:</span>
                <span className="font-black text-gray-900">{selectedPass.studentName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>Roll Number:</span>
                <span className="font-mono font-black text-teal-700">{selectedPass.rollNumber}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>Class Grade:</span>
                <span className="font-black">Grade {selectedPass.classGrade}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1 text-red-600">
                <span>Exit Category:</span>
                <span className="font-black">{selectedPass.exitType}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>Reason:</span>
                <span>{selectedPass.reason}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>Issued Time:</span>
                <span className="font-mono">{selectedPass.timeIssued}</span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-black flex justify-between text-[9px] font-black text-gray-600 uppercase">
              <div className="text-center min-w-[110px]">
                <div className="h-6 border-b border-gray-400 w-full mb-1"></div>
                <span>Admin / Reception</span>
              </div>
              <div className="text-center min-w-[110px]">
                <div className="h-6 border-b border-gray-400 w-full mb-1"></div>
                <span>Security Guard Check</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GatePassManager;
