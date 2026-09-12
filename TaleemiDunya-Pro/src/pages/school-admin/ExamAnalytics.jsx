import React, { useState, useEffect } from 'react';
import { PieChart, Search, LayoutDashboard, TrendingUp, Users, Award, BookOpen, AlertCircle } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const ExamAnalytics = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId;

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    if (!schoolId) return;
    const fetchInitialData = async () => {
      try {
        const [examsData, studentsData] = await Promise.all([
          getRecords('exams', schoolId),
          getRecords('students', schoolId)
        ]);
        
        // Filter out drafts
        const liveExams = examsData.filter(e => e.status !== 'DRAFT');
        setExams(liveExams);

        // Get unique classes
        const uniqueClasses = [...new Set(studentsData.map(s => s.class))].filter(Boolean).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
        setClasses(uniqueClasses);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchInitialData();
  }, [schoolId]);

  const generateAnalytics = async () => {
    if (!selectedExamId || !selectedClass) return;
    setLoading(true);
    setAnalyticsData(null);
    try {
      const studs = await getRecords('students', schoolId, [
        { field: 'class', operator: '==', value: selectedClass }
      ]);
      const results = await getRecords('results', schoolId, [
        { field: 'examId', operator: '==', value: selectedExamId }
      ]);

      if (results.length === 0) {
        setAnalyticsData({ empty: true });
        return;
      }

      let totalPercentage = 0;
      let passCount = 0;
      let failCount = 0;
      let studentStats = [];
      let subjectStats = {};

      for (const res of results) {
        const student = studs.find(s => s.id === res.studentId);
        if (!student || !res.marks) continue;

        let stuTotal = 0;
        let stuObt = 0;
        let hasFail = false;

        Object.entries(res.marks).forEach(([subj, data]) => {
          if (data.status === 'ABS') return;
          const max = Number(data.total) || 100;
          const obt = Number(data.obtained) || 0;
          
          stuTotal += max;
          stuObt += obt;

          if (!subjectStats[subj]) {
             subjectStats[subj] = { totalObt: 0, totalMax: 0, count: 0 };
          }
          subjectStats[subj].totalObt += obt;
          subjectStats[subj].totalMax += max;
          subjectStats[subj].count += 1;

          if ((obt/max) * 100 < 33) {
            hasFail = true;
          }
        });

        if (stuTotal > 0) {
          const perc = (stuObt / stuTotal) * 100;
          totalPercentage += perc;
          if (perc >= 40 && !hasFail) passCount++;
          else failCount++;

          studentStats.push({
            id: student.id,
            name: student.name,
            percentage: perc
          });
        }
      }

      // Sort Top Students
      studentStats.sort((a, b) => b.percentage - a.percentage);
      const topStudents = studentStats.slice(0, 3);

      // Subject Averages
      let subjectsArr = Object.keys(subjectStats).map(subj => {
        const stat = subjectStats[subj];
        return {
          name: subj,
          avg: stat.totalMax > 0 ? (stat.totalObt / stat.totalMax) * 100 : 0
        };
      });
      subjectsArr.sort((a, b) => b.avg - a.avg);

      const weakSubject = subjectsArr.length > 0 ? subjectsArr[subjectsArr.length - 1] : null;

      const totalCalculated = passCount + failCount;

      setAnalyticsData({
        empty: totalCalculated === 0,
        totalStudents: totalCalculated,
        passCount,
        failCount,
        avgPercentage: totalCalculated > 0 ? (totalPercentage / totalCalculated) : 0,
        topStudents,
        subjectsArr,
        weakSubject
      });

    } catch (err) {
      console.error("Error generating analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight">
            Exam Analytics & Insights
          </h1>
          <p className="text-dark-muted font-bold tracking-wide text-sm mt-1">
            Generate powerful AI-driven insights for class performance.
          </p>
        </div>
      </div>

      <GlassCard className="p-6 md:p-8 border-t-4 border-t-blue-500 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
           <TrendingUp size={200} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Select Exam Term</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setAnalyticsData(null);
              }}
              className="w-full bg-dark-card border border-dark-border/50 text-white rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
            >
              <option value="">-- Choose Exam --</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.examName} ({exam.academicYear})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setAnalyticsData(null);
              }}
              className="w-full bg-dark-card border border-dark-border/50 text-white rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-bold"
            >
              <option value="">-- Choose Class --</option>
              {classes.map(c => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={generateAnalytics}
              disabled={!selectedExamId || !selectedClass || loading}
              className="w-full bg-dark-card hover:bg-white/5 border border-dark-border/50 py-3.5 rounded-xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <span className="animate-pulse">Analyzing...</span> : <><PieChart size={18} /> Generate Insights</>}
            </button>
          </div>
        </div>
      </GlassCard>

      {analyticsData && analyticsData.empty && (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center">
            <AlertCircle size={48} className="text-amber-500 mb-4 opacity-80" />
            <h3 className="text-xl font-black text-white">No Results Found</h3>
            <p className="text-dark-muted font-medium mt-2">There is not enough result data to generate analytics for this class yet.</p>
        </GlassCard>
      )}

      {analyticsData && !analyticsData.empty && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-6 border-b-4 border-b-blue-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Users size={18} />
                </div>
                <h3 className="text-xs font-black text-dark-muted uppercase tracking-widest">Participated</h3>
              </div>
              <p className="text-4xl font-black text-white mt-4">{analyticsData.totalStudents}</p>
            </GlassCard>
            <GlassCard className="p-6 border-b-4 border-b-emerald-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={18} />
                </div>
                <h3 className="text-xs font-black text-dark-muted uppercase tracking-widest">Pass Rate</h3>
              </div>
              <p className="text-4xl font-black text-white mt-4">{Math.round((analyticsData.passCount / analyticsData.totalStudents) * 100)}%</p>
              <p className="text-xs font-bold text-dark-muted mt-2">{analyticsData.passCount} students passed</p>
            </GlassCard>
            <GlassCard className="p-6 border-b-4 border-b-amber-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <PieChart size={18} />
                </div>
                <h3 className="text-xs font-black text-dark-muted uppercase tracking-widest">Class Average</h3>
              </div>
              <p className="text-4xl font-black text-white mt-4">{analyticsData.avgPercentage.toFixed(1)}%</p>
            </GlassCard>
            <GlassCard className="p-6 border-b-4 border-b-rose-500">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <AlertCircle size={18} />
                </div>
                <h3 className="text-xs font-black text-dark-muted uppercase tracking-widest">Failed</h3>
              </div>
              <p className="text-4xl font-black text-white mt-4">{analyticsData.failCount}</p>
              <p className="text-xs font-bold text-dark-muted mt-2">Requires attention</p>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Award className="text-amber-400" size={24} />
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Top Performers</h3>
              </div>
              <div className="space-y-4">
                {analyticsData.topStudents.map((stud, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-dark-card/50 rounded-xl border border-dark-border/40">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                        idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                        'bg-orange-700/20 text-orange-400'
                      }`}>
                        #{idx + 1}
                      </div>
                      <h4 className="font-bold text-white">{stud.name}</h4>
                    </div>
                    <span className="font-black text-blue-400">{stud.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="text-blue-400" size={24} />
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Subject Analysis</h3>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {analyticsData.subjectsArr.map((subj, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-white">
                      <span>{subj.name}</span>
                      <span className={subj.avg < 40 ? 'text-rose-400' : 'text-emerald-400'}>{subj.avg.toFixed(1)}% Avg</span>
                    </div>
                    <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${subj.avg < 40 ? 'bg-rose-500' : subj.avg > 80 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${subj.avg}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              {analyticsData.weakSubject && analyticsData.weakSubject.avg < 50 && (
                <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-rose-400 mt-0.5 shrink-0" size={16} />
                  <div>
                    <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest">Action Required</h4>
                    <p className="text-[10px] font-bold text-rose-300/80 mt-1">
                      Class average in <b>{analyticsData.weakSubject.name}</b> is critical ({analyticsData.weakSubject.avg.toFixed(1)}%). Consider remedial classes.
                    </p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamAnalytics;
