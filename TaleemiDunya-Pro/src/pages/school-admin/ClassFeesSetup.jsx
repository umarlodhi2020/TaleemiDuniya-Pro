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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Class Fee Setup</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Define standard monthly fees for each class</p>
        </div>
      </div>

      <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center gap-3 shadow-sm">
        <Settings className="text-emerald-700 w-5 h-5 flex-shrink-0" />
        <p className="text-sm text-emerald-900 font-semibold">
          Set the default tuition fee for each class. This fee will be automatically suggested when registering a new student for that class.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Class Name</th>
                  <th className="px-6 py-4 font-bold text-slate-700 text-xs uppercase tracking-wider">Standard Fee (PKR)</th>
                  <th className="px-6 py-4 font-bold text-slate-700 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schoolClasses.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-slate-500 font-medium">
                      No classes found. Please create classes in Student Management first.
                    </td>
                  </tr>
                ) : (
                  schoolClasses.map((cls, idx) => (
                    <tr key={cls.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-bold text-base">
                        {cls.name}
                      </td>
                      <td className="px-6 py-4">
                        {editingClassId === cls.id ? (
                          <div className="relative max-w-[200px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs</span>
                            <input
                              type="number"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-white border-2 border-emerald-500 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                              placeholder="0"
                            />
                          </div>
                        ) : (
                          <div>
                            {classFees[cls.name] ? (
                              <span className="text-emerald-700 font-extrabold text-lg font-mono">
                                Rs. {classFees[cls.name].toLocaleString()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Not Set
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingClassId === cls.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSaveFee(cls)}
                              disabled={saving}
                              className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm transition-all"
                              title="Save Fee"
                            >
                              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            </button>
                            <button
                              onClick={() => setEditingClassId(null)}
                              className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingClassId(cls.id); setEditValue(classFees[cls.name] || ''); }}
                            className="px-4 py-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 ml-auto shadow-sm"
                          >
                            <Edit2 size={15} /> Edit Fee
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
      </div>
    </div>
  );
};

export default ClassFeesSetup;
