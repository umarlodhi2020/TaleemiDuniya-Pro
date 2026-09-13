import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Clock, 
  Award, 
  CheckCircle2, 
  Play, 
  ArrowLeft,
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const StudentOnlineQuiz = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const studentGrade = userData?.classGrade || '10'; // Fallback to 10 for demo
  
  const [quizzes, setQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'live_test'
  const [selectedQuizForTest, setSelectedQuizForTest] = useState(null);
  
  // Live Test State
  const [userAnswers, setUserAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState({ correct: 0, total: 0, percentage: 0 });
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await getRecords('quizzes', schoolId);
        if (data && data.length > 0) {
          // Only show quizzes that match the student's grade (for realism) or show all if demo
          const myQuizzes = data.filter(q => q.classGrade === studentGrade || true);
          setQuizzes(myQuizzes);
        } else {
          setQuizzes([]);
        }
      } catch (err) {
        console.warn(err);
      }
    };
    fetchQuizzes();
  }, [schoolId, studentGrade]);

  // Timer logic
  useEffect(() => {
    let timer;
    if (activeTab === 'live_test' && selectedQuizForTest && !testSubmitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeTab, selectedQuizForTest, testSubmitted, timeLeft]);

  const handleStartLiveTest = (quiz) => {
    setSelectedQuizForTest(quiz);
    setUserAnswers({});
    setTestSubmitted(false);
    setTimeLeft(quiz.durationMinutes * 60);
    setActiveTab('live_test');
  };

  const handleSelectAnswer = (qIndex, optIndex) => {
    if (testSubmitted) return;
    setUserAnswers({ ...userAnswers, [qIndex]: optIndex });
  };

  const handleSubmitTest = () => {
    if (!selectedQuizForTest) return;
    let correctCount = 0;
    selectedQuizForTest.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct) {
        correctCount++;
      }
    });
    const total = selectedQuizForTest.questions.length;
    const perc = Math.round((correctCount / total) * 100);
    setScoreResult({ correct: correctCount, total, percentage: perc });
    setTestSubmitted(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background Design */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm text-xs font-black uppercase tracking-widest mb-3">
            <Sparkles size={14} className="text-cyan-200" /> CBT Engine Active
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
            My Online Quizzes
          </h1>
          <p className="text-blue-100 text-sm font-medium mt-2 max-w-lg">
            Take your assigned subject assessments here. Time is tracked automatically and grading is instantaneous!
          </p>
        </div>
        
        <div className="relative z-10 self-stretch md:self-auto">
          {activeTab !== 'list' && (
            <button 
              onClick={() => setActiveTab('list')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm w-full md:w-auto"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: QUIZ CATALOG */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <AlertCircle className="text-cyan-400" size={20} />
            <h2 className="text-lg font-black text-white">Pending Assessments</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.length === 0 ? (
              <div className="col-span-full p-8 text-center border border-dashed border-dark-border rounded-2xl">
                <p className="text-dark-muted font-bold">No quizzes assigned for your grade right now.</p>
              </div>
            ) : (
              quizzes.map(quiz => (
                <GlassCard key={quiz.id} className="p-6 border-l-4 border-l-cyan-500 hover:border-l-blue-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all group flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 font-black text-[10px] uppercase border border-cyan-500/20">
                        {quiz.subject}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 font-mono bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20">
                        <Clock size={13} /> {quiz.durationMinutes} Mins
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors leading-tight mb-2">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-dark-muted font-bold mb-6">
                      Contains {quiz.totalQuestions} Questions
                    </p>
                  </div>

                  <button
                    onClick={() => handleStartLiveTest(quiz)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/50 transition-all active:scale-[0.98]"
                  >
                    <Play size={15} fill="white" />
                    Start Attempt
                  </button>
                </GlassCard>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: LIVE TEST SIMULATOR & RESULT CARD */}
      {activeTab === 'live_test' && selectedQuizForTest && (
        <GlassCard className="p-6 md:p-10 max-w-4xl mx-auto border-dark-border space-y-8 relative overflow-hidden">
          
          {/* Top Test Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dark-border pb-6 gap-6">
            <div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 uppercase tracking-widest inline-block mb-3">
                Subject: {selectedQuizForTest.subject}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white">{selectedQuizForTest.title}</h2>
            </div>

            {!testSubmitted ? (
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-dark-bg border-2 border-yellow-500/50 text-yellow-400 font-mono font-black text-xl animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.15)] self-start md:self-auto shrink-0">
                <Clock size={24} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 font-black text-sm self-start md:self-auto">
                <CheckCircle2 size={20} />
                <span>Test Completed</span>
              </div>
            )}
          </div>

          {!testSubmitted ? (
            <div className="space-y-8">
              {selectedQuizForTest.questions.map((q, qIndex) => (
                <div key={q.id || qIndex} className="p-6 md:p-8 rounded-3xl bg-dark-bg/60 border border-dark-border shadow-inner space-y-6">
                  <div className="flex items-start gap-4">
                    <span className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 font-black flex items-center justify-center text-sm shrink-0 mt-0.5 border border-cyan-500/30">
                      Q{qIndex + 1}
                    </span>
                    <h3 className="text-lg font-extrabold text-white leading-relaxed pt-1">{q.question}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-14">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = userAnswers[qIndex] === optIndex;
                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => handleSelectAnswer(qIndex, optIndex)}
                          className={`p-4 rounded-2xl text-left font-bold text-sm border-2 transition-all flex items-center justify-between group ${
                            isSelected
                              ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                              : 'bg-dark-card border-dark-border hover:border-cyan-500/50 hover:bg-cyan-500/5 text-dark-muted hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${
                              isSelected ? 'bg-cyan-500 text-black' : 'bg-dark-bg text-dark-muted group-hover:bg-cyan-500/20 group-hover:text-cyan-400'
                            }`}>
                              {['A', 'B', 'C', 'D'][optIndex]}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isSelected && <CheckCircle2 size={18} className="text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-6 border-t border-dark-border">
                <button
                  onClick={handleSubmitTest}
                  className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-3 active:scale-[0.98] transition-all"
                >
                  <Award size={20} /> Submit Exam & View Score
                </button>
              </div>
            </div>
          ) : (
            /* GRADING RESULT CARD */
            <div className="p-8 md:p-12 rounded-3xl bg-dark-bg border border-dark-border text-center space-y-8 relative overflow-hidden">
              {/* Celebration background */}
              {scoreResult.percentage >= 60 && (
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
              )}

              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto text-white shadow-[0_0_50px_rgba(6,182,212,0.4)] relative z-10">
                <Award size={56} className={scoreResult.percentage >= 60 ? "animate-bounce" : ""} />
              </div>
              
              <div className="relative z-10">
                <h3 className="text-3xl font-black text-white tracking-tight">Auto-Grading Complete!</h3>
                <p className="text-sm text-cyan-400 font-bold mt-2 uppercase tracking-widest">Digital Performance Report</p>
              </div>

              <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto relative z-10">
                <div className="p-6 rounded-2xl bg-dark-card border border-dark-border shadow-inner">
                  <span className="text-xs uppercase font-black text-dark-muted block mb-2">Score</span>
                  <span className="text-3xl font-black text-green-400 block">{scoreResult.correct} <span className="text-lg text-dark-muted">/ {scoreResult.total}</span></span>
                </div>
                <div className="p-6 rounded-2xl bg-dark-card border border-dark-border shadow-inner">
                  <span className="text-xs uppercase font-black text-dark-muted block mb-2">Percentage</span>
                  <span className="text-3xl font-black text-cyan-400 block">{scoreResult.percentage}%</span>
                </div>
                <div className="p-6 rounded-2xl bg-dark-card border border-dark-border shadow-inner">
                  <span className="text-xs uppercase font-black text-dark-muted block mb-2">Grade</span>
                  <span className={`text-4xl font-black block ${
                    scoreResult.percentage >= 80 ? 'text-green-400' : scoreResult.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {scoreResult.percentage >= 80 ? 'A+' : scoreResult.percentage >= 60 ? 'B' : 'F'}
                  </span>
                </div>
              </div>

              <div className="pt-8 flex justify-center relative z-10">
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

    </div>
  );
};

export default StudentOnlineQuiz;
