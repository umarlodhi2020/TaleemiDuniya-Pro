import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Plus, Search, FileText, Calendar, ChevronRight, 
  Clock, Globe, PlusCircle, PenTool, LayoutDashboard, Flag, AlertCircle
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const Exams = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const schoolId = userData?.schoolId;
  
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'list';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/school-admin/exams?tab=${tabId}`, { replace: true });
  };

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Exam Form State
  const [newExam, setNewExam] = useState({
    examName: '',
    examType: 'Mid Term',
    academicYear: '2026-2027',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    classes: '10th Grade',
    status: 'DRAFT',
    instructions: ''
  });
  
  const [creatingExam, setCreatingExam] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Exams
  const fetchExams = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getRecords('exams', schoolId);
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setExams(data);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [schoolId]);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!newExam.examName || !newExam.startDate || !newExam.endDate) {
      Swal.fire('Error', 'Please fill all required fields.', 'error');
      return;
    }
    setCreatingExam(true);
    try {
      await addRecord('exams', { ...newExam, createdAt: new Date().toISOString() }, schoolId);
      Swal.fire({
        title: 'Success!',
        text: 'Exam scheduled successfully.',
        icon: 'success',
        background: '#1a1f37',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      });
      fetchExams();
      setNewExam({
        examName: '',
        examType: 'Mid Term',
        academicYear: '2026-2027',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        classes: '10th Grade',
        status: 'DRAFT',
        instructions: ''
      });
      handleTabChange('list');
    } catch (error) {
      Swal.fire('Error', 'Failed to create exam.', 'error');
    } finally {
      setCreatingExam(false);
    }
  };

  const handleToggleStatus = async (exam) => {
    const newStatus = exam.status === 'LIVE' ? 'DRAFT' : 'LIVE';
    
    const result = await Swal.fire({
      title: 'Change Exam Status?',
      text: `Are you sure you want to make this exam ${newStatus}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, change it!',
      background: '#1a1f37',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await updateRecord('exams', exam.id, { status: newStatus });
        fetchExams();
        Swal.fire({
          title: 'Updated!',
          text: `Exam is now ${newStatus}.`,
          icon: 'success',
          background: '#1a1f37',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire('Error', 'Failed to update status', 'error');
      }
    }
  };

  const filteredExams = exams.filter(e => 
    e.examName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.examType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight">
            Advanced Exam Management
          </h1>
          <p className="text-dark-muted font-bold tracking-wide text-sm mt-1">
            Create, schedule, and manage institutional examinations.
          </p>
        </div>
        
        <div className="flex bg-dark-card border border-dark-border/50 rounded-xl p-1 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-50 blur-xl"></div>
          <button 
            onClick={() => handleTabChange('list')}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${
              activeTab === 'list' 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
              : 'text-dark-muted hover:text-white hover:bg-white/5'
            }`}
          >
            Master File
          </button>
          <button 
            onClick={() => handleTabChange('create')}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${
              activeTab === 'create' 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
              : 'text-dark-muted hover:text-white hover:bg-white/5'
            }`}
          >
            Schedule New Exam
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-8 border-t-4 border-t-blue-500 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Calendar size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide">Schedule New Exam Term</h2>
                <p className="text-dark-muted text-sm font-bold mt-1">Configure dates, target classes, and basic parameters.</p>
              </div>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Exam Term Title *</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <PenTool size={16} className="text-dark-muted group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. First Term Examination 2026"
                      value={newExam.examName}
                      onChange={(e) => setNewExam({...newExam, examName: e.target.value})}
                      className="w-full bg-dark-card/50 border border-dark-border/50 text-white rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold tracking-wide"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Exam Type</label>
                  <select 
                    value={newExam.examType}
                    onChange={(e) => setNewExam({...newExam, examType: e.target.value})}
                    className="w-full bg-dark-card/50 border border-dark-border/50 text-white rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold"
                  >
                    <option value="Mid Term">Mid Term</option>
                    <option value="Final Term">Final Term</option>
                    <option value="Monthly Test">Monthly Test</option>
                    <option value="Mock Exam">Mock Exam</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Academic Year</label>
                  <select 
                    value={newExam.academicYear}
                    onChange={(e) => setNewExam({...newExam, academicYear: e.target.value})}
                    className="w-full bg-dark-card/50 border border-dark-border/50 text-white rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Start Date *</label>
                  <input 
                    required
                    type="date" 
                    value={newExam.startDate}
                    onChange={(e) => setNewExam({...newExam, startDate: e.target.value})}
                    className="w-full bg-dark-card/50 border border-dark-border/50 text-white rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">End Date *</label>
                  <input 
                    required
                    type="date" 
                    value={newExam.endDate}
                    onChange={(e) => setNewExam({...newExam, endDate: e.target.value})}
                    className="w-full bg-dark-card/50 border border-dark-border/50 text-white rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Target Classes</label>
                  <select 
                    value={newExam.classes}
                    onChange={(e) => setNewExam({...newExam, classes: e.target.value})}
                    className="w-full bg-dark-card/50 border border-dark-border/50 text-white rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold"
                  >
                    <option value="All Classes">All Classes (School Wide)</option>
                    <option value="Primary Wing">Primary Wing (1-5)</option>
                    <option value="Middle Wing">Middle Wing (6-8)</option>
                    <option value="High School">High School (9-10)</option>
                    <option value="10th Grade">10th Grade Only</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Initial Status</label>
                  <div className="flex bg-dark-card/50 border border-dark-border/50 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setNewExam({...newExam, status: 'DRAFT'})}
                      className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${newExam.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-dark-muted hover:text-white'}`}
                    >
                      Draft Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewExam({...newExam, status: 'LIVE'})}
                      className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${newExam.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-dark-muted hover:text-white'}`}
                    >
                      Make Live
                    </button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Special Instructions (Optional)</label>
                  <textarea 
                    placeholder="Enter any special instructions for invigilators or students..."
                    value={newExam.instructions}
                    onChange={(e) => setNewExam({...newExam, instructions: e.target.value})}
                    rows="3"
                    className="w-full bg-dark-card/50 border border-dark-border/50 text-white rounded-xl py-4 px-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="pt-6 border-t border-dark-border/50 flex justify-end">
                <button 
                  type="submit" 
                  disabled={creatingExam}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-black text-sm tracking-widest uppercase shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                >
                  {creatingExam ? (
                    <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> <span>Scheduling...</span></>
                  ) : (
                    <><PlusCircle size={20} /> <span>Create Examination</span></>
                  )}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-dark-muted group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-dark-card border border-dark-border text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium placeholder:text-dark-muted"
              />
            </div>
            
            <button className="h-12 px-4 bg-dark-card border border-dark-border rounded-xl text-dark-muted hover:text-white transition-colors flex items-center gap-2">
              <FileText size={18} />
              <span className="font-bold text-xs uppercase tracking-widest hidden sm:inline">Export</span>
            </button>
          </div>

          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center space-y-4">
               <div className="w-16 h-16 rounded-full bg-dark-card flex items-center justify-center border border-dark-border/50 shadow-xl relative">
                  <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                  <LayoutDashboard className="text-blue-400 opacity-50" size={24} />
               </div>
               <p className="text-dark-muted text-xs font-bold uppercase tracking-widest">Loading Master File...</p>
             </div>
          ) : filteredExams.length === 0 ? (
            <GlassCard className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-dark-card rounded-full flex items-center justify-center border border-dark-border/50 mb-6 shadow-xl relative">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
                <ClipboardCheck size={40} className="text-dark-muted relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">No Exams Found</h3>
              <p className="text-dark-muted font-medium mb-8 max-w-md">There are no exams matching your search or no exams have been scheduled yet.</p>
              <button 
                onClick={() => handleTabChange('create')}
                className="bg-dark-card hover:bg-white/5 border border-dark-border px-8 py-3 rounded-xl font-black text-xs tracking-widest text-white uppercase transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Schedule First Exam
              </button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredExams.map((exam) => (
                <GlassCard key={exam.id} className="p-0 overflow-hidden border border-dark-border/40 hover:border-blue-500/30 transition-all duration-300 group">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                            exam.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                            exam.status === 'COMPLETED' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${exam.status === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`}></span>
                            {exam.status || 'DRAFT'}
                          </span>
                          <span className="px-2.5 py-1 rounded bg-dark-card border border-dark-border text-[10px] font-black text-dark-muted uppercase tracking-widest">
                            {exam.academicYear}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors">
                          {exam.examName}
                        </h3>
                        <p className="text-dark-muted text-xs font-bold mt-1 tracking-wide">{exam.examType}</p>
                      </div>
                      
                      <div className="w-12 h-12 rounded-xl bg-dark-card border border-dark-border/50 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-dark-muted uppercase">Class</span>
                        <span className="text-sm font-black text-blue-400">{exam.classes === 'All Classes' ? 'ALL' : exam.classes?.split(' ')[0] || '-'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-dark-card/50 rounded-xl p-3 border border-dark-border/30 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-dark-muted uppercase tracking-widest">Starts</p>
                          <p className="text-xs font-bold text-white tracking-wide">{new Date(exam.startDate).toLocaleDateString('en-GB')}</p>
                        </div>
                      </div>
                      <div className="bg-dark-card/50 rounded-xl p-3 border border-dark-border/30 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                          <Flag size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-dark-muted uppercase tracking-widest">Ends</p>
                          <p className="text-xs font-bold text-white tracking-wide">{new Date(exam.endDate).toLocaleDateString('en-GB')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-dark-card/80 p-4 border-t border-dark-border/50 flex items-center justify-between">
                    <button 
                      onClick={() => handleToggleStatus(exam)}
                      className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                        exam.status === 'LIVE' ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      <Globe size={14} /> 
                      {exam.status === 'LIVE' ? 'Revert to Draft' : 'Make Live'}
                    </button>
                    
                    <button 
                      onClick={() => navigate(`/school-admin/exams/mark/${exam.id}`)}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      Enter Marks <ChevronRight size={14} />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Exams;
