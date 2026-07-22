import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  PlusCircle, 
  Printer, 
  Phone, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  FileText, 
  Send,
  Link2,
  GraduationCap,
  Percent,
  ChevronRight,
  Filter
} from 'lucide-react';
import { getRecords, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const FamilyTree = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [selectedFamilyForChallan, setSelectedFamilyForChallan] = useState(null);
  const [siblingDiscountPercent, setSiblingDiscountPercent] = useState(10);
  const [sendingWa, setSendingWa] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [userData]);

  const fetchStudents = async () => {
    if (!userData?.schoolId) return;
    setLoading(true);
    try {
      const list = await getRecords('students', userData.schoolId);
      setStudents(list);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group students by Family (CNIC -> Phone -> Father Name -> FamilyId)
  const families = useMemo(() => {
    const groupMap = new Map();

    students.forEach((st) => {
      // Key priority: explicit familyId -> fatherCnic -> parentPhone -> clean fatherName
      const cnicKey = st.fatherCnic ? st.fatherCnic.replace(/[^0-9]/g, '') : null;
      const phoneKey = st.parentPhone || st.fatherPhone || st.phone;
      const cleanPhone = phoneKey ? phoneKey.replace(/[^0-9]/g, '') : null;
      const nameKey = st.fatherName ? st.fatherName.trim().toLowerCase() : 'unknown_father';

      const familyKey = st.familyId || cnicKey || cleanPhone || `name_${nameKey}`;

      if (!groupMap.has(familyKey)) {
        groupMap.set(familyKey, {
          key: familyKey,
          familyId: st.familyId || null,
          fatherName: st.fatherName || 'Unknown Father',
          fatherCnic: st.fatherCnic || st.cnic || '-',
          motherName: st.motherName || '-',
          phone: st.parentPhone || st.fatherPhone || st.phone || '-',
          address: st.address || '-',
          children: []
        });
      }

      const grp = groupMap.get(familyKey);
      grp.children.push(st);
      // Update missing family headers if another sibling has richer info
      if (grp.fatherCnic === '-' && st.fatherCnic) grp.fatherCnic = st.fatherCnic;
      if (grp.motherName === '-' && st.motherName) grp.motherName = st.motherName;
      if (grp.phone === '-' && (st.parentPhone || st.fatherPhone)) grp.phone = st.parentPhone || st.fatherPhone;
    });

    // Convert map to array and sort by number of children (families with multiple children first)
    const list = Array.from(groupMap.values());
    list.sort((a, b) => b.children.length - a.children.length);
    return list;
  }, [students]);

  // Filter families based on search term or child class
  const filteredFamilies = useMemo(() => {
    return families.filter((fam) => {
      const matchSearch = searchTerm === '' || 
        fam.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fam.fatherCnic.includes(searchTerm) ||
        fam.phone.includes(searchTerm) ||
        fam.children.some(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.rollNumber || '').toString().includes(searchTerm));

      const matchClass = filterClass === 'All' || fam.children.some(c => c.class === filterClass);

      return matchSearch && matchClass;
    });
  }, [families, searchTerm, filterClass]);

  const totalFamilies = filteredFamilies.length;
  const totalStudentsInFamilies = filteredFamilies.reduce((sum, f) => sum + f.children.length, 0);

  // Extract all unique classes for filter
  const allClasses = useMemo(() => {
    const s = new Set();
    students.forEach(st => st.class && s.add(st.class));
    return ['All', ...Array.from(s)];
  }, [students]);

  // Handle send combined family challan via WhatsApp
  const handleSendCombinedChallan = async (family) => {
    if (!family.phone || family.phone === '-') {
      alert('❌ This family does not have a registered parent phone number.');
      return;
    }
    setSendingWa(true);
    try {
      const totalFee = family.children.reduce((acc, c) => acc + (Number(c.monthlyFee || c.tuitionFee) || 4500), 0);
      const discountAmount = family.children.length > 1 ? Math.round((totalFee * siblingDiscountPercent) / 100) : 0;
      const finalAmount = totalFee - discountAmount;

      let childrenDetails = family.children.map((c, idx) => 
        `${idx + 1}. *${c.name}* (Roll: ${c.rollNumber || 'N/A'} | Grade: ${c.class || 'N/A'})\n   Tuition Fee: Rs. ${(Number(c.monthlyFee || c.tuitionFee) || 4500).toLocaleString()}`
      ).join('\n\n');

      const messageText = `👨‍👩‍👧‍👦 *COMBINED FAMILY FEE LEDGER & CHALLAN*\n\nAssalam-o-Alaikum *${family.fatherName}* Sb!\nBelow is the combined fee statement for your children studying at *${userData?.schoolName || 'Our School'}*:\n\n${childrenDetails}\n\n━━━━━━━━━━━━━━━━━━━━\n💰 *Subtotal Fee:* Rs. ${totalFee.toLocaleString()}\n🎁 *Sibling Discount (${siblingDiscountPercent}%):* -Rs. ${discountAmount.toLocaleString()}\n💵 *NET PAYABLE AMOUNT:* *Rs. ${finalAmount.toLocaleString()}* /-\n━━━━━━━━━━━━━━━━━━━━\n📅 *Due Date:* 10th of this Month\n\nBaraye meherbani time par fee jama karwayein. Sukriya!\nSchool Administration`;

      let res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: userData?.schoolId || 'default_school',
          phone: family.phone,
          message: messageText
        })
      });
      let data = await res.json();

      if (!data.success && (userData?.schoolId && userData.schoolId !== 'default_school')) {
        res = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: 'default_school',
            phone: family.phone,
            message: messageText
          })
        });
        data = await res.json();
      }

      if (data.success && data.results?.[0]?.status === 'sent') {
        alert(`✅ Combined Family Challan sent AUTOMATICALLY to ${family.fatherName} (${family.phone}) via WhatsApp Cloud AI Bot Server!`);
        setSelectedFamilyForChallan(null);
      } else {
        alert(`❌ WhatsApp delivery failed: ${data.error || data.results?.[0]?.error || 'WhatsApp Bot might be offline or disconnected.'}`);
      }
    } catch (err) {
      alert(`❌ Error connecting to server: ${err.message}`);
    } finally {
      setSendingWa(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner with Stats & PDF Export Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-dark-card border border-dark-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-400">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-text">Family Tree Structure</h1>
              <p className="text-xs text-dark-muted mt-0.5">Group siblings by Parent & manage combined family fee ledgers</p>
            </div>
          </div>
        </div>

        {/* Stats & Action Bar */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-6 px-4 py-2 rounded-xl bg-dark-hover border border-dark-border">
            <div className="text-center">
              <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">Total Families</p>
              <p className="text-xl font-extrabold text-primary-400 mt-0.5">{totalFamilies}</p>
            </div>
            <div className="h-6 w-[1px] bg-dark-border" />
            <div className="text-center">
              <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">Total Students</p>
              <p className="text-xl font-extrabold text-cyan-400 mt-0.5">{totalStudentsInFamilies}</p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all cursor-pointer no-print"
          >
            <Printer size={16} />
            <span>Export PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-dark-card border border-dark-border p-4 rounded-2xl no-print">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" />
          <input
            type="text"
            placeholder="Search by Father Name, CNIC, Phone number, or Student Name/Roll..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-hover border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-dark-text placeholder-dark-muted outline-none focus:border-primary-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-dark-hover border border-dark-border px-3 py-2 rounded-xl text-xs text-dark-muted">
            <Filter size={14} className="text-primary-400" />
            <span className="font-semibold">Class:</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-transparent text-dark-text outline-none font-bold cursor-pointer"
            >
              {allClasses.map(c => <option key={c} value={c} className="bg-dark-card text-dark-text">{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Families List Grid */}
      {loading ? (
        <div className="p-12 text-center bg-dark-card border border-dark-border rounded-2xl">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-dark-muted">Loading families & sibling structure...</p>
        </div>
      ) : filteredFamilies.length === 0 ? (
        <div className="p-12 text-center bg-dark-card border border-dark-border rounded-2xl text-dark-muted">
          <AlertCircle size={36} className="mx-auto mb-3 opacity-40 text-amber-400" />
          <p className="font-bold text-base">No family structure found matching criteria</p>
          <p className="text-xs mt-1">Make sure student records have Father Name or Phone/CNIC entered.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFamilies.map((fam, idx) => (
            <div key={fam.key || idx} className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-sm transition-all hover:border-primary-500/30">
              
              {/* Blue / Primary Family Bar Header */}
              <div className="bg-gradient-to-r from-blue-600 via-primary-600 to-cyan-600 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs sm:text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <span className="opacity-80 font-normal">Father:</span>
                    <span className="text-white tracking-wide font-black underline decoration-white/40 underline-offset-4">
                      {fam.fatherName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="opacity-80 font-normal">Father CNIC:</span>
                    <span className="font-mono bg-black/20 px-2 py-0.5 rounded-md text-amber-300 font-bold tracking-wider">
                      {fam.fatherCnic}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="opacity-80 font-normal">Mother:</span>
                    <span>{fam.motherName}</span>
                  </div>

                  {fam.phone !== '-' && (
                    <div className="flex items-center gap-1.5 text-cyan-200">
                      <Phone size={13} />
                      <span className="font-mono">{fam.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  {/* Sibling Badge */}
                  <span className="px-3 py-1 rounded-lg bg-amber-400 text-black font-extrabold text-xs shadow-sm flex items-center gap-1">
                    <span>{fam.children.length}</span>
                    <span>{fam.children.length > 1 ? 'Children' : 'Child'}</span>
                  </span>

                  {/* Combined Family Challan Action */}
                  <button
                    onClick={() => setSelectedFamilyForChallan(fam)}
                    className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer no-print"
                    title="Generate combined sibling fee challan with discounts"
                  >
                    <CreditCard size={14} />
                    <span>Combined Fee Ledger</span>
                  </button>
                </div>
              </div>

              {/* Sibling Cards Container */}
              <div className="p-5 bg-dark-bg/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {fam.children.map((child) => (
                    <div 
                      key={child.id}
                      onClick={() => navigate(`/school-admin/students/${child.id}`)}
                      className="bg-dark-card border border-dark-border hover:border-cyan-500/50 p-4 rounded-xl shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-cyan-500/20 border border-primary-500/30 flex items-center justify-center font-bold text-primary-400 shrink-0 text-sm overflow-hidden">
                              {child.photoUrl ? (
                                <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" />
                              ) : (
                                (child.name || 'S')[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-dark-text group-hover:text-cyan-400 transition-colors truncate">
                                {child.name || 'Student'}
                              </h4>
                              <span className="text-[10px] text-dark-muted font-mono bg-dark-hover px-1.5 py-0.5 rounded border border-dark-border/60">
                                Roll: {child.rollNumber || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 mt-3 pt-2 border-t border-dark-border/50 text-xs">
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Class & Sec:</span>
                            <span className="font-bold text-dark-text">{child.class || 'N/A'} - {child.section || 'A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Monthly Fee:</span>
                            <span className="font-bold text-emerald-400">
                              Rs. {(Number(child.monthlyFee || child.tuitionFee) || 4500).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Status:</span>
                            <span className={`font-semibold ${child.status === 'Active' ? 'text-green-400' : 'text-amber-400'}`}>
                              {child.status || 'Active'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-dark-border/40 flex items-center justify-between text-[11px] text-primary-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity no-print">
                        <span>View Profile & Ledger</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Combined Family Fee Challan & Sibling Discount Modal */}
      {selectedFamilyForChallan && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in no-print">
          <div className="bg-dark-card border border-dark-border max-w-lg w-full rounded-2xl p-6 shadow-2xl relative text-dark-text">
            <div className="flex items-center justify-between pb-4 border-b border-dark-border mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Combined Family Fee Ledger</h3>
                  <p className="text-xs text-dark-muted">Parent: <span className="text-white font-bold">{selectedFamilyForChallan.fatherName}</span> ({selectedFamilyForChallan.phone})</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFamilyForChallan(null)}
                className="text-dark-muted hover:text-white text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Sibling Fee Breakdown Table */}
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1">
              <p className="text-xs font-bold text-dark-muted uppercase tracking-wider">Sibling Fee Breakdown ({selectedFamilyForChallan.children.length} Children):</p>
              {selectedFamilyForChallan.children.map((c, i) => {
                const fee = Number(c.monthlyFee || c.tuitionFee) || 4500;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-hover border border-dark-border text-xs">
                    <div>
                      <span className="font-bold text-white">{i + 1}. {c.name}</span>
                      <span className="text-dark-muted ml-2">({c.class} - Roll: {c.rollNumber || 'N/A'})</span>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono">Rs. {fee.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>

            {/* Sibling Discount Control */}
            <div className="bg-dark-hover/70 border border-dark-border p-4 rounded-xl space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-dark-text flex items-center gap-1.5">
                  <Percent size={14} className="text-amber-400" />
                  Sibling Group Discount (%):
                </span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={siblingDiscountPercent}
                  onChange={(e) => setSiblingDiscountPercent(Number(e.target.value) || 0)}
                  className="w-20 px-2.5 py-1 rounded-lg bg-dark-card border border-dark-border text-xs font-mono font-bold text-center text-amber-300 outline-none"
                />
              </div>

              {(() => {
                const total = selectedFamilyForChallan.children.reduce((acc, c) => acc + (Number(c.monthlyFee || c.tuitionFee) || 4500), 0);
                const discount = selectedFamilyForChallan.children.length > 1 ? Math.round((total * siblingDiscountPercent) / 100) : 0;
                const net = total - discount;
                return (
                  <div className="pt-2 border-t border-dark-border/60 space-y-1 text-xs">
                    <div className="flex justify-between text-dark-muted">
                      <span>Gross Tuition Subtotal:</span>
                      <span className="font-mono">Rs. {total.toLocaleString()}</span>
                    </div>
                    {selectedFamilyForChallan.children.length > 1 && (
                      <div className="flex justify-between text-amber-400 font-semibold">
                        <span>Sibling Concession ({siblingDiscountPercent}%):</span>
                        <span className="font-mono">-Rs. {discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-white pt-1">
                      <span>NET PAYABLE FAMILY CHALLAN:</span>
                      <span className="text-emerald-400 font-mono">Rs. {net.toLocaleString()} /-</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedFamilyForChallan(null)}
                className="flex-1 py-2.5 rounded-xl bg-dark-hover hover:bg-dark-border text-dark-muted font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendCombinedChallan(selectedFamilyForChallan)}
                disabled={sendingWa}
                className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {sendingWa ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching via WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Combined WhatsApp Challan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTree;
