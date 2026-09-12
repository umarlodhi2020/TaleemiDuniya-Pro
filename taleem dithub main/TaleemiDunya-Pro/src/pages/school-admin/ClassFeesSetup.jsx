import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Settings, Save, Loader2, DollarSign, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Swal from 'sweetalert2';

const ClassFeesSetup = () => {
  const { userData } = useAuth();
  const { schoolClasses } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classFees, setClassFees] = useState({});
  const [editingClassId, setEditingClassId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchClassFees();
  }, [schoolId, schoolClasses]);

  const fetchClassFees = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'class_fees'), where('schoolId', '==', schoolId));
      const snap = await getDocs(q);
      const fees = {};
      snap.forEach(d => {
        const data = d.data();
        fees[data.className] = data.baseFee;
      });
      setClassFees(fees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFee = async (cls) => {
    const feeNum = Number(editValue);
    if (isNaN(feeNum) || feeNum < 0) {
      return Swal.fire('Error', 'Please enter a valid amount', 'error');
    }
    
    setSaving(true);
    try {
      // Use the class name as the document ID for easy lookup, or query by className. Let's use custom ID format to prevent duplicates
      const docId = schoolId + "_" + cls.name.replace(/\s+/g, '_');
      await setDoc(doc(db, 'class_fees', docId), {
        schoolId,
        className: cls.name,
        baseFee: feeNum,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setClassFees(prev => ({ ...prev, [cls.name]: feeNum }));
      setEditingClassId(null);
      setEditValue('');
      Swal.fire('Saved', 'Fee setup saved for ' + cls.name, 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to save fee', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 tracking-tight">Class Fee Setup</h1>
          <p className="text-dark-muted mt-1 font-medium">Define standard monthly fees for each class</p>
        </div>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="p-4 bg-emerald-500/10 border-b border-dark-border flex items-center gap-3">
          <Settings className="text-emerald-400" />
          <p className="text-sm text-emerald-200">Set the default tuition fee for each class. This fee will be automatically suggested when registering a new student for that class.</p>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-dark-surface/50 border-b border-dark-border">
                <tr>
                  <th className="px-6 py-4 font-bold text-dark-muted text-sm uppercase tracking-wider">Class Name</th>
                  <th className="px-6 py-4 font-bold text-dark-muted text-sm uppercase tracking-wider">Standard Fee (PKR)</th>
                  <th className="px-6 py-4 font-bold text-dark-muted text-sm uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {schoolClasses.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-dark-muted">
                      No classes found. Please create classes in Student Management first.
                    </td>
                  </tr>
                ) : (
                  schoolClasses.map((cls, idx) => (
                    <tr key={cls.id || idx} className="hover:bg-dark-surface/30 transition-colors">
                      <td className="px-6 py-4 text-white font-bold text-lg flex items-center gap-2">
                        {cls.name}
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {editingClassId === cls.id ? (
                          <div className="relative max-w-[200px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted">Rs</span>
                            <input
                              type="number"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-dark-surface border border-emerald-500/50 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              placeholder="0"
                            />
                          </div>
                        ) : (
                          <span className="text-emerald-400 font-black text-xl">
                            {classFees[cls.name] ? 'Rs. ' + classFees[cls.name].toLocaleString() : 'Not Set'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingClassId === cls.id ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleSaveFee(cls)} disabled={saving} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            </button>
                            <button onClick={() => setEditingClassId(null)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingClassId(cls.id); setEditValue(classFees[cls.name] || ''); }} className="px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center gap-2 ml-auto">
                            <Edit2 size={16} /> Edit Fee
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default ClassFeesSetup;
