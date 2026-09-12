import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Briefcase, 
  Calendar, CreditCard, ShieldCheck, Hash, BookOpen,
  Clock, CheckCircle, GraduationCap
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getSingleRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const StaffProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal'); // personal, academic, timetable

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const data = await getSingleRecord('staff', id);
        if (data && data.schoolId === userData?.schoolId) {
          setStaff(data);
        } else {
          alert('Staff member not found!');
          navigate('/school-admin/staff');
        }
      } catch (error) {
        console.error('Error fetching staff profile:', error);
      } finally {
        setLoading(false);
      }
    };
    if (userData?.schoolId && id) {
      fetchStaff();
    }
  }, [id, userData, navigate]);

  if (loading) {
    return <div className="py-20 text-center text-dark-muted font-bold">Loading staff profile...</div>;
  }

  if (!staff) return null;

  const isTeacher = staff.department === 'Academic' || (staff.role && staff.role.toLowerCase().includes('teacher'));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Profile Card */}
      <div className="relative rounded-3xl overflow-hidden bg-dark-card border border-dark-border shadow-xl">
        {/* Background Banner */}
        <div className="h-32 bg-gradient-to-r from-purple-900/40 via-primary-900/40 to-blue-900/40 w-full absolute top-0 left-0" />
        
        <div className="relative pt-12 px-6 pb-6 sm:px-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full border-4 border-dark-card bg-dark-hover flex items-center justify-center overflow-hidden shrink-0 shadow-lg relative z-10">
            {staff.photoUrl ? (
              <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-dark-muted" />
            )}
          </div>
          
          <div className="flex-1 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
              <h1 className="text-3xl font-black text-white">{staff.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit mx-auto sm:mx-0 ${staff.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {staff.status || 'Active'}
              </span>
            </div>
            <p className="text-primary-400 font-bold text-lg mb-1">{staff.role} <span className="text-dark-muted font-normal text-sm">({staff.department})</span></p>
            <p className="text-dark-muted text-sm font-mono flex items-center justify-center sm:justify-start gap-2">
              <Hash size={14} /> ID: {staff.staffId || 'N/A'}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
            <button 
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-xl bg-dark-hover hover:bg-dark-border text-white text-sm font-bold flex items-center justify-center gap-2 transition-all border border-dark-border"
            >
              <ArrowLeft size={16} /> Back to Directory
            </button>
            <button 
              onClick={() => navigate(`/school-admin/staff/edit/${staff.id}`)}
              className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
            >
              <User size={16} /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-dark-card border border-dark-border rounded-xl">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'personal' ? 'bg-primary-500 text-white shadow-md' : 'text-dark-muted hover:bg-dark-hover hover:text-white'}`}
        >
          <User size={16} /> Details
        </button>
        {isTeacher && (
          <button
            onClick={() => setActiveTab('academic')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'academic' ? 'bg-primary-500 text-white shadow-md' : 'text-dark-muted hover:bg-dark-hover hover:text-white'}`}
          >
            <GraduationCap size={16} /> Academic Profile
          </button>
        )}
        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'timetable' ? 'bg-primary-500 text-white shadow-md' : 'text-dark-muted hover:bg-dark-hover hover:text-white'}`}
        >
          <Clock size={16} /> Timetable
        </button>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {activeTab === 'personal' && (
          <>
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><User size={18} className="text-primary-500" /> Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <p className="text-xs font-black text-dark-muted uppercase tracking-widest mb-1">Full Name</p>
                    <p className="font-bold text-white text-base">{staff.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-dark-muted uppercase tracking-widest mb-1">CNIC / ID</p>
                    <p className="font-bold text-white text-base font-mono">{staff.cnic || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-dark-muted uppercase tracking-widest mb-1">Phone Number</p>
                    <p className="font-bold text-white text-base font-mono">{staff.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-dark-muted uppercase tracking-widest mb-1">Email Address</p>
                    <p className="font-bold text-white text-base">{staff.email || 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-black text-dark-muted uppercase tracking-widest mb-1">Home Address</p>
                    <p className="font-bold text-white text-base bg-dark-hover p-3 rounded-xl border border-dark-border">{staff.address || 'N/A'}</p>
                  </div>
                </div>
              </GlassCard>
            </div>
            
            <div className="space-y-6">
              <GlassCard className="p-6 border-t-4 border-cyan-500">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Briefcase size={18} className="text-cyan-500" /> Employment</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Briefcase size={16}/></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Designation</p>
                      <p className="font-bold text-sm text-white">{staff.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><ShieldCheck size={16}/></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Department</p>
                      <p className="font-bold text-sm text-white">{staff.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Calendar size={16}/></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Joining Date</p>
                      <p className="font-bold text-sm text-white">{staff.joinDate ? new Date(staff.joinDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><CreditCard size={16}/></div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-dark-muted">Basic Salary</p>
                      <p className="font-bold text-sm text-white font-mono">Rs. {Number(staff.salary || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </>
        )}

        {activeTab === 'academic' && isTeacher && (
          <div className="col-span-1 lg:col-span-3">
            <GlassCard className="p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <GraduationCap size={22} className="text-primary-500" /> Academic & Class Assignment
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Assigned Class */}
                <div className="bg-dark-hover border border-dark-border p-5 rounded-2xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest mb-2">Assigned Class</p>
                  {staff.assignedClass ? (
                    <p className="text-2xl font-black text-white">
                      Class {staff.assignedClass}
                      {staff.assignedSection && <span className="text-primary-400"> — Section {staff.assignedSection}</span>}
                    </p>
                  ) : (
                    <p className="text-dark-muted text-sm">No class assigned yet</p>
                  )}
                </div>

                {/* Class Teacher Status */}
                <div className="bg-dark-hover border border-dark-border p-5 rounded-2xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest mb-2">Class Teacher</p>
                  {staff.isClassTeacher ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={20} className="text-green-400" />
                      <p className="text-green-400 font-bold">Yes — Class Teacher</p>
                    </div>
                  ) : (
                    <p className="text-dark-muted text-sm">Not a class teacher</p>
                  )}
                </div>

                {/* Department */}
                <div className="bg-dark-hover border border-dark-border p-5 rounded-2xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted tracking-widest mb-2">Department</p>
                  <p className="text-white font-bold text-lg">{staff.department || 'Academic'}</p>
                </div>
              </div>

              {/* Subjects */}
              <div className="mt-6 bg-dark-hover border border-dark-border p-6 rounded-2xl">
                <h4 className="font-bold text-primary-400 mb-4 flex items-center gap-2">
                  <BookOpen size={18} /> Subjects Taught
                </h4>
                {staff.subjects && staff.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {staff.subjects.map((sub, i) => (
                      <span key={i} className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-xl text-sm font-bold">
                        <CheckCircle size={14} className="text-green-400" /> {sub}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BookOpen size={32} className="mx-auto opacity-20 mb-2" />
                    <p className="text-dark-muted text-sm">Koi subject assign nahi hua.</p>
                    <button
                      onClick={() => navigate(`/school-admin/staff/edit/${staff.id}`)}
                      className="mt-3 px-5 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-xs font-bold border border-primary-500/20 transition-all"
                    >
                      + Edit Profile se Subjects Add karo
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Edit Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => navigate(`/school-admin/staff/edit/${staff.id}`)}
                  className="premium-button-primary text-sm"
                >
                  ✏️ Update Class & Subjects
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="col-span-1 lg:col-span-3 space-y-6">
            {/* Assignment Summary */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-primary-500" /> Teaching Assignment Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 border border-dark-border rounded-xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted mb-1">Assigned Class</p>
                  <p className="font-bold text-white">
                    {staff.assignedClass ? `Class ${staff.assignedClass}${staff.assignedSection ? ' - ' + staff.assignedSection : ''}` : '—'}
                  </p>
                </div>
                <div className="p-4 bg-white/5 border border-dark-border rounded-xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted mb-1">Total Subjects</p>
                  <p className="font-bold text-white">{staff.subjects?.length || 0} Subjects</p>
                </div>
                <div className="p-4 bg-white/5 border border-dark-border rounded-xl">
                  <p className="text-[10px] uppercase font-black text-dark-muted mb-1">Role</p>
                  <p className="font-bold text-white">{staff.isClassTeacher ? '⭐ Class Teacher' : staff.role || '—'}</p>
                </div>
              </div>
            </GlassCard>

            {/* Subjects List in Timetable Style */}
            <GlassCard className="p-6">
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-primary-500" /> Weekly Subject Load
              </h3>
              {staff.subjects && staff.subjects.length > 0 ? (
                <div className="space-y-3">
                  {staff.subjects.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-dark-border rounded-xl hover:border-primary-500/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 font-black text-sm">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{sub}</p>
                          <p className="text-[10px] text-dark-muted">
                            Class {staff.assignedClass || '—'} {staff.assignedSection ? `— Section ${staff.assignedSection}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary-400 bg-primary-500/10 px-3 py-1 rounded-lg border border-primary-500/20">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Clock size={40} className="mx-auto opacity-20 mb-3" />
                  <p className="text-dark-muted">Abhi koi timetable assign nahi hua.</p>
                  <button
                    onClick={() => navigate(`/school-admin/staff/edit/${staff.id}`)}
                    className="mt-4 premium-button-secondary text-sm mx-auto"
                  >
                    Edit Profile → Class & Subjects Assign karo
                  </button>
                </div>
              )}
            </GlassCard>
          </div>
        )}

      </div>
    </div>
  );
};

export default StaffProfile;
