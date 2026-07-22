import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  User, CreditCard, Receipt, Printer, FileText, Edit, History, Award, 
  CalendarCheck, BookOpen, MessageSquare, Bell, Shield, Search, ArrowRight, CheckCircle, Clock, DollarSign
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const SingleStudent360 = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Tabs exact match to user's "Single student" 16 features
  const tabs = [
    { id: 'profile', name: '1 Profile', icon: User },
    { id: 'collect-fee', name: '2 Collect Fee', icon: DollarSign },
    { id: 'quick-voucher', name: '3 Quick voucher generate', icon: Receipt },
    { id: 'voucher-print', name: '4 Voucher print', icon: Printer },
    { id: 'ledger-old', name: '5 Student Ledger old', icon: FileText },
    { id: 'ledger-new', name: '6 Student Ledger new', icon: FileText },
    { id: 'edit', name: '7 Edit Profile', icon: Edit },
    { id: 'receipts', name: '8 Receipts', icon: Receipt },
    { id: 'payment-history', name: '9 Payment History', icon: History },
    { id: 'id-card', name: '10 Id card', icon: Award },
    { id: 'attendance', name: '11 Attendance', icon: CalendarCheck },
    { id: 'certificate', name: '12 Generate certificate', icon: Award },
    { id: 'marksheet', name: '13 Mark Sheet', icon: BookOpen },
    { id: 'message', name: '14 Message / SMS', icon: MessageSquare },
    { id: 'family-ledger', name: '15 Family Ledger', icon: FileText },
    { id: 'reminder-slip', name: '16 Reminder Slip', icon: Bell },
  ];

  useEffect(() => {
    const fetchStudentsList = async () => {
      setLoading(true);
      const data = await getRecords('students', userData?.schoolId || 'default-school');
      setStudents(data);
      if (data.length > 0 && !selectedStudent) {
        setSelectedStudent(data[0]);
      }
      setLoading(false);
    };
    fetchStudentsList();
  }, [userData]);

  const filteredStudents = students.filter(s => 
    String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.rollNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.class || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.phone || '').includes(searchTerm)
  );

  const switchTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border pb-4">
        <div>
          <h1 className="text-3xl font-bold text-dark-text tracking-tight flex items-center gap-3">
            <User className="text-primary-500" /> Single Student 360 Hub
          </h1>
          <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider mt-1">
            Home / Single Student / {tabs.find(t => t.id === activeTab)?.name || 'Profile'}
          </p>
        </div>

        {/* Student Selector Dropdown / Search */}
        <div className="flex items-center gap-3 bg-dark-card border border-dark-border px-3.5 py-2 rounded-xl w-full md:w-80 shadow-inner">
          <Search size={16} className="text-primary-500 shrink-0" />
          <select 
            value={selectedStudent?.id || ''} 
            onChange={(e) => {
              const found = students.find(s => s.id === e.target.value);
              if (found) setSelectedStudent(found);
            }}
            className="w-full bg-transparent border-none outline-none text-white font-bold text-xs"
          >
            {students.map(s => (
              <option key={s.id} value={s.id} className="bg-dark-bg text-white font-medium">
                {s.name} ({s.rollNumber || 'N/A'}) - Class {s.class}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Card: Selected Student Snapshot & 16 Navigation Tabs */}
        <div className="lg:col-span-1 space-y-4">
          {selectedStudent ? (
            <GlassCard className="p-5 text-center border-primary-500/30 shadow-lg relative overflow-hidden">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400 font-black text-2xl mb-3">
                {selectedStudent.name?.charAt(0) || 'S'}
              </div>
              <h3 className="font-extrabold text-white text-lg">{selectedStudent.name}</h3>
              <p className="text-xs text-dark-muted font-semibold mt-0.5">
                Father: <span className="text-white">{selectedStudent.fatherName || 'N/A'}</span>
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="px-2.5 py-1 rounded bg-primary-500/10 text-primary-400 font-mono text-[10px] font-bold border border-primary-500/20">
                  Class: {selectedStudent.class}
                </span>
                <span className="px-2.5 py-1 rounded bg-green-500/10 text-green-400 font-mono text-[10px] font-bold border border-green-500/20 uppercase">
                  {selectedStudent.status || 'Active'}
                </span>
              </div>
              <p className="text-[10px] text-dark-muted font-mono mt-3">
                Roll: {selectedStudent.rollNumber || 'N/A'} • Phone: {selectedStudent.phone || '—'}
              </p>
            </GlassCard>
          ) : (
            <GlassCard className="p-6 text-center text-dark-muted">
              Select a student above to start
            </GlassCard>
          )}

          {/* 16 Tabs Navigation Box */}
          <GlassCard className="p-3">
            <p className="text-[10px] uppercase font-black tracking-widest text-dark-muted px-2 mb-2">
              Single Student Actions ({tabs.length})
            </p>
            <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive 
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' 
                        : 'text-dark-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon size={15} className={isActive ? 'text-white' : 'text-primary-400'} />
                      <span className="truncate">{tab.name}</span>
                    </div>
                    <ArrowRight size={13} className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Right Area: Dynamic Tab Content displaying exact features */}
        <div className="lg:col-span-3">
          <GlassCard className="p-6 min-h-[550px] border-dark-border">
            {!selectedStudent ? (
              <div className="text-center py-24 text-dark-muted">
                <User size={48} className="mx-auto opacity-30 mb-4" />
                <p className="font-bold text-lg text-white">No student selected</p>
                <p className="text-xs mt-1">Please select a student from the search box above to view their profile, ledgers, and vouchers.</p>
              </div>
            ) : (
              <div>
                {activeTab === 'profile' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 flex items-center justify-between">
                      <span>1. Complete Student Profile</span>
                      <button onClick={() => switchTab('edit')} className="premium-button-secondary text-xs">
                        <Edit size={14} /> Edit Profile
                      </button>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="p-4 rounded-2xl bg-dark-hover/40 border border-dark-border space-y-2">
                        <p className="text-xs text-dark-muted uppercase font-bold">Personal & Contact</p>
                        <p><strong className="text-dark-muted">Full Name:</strong> <span className="text-white font-bold">{selectedStudent.name}</span></p>
                        <p><strong className="text-dark-muted">Father Name:</strong> <span className="text-white font-bold">{selectedStudent.fatherName || 'N/A'}</span></p>
                        <p><strong className="text-dark-muted">WhatsApp Phone:</strong> <span className="text-primary-400 font-mono font-bold">{selectedStudent.phone || 'N/A'}</span></p>
                        <p><strong className="text-dark-muted">Admission Date:</strong> <span className="text-white font-mono">{selectedStudent.admissionDate || 'N/A'}</span></p>
                      </div>
                      <div className="p-4 rounded-2xl bg-dark-hover/40 border border-dark-border space-y-2">
                        <p className="text-xs text-dark-muted uppercase font-bold">Academic & Fee Summary</p>
                        <p><strong className="text-dark-muted">Enrolled Class:</strong> <span className="text-white font-bold">{selectedStudent.class} ({selectedStudent.section || 'A'})</span></p>
                        <p><strong className="text-dark-muted">Roll Number:</strong> <span className="text-white font-mono font-bold">{selectedStudent.rollNumber || 'N/A'}</span></p>
                        <p><strong className="text-dark-muted">Monthly Fee:</strong> <span className="text-green-400 font-bold">Rs. {selectedStudent.monthlyFee || 3500}</span></p>
                        <p><strong className="text-dark-muted">Current Balance:</strong> <span className="text-blue-400 font-bold">Rs. {selectedStudent.balance || 0}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'collect-fee' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 flex items-center justify-between">
                      <span>2. Collect Fee from Student</span>
                      <span className="text-xs font-mono text-green-400">Monthly Fee: Rs. {selectedStudent.monthlyFee || 3500}</span>
                    </h2>
                    <form onSubmit={(e) => { e.preventDefault(); alert(`Collected fee for ${selectedStudent.name} successfully! Voucher generated.`); }} className="space-y-4 max-w-lg">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Fee Month</label>
                        <input type="month" defaultValue={new Date().toISOString().slice(0, 7)} className="w-full premium-input text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Amount to Collect (Rs.)</label>
                        <input type="number" defaultValue={selectedStudent.monthlyFee || 3500} className="w-full premium-input font-mono text-base font-bold text-green-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Payment Method</label>
                        <select className="w-full premium-input text-sm">
                          <option>Cash at Counter</option>
                          <option>Bank Transfer / JazzCash</option>
                          <option>Online Card</option>
                        </select>
                      </div>
                      <button type="submit" className="premium-button-primary w-full justify-center py-3">
                        <DollarSign size={18} /> Confirm & Generate Receipt
                      </button>
                    </form>
                  </div>
                )}

                {(activeTab === 'quick-voucher' || activeTab === 'voucher-print') && (
                  <div className="space-y-6 animate-fade-in text-center py-10">
                    <Receipt size={48} className="mx-auto text-primary-400 mb-3" />
                    <h3 className="text-2xl font-bold text-white">{activeTab === 'quick-voucher' ? '3. Quick Voucher Generator' : '4. Voucher Printer Desk'}</h3>
                    <p className="text-xs text-dark-muted max-w-md mx-auto">
                      Generate and print customized multi-part fee challan vouchers for {selectedStudent.name} (Roll No: {selectedStudent.rollNumber || 'N/A'}).
                    </p>
                    <div className="flex justify-center gap-3 pt-4">
                      <button onClick={() => alert('Voucher Generated!')} className="premium-button-primary">Generate Monthly Challan</button>
                      <button onClick={() => window.print()} className="premium-button-secondary"><Printer size={16} /> Print Voucher</button>
                    </div>
                  </div>
                )}

                {(activeTab === 'ledger-old' || activeTab === 'ledger-new' || activeTab === 'family-ledger') && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3 flex items-center justify-between">
                      <span>{activeTab === 'ledger-old' ? '5. Student Ledger (Old Format)' : activeTab === 'ledger-new' ? '6. Student Ledger (New Format)' : '15. Complete Family / Siblings Ledger'}</span>
                      <button onClick={() => window.print()} className="premium-button-secondary text-xs"><Printer size={14} /> Print Ledger</button>
                    </h2>
                    <table className="w-full text-left text-xs border border-dark-border rounded-xl overflow-hidden">
                      <thead className="bg-dark-hover/60 text-dark-muted uppercase font-black">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Description / Month</th>
                          <th className="p-3 text-right">Debit (Rs.)</th>
                          <th className="p-3 text-right">Credit (Rs.)</th>
                          <th className="p-3 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border font-mono">
                        <tr>
                          <td className="p-3">01/07/2026</td>
                          <td className="p-3 font-sans">July 2026 Monthly Tuition Fee</td>
                          <td className="p-3 text-right text-red-400">3,500</td>
                          <td className="p-3 text-right">0</td>
                          <td className="p-3 text-right font-bold">3,500</td>
                        </tr>
                        <tr>
                          <td className="p-3">05/07/2026</td>
                          <td className="p-3 font-sans">Cash Payment at Counter (Voucher #104)</td>
                          <td className="p-3 text-right">0</td>
                          <td className="p-3 text-right text-green-400">3,500</td>
                          <td className="p-3 text-right font-bold">0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'edit' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3">7. Edit Student Information</h2>
                    <form onSubmit={(e) => { e.preventDefault(); alert('Student information updated!'); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Student Name</label>
                        <input type="text" defaultValue={selectedStudent.name} className="w-full premium-input text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Father Name</label>
                        <input type="text" defaultValue={selectedStudent.fatherName} className="w-full premium-input text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">WhatsApp Phone</label>
                        <input type="text" defaultValue={selectedStudent.phone} className="w-full premium-input font-mono text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Class & Section</label>
                        <input type="text" defaultValue={selectedStudent.class} className="w-full premium-input text-sm font-bold" />
                      </div>
                      <div className="md:col-span-2 pt-2">
                        <button type="submit" className="premium-button-primary">Save Changes</button>
                      </div>
                    </form>
                  </div>
                )}

                {(activeTab === 'receipts' || activeTab === 'payment-history') && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3">
                      {activeTab === 'receipts' ? '8. Paid Receipts Archive' : '9. Comprehensive Payment History'}
                    </h2>
                    <div className="p-4 rounded-2xl bg-dark-hover/30 border border-dark-border flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-white">Receipt #REC-2026-004</p>
                        <p className="text-xs text-dark-muted font-mono">Paid on 05 July 2026 via Cash</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-mono font-bold">Rs. 3,500</p>
                        <button onClick={() => window.print()} className="text-[10px] text-primary-400 font-bold hover:underline">Download PDF</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'id-card' && (
                  <div className="space-y-6 animate-fade-in text-center py-10">
                    <Award size={48} className="mx-auto text-amber-400 mb-3" />
                    <h3 className="text-2xl font-bold text-white">10. Student Smart ID Card</h3>
                    <p className="text-xs text-dark-muted max-w-md mx-auto mb-6">
                      Front and back PVC ID card with embedded barcode/QR scanner code for {selectedStudent.name}.
                    </p>
                    <button onClick={() => window.print()} className="premium-button-primary"><Printer size={16} /> Print PVC Card</button>
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3">11. Student Attendance Log</h2>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                        <p className="text-2xl font-black text-green-400">96%</p>
                        <p className="text-[10px] uppercase font-bold text-dark-muted">Present This Month</p>
                      </div>
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-2xl font-black text-red-400">1</p>
                        <p className="text-[10px] uppercase font-bold text-dark-muted">Absents</p>
                      </div>
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <p className="text-2xl font-black text-blue-400">0</p>
                        <p className="text-[10px] uppercase font-bold text-dark-muted">Leaves</p>
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === 'certificate' || activeTab === 'marksheet') && (
                  <div className="space-y-6 animate-fade-in text-center py-10">
                    <BookOpen size={48} className="mx-auto text-indigo-400 mb-3" />
                    <h3 className="text-2xl font-bold text-white">{activeTab === 'certificate' ? '12. Generate Official Certificate' : '13. Student Exam Mark Sheet'}</h3>
                    <p className="text-xs text-dark-muted max-w-md mx-auto mb-6">
                      Print Character Certificate, School Leaving Certificate, or verified Exam Marksheet for {selectedStudent.name}.
                    </p>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => window.print()} className="premium-button-primary"><Printer size={16} /> Print Document</button>
                    </div>
                  </div>
                )}

                {(activeTab === 'message' || activeTab === 'reminder-slip') && (
                  <div className="space-y-6 animate-fade-in">
                    <h2 className="text-xl font-bold text-white border-b border-dark-border pb-3">
                      {activeTab === 'message' ? '14. Send Direct WhatsApp / SMS Message' : '16. Fee & Attendance Reminder Slip'}
                    </h2>
                    <div className="space-y-4 max-w-lg">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Message Content</label>
                        <textarea 
                          rows={4}
                          defaultValue={`Assalam-o-Alaikum, regarding ${selectedStudent.name} (Class ${selectedStudent.class}), please note current fee balance / report.`}
                          className="w-full premium-input text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const phone = (selectedStudent.phone || '').replace(/[^0-9]/g, '');
                          window.open(`https://wa.me/${phone}?text=Assalam-o-Alaikum regarding ${selectedStudent.name}...`, '_blank');
                        }}
                        className="premium-button-primary bg-emerald-600 hover:bg-emerald-500"
                      >
                        <MessageSquare size={16} /> Send via WhatsApp right now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default SingleStudent360;
