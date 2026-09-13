import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Plus, 
  Trash2, 
  Clock, 
  Award, 
  CheckCircle2, 
  Play, 
  ArrowLeft, 
  Save, 
  HelpCircle, 
  Sparkles, 
  Eye, 
  FileText, 
  Check, 
  X,
  RefreshCw,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const OnlineQuizEngine = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';

  const [quizzes, setQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'live_test'
  const [selectedQuizForTest, setSelectedQuizForTest] = useState(null);

  React.useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await getRecords('quizzes', schoolId);
        if (data && data.length > 0) setQuizzes(data);
        else setQuizzes([]);
      } catch (err) {
        setQuizzes([]);
      }
    };
    fetchQuizzes();
  }, [schoolId]);

  // New Quiz Builder State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizClass, setQuizClass] = useState('10');
  const [quizSubject, setQuizSubject] = useState('General Science');
  const [quizDuration, setQuizDuration] = useState(15);
  const [questionsList, setQuestionsList] = useState([
    { id: 1, question: '', options: ['', '', '', ''], correct: 0 }
  ]);

  // Live Test Simulation State
  const [userAnswers, setUserAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState({ correct: 0, total: 0, percentage: 0 });
  const [timeLeft, setTimeLeft] = useState(0);

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

  const handleAddQuestion = () => {
    setQuestionsList([
      ...questionsList,
      { id: questionsList.length + 1, question: '', options: ['', '', '', ''], correct: 0 }
    ]);
  };

  const handleQuestionChange = (index, field, val) => {
    const updated = [...questionsList];
    updated[index][field] = val;
    setQuestionsList(updated);
  };

  const handleOptionChange = (qIndex, oIndex, val) => {
    const updated = [...questionsList];
    updated[qIndex].options[oIndex] = val;
    setQuestionsList(updated);
  };

  const handleSaveQuiz = (e) => {
    e.preventDefault();
    if (!quizTitle || questionsList.some(q => !q.question || q.options.some(o => !o))) {
      alert('Please fill quiz title, all questions, and all 4 options for each question.');
      return;
    }
    const newQ = {
      id: `qz_${Date.now()}`,
      title: quizTitle,
      classGrade: quizClass,
      subject: quizSubject,
      durationMinutes: Number(quizDuration) || 15,
      totalQuestions: questionsList.length,
      status: 'active',
      questions: questionsList
    };
    setQuizzes([newQ, ...quizzes]);
    alert('Online MCQ Quiz published successfully! Students can now access this quiz from their portal.');
    setActiveTab('list');
    setQuizTitle('');
    setQuestionsList([{ id: 1, question: '', options: ['', '', '', ''], correct: 0 }]);
  };

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
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
            <Laptop className="w-8 h-8 text-cyan-200 animate-bounce" />
            Online MCQ Quiz & Auto-Grading Engine
          </h1>
          <p className="text-blue-100 text-xs md:text-sm font-medium mt-1">
            Build computer-based assessments, timed student quizzes & instant automated score generation
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          {activeTab !== 'list' && (
            <button 
              onClick={() => setActiveTab('list')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
            >
              <ArrowLeft size={16} /> Back to Quizzes
            </button>
          )}
          {activeTab === 'list' && (
            <button 
              onClick={() => setActiveTab('create')}
              className="px-5 py-2.5 bg-white text-blue-900 hover:bg-blue-50 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2"
            >
              <Plus size={16} /> Create New Quiz
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: QUIZ LIST & CATALOG */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map(quiz => (
              <GlassCard key={quiz.id} className="p-6 border-dark-border flex flex-col justify-between hover:border-cyan-500/50 transition-all group">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-black text-[10px] uppercase border border-cyan-500/20">
                      Grade {quiz.classGrade} — {quiz.subject}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 font-mono">
                      <Clock size={13} /> {quiz.durationMinutes} Mins
                    </span>
                  </div>
                  <h3 className="text-base font-black text-dark-text group-hover:text-cyan-400 transition-colors leading-snug mb-2">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-dark-muted font-medium mb-4">
                    Contains <strong className="text-dark-text">{quiz.totalQuestions} Multiple Choice Questions</strong> with instant auto-grading enabled.
                  </p>
                </div>

                <div className="pt-4 border-t border-dark-border/60 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Active & Published
                  </span>
                  <button
                    onClick={() => handleStartLiveTest(quiz)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
                  >
                    <Play size={13} fill="white" />
                    <span>Launch Test</span>
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: QUIZ CREATOR FORM */}
      {activeTab === 'create' && (
        <GlassCard className="p-6 max-w-4xl mx-auto border-dark-border">
          <div className="flex items-center gap-2 border-b border-dark-border pb-4 mb-6">
            <Sparkles className="text-cyan-400" size={24} />
            <h2 className="text-lg font-black text-dark-text">Build New Online MCQ Assessment</h2>
          </div>

          <form onSubmit={handleSaveQuiz} className="space-y-6 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-black text-dark-muted mb-1">Quiz Title / Topic *</label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="e.g. Chapter 3: Chemical Reactions Quiz"
                  className="w-full premium-input bg-dark-bg p-3 rounded-xl border border-dark-border text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-dark-muted mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  value={quizDuration}
                  onChange={(e) => setQuizDuration(e.target.value)}
                  className="w-full premium-input bg-dark-bg p-3 rounded-xl border border-dark-border text-sm font-mono text-yellow-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-black text-dark-muted mb-1">Target Class Grade</label>
                <select
                  value={quizClass}
                  onChange={(e) => setQuizClass(e.target.value)}
                  className="w-full premium-input bg-dark-bg p-3 rounded-xl border border-dark-border text-primary-400 font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                    <option key={c} value={c.toString()}>Grade {c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-dark-muted mb-1">Subject</label>
                <select
                  value={quizSubject}
                  onChange={(e) => setQuizSubject(e.target.value)}
                  className="w-full premium-input bg-dark-bg p-3 rounded-xl border border-dark-border text-primary-400 font-bold"
                >
                  {['Mathematics', 'General Science', 'English', 'Urdu', 'Computer Science', 'Islamiat'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Questions List Editor */}
            <div className="space-y-6 pt-4 border-t border-dark-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider">Questions & Answer Key ({questionsList.length})</h3>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/30 text-xs font-black flex items-center gap-1 transition-all"
                >
                  <Plus size={14} /> Add Question
                </button>
              </div>

              {questionsList.map((qItem, qIndex) => (
                <div key={qIndex} className="p-5 rounded-2xl bg-dark-bg border border-dark-border/80 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-sm text-yellow-400 font-mono">Question #{qIndex + 1}</span>
                    {questionsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuestionsList(questionsList.filter((_, idx) => idx !== qIndex))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    value={qItem.question}
                    onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                    placeholder="Enter question prompt..."
                    className="w-full premium-input bg-dark-card p-3 rounded-xl border border-dark-border text-xs font-bold"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {qItem.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2 bg-dark-card p-2 rounded-xl border border-dark-border">
                        <input
                          type="radio"
                          name={`correct_q_${qIndex}`}
                          checked={qItem.correct === oIndex}
                          onChange={() => handleQuestionChange(qIndex, 'correct', oIndex)}
                          className="w-4 h-4 text-cyan-500 cursor-pointer"
                          title="Select as Correct Answer"
                        />
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${['A', 'B', 'C', 'D'][oIndex]}`}
                          className="flex-1 bg-transparent border-none focus:outline-none text-xs font-semibold"
                        />
                        {qItem.correct === oIndex && (
                          <span className="text-[9px] font-black text-green-400 uppercase bg-green-500/10 px-1.5 py-0.5 rounded">Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-dark-border">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Save size={16} /> Publish MCQ Quiz
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* VIEW 3: LIVE TEST SIMULATOR & RESULT CARD */}
      {activeTab === 'live_test' && selectedQuizForTest && (
        <GlassCard className="p-6 max-w-3xl mx-auto border-dark-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-dark-border pb-4 gap-4">
            <div>
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">
                Grade {selectedQuizForTest.classGrade} — {selectedQuizForTest.subject}
              </span>
              <h2 className="text-xl font-black text-dark-text mt-0.5">{selectedQuizForTest.title}</h2>
            </div>

            {!testSubmitted ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono font-black text-base animate-pulse self-start sm:self-auto">
                <Clock size={18} />
                <span>Time Left: {formatTime(timeLeft)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-black text-sm self-start sm:self-auto">
                <CheckCircle2 size={18} />
                <span>Quiz Submitted & Graded</span>
              </div>
            )}
          </div>

          {!testSubmitted ? (
            <div className="space-y-6">
              {selectedQuizForTest.questions.map((q, qIndex) => (
                <div key={q.id} className="p-5 rounded-2xl bg-dark-bg border border-dark-border space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-black flex items-center justify-center text-xs shrink-0 mt-0.5 font-mono">
                      Q{qIndex + 1}
                    </span>
                    <h3 className="text-sm font-extrabold text-dark-text leading-snug">{q.question}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = userAnswers[qIndex] === optIndex;
                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => handleSelectAnswer(qIndex, optIndex)}
                          className={`p-3 rounded-xl text-left font-bold text-xs border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                              : 'bg-dark-card border-dark-border/80 hover:border-dark-border text-dark-text'
                          }`}
                        >
                          <span>{['A', 'B', 'C', 'D'][optIndex]}. {opt}</span>
                          {isSelected && <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t border-dark-border">
                <button
                  onClick={handleSubmitTest}
                  className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-green-600/30 flex items-center gap-2"
                >
                  <Award size={18} /> Submit Assessment & View Score
                </button>
              </div>
            </div>
          ) : (
            /* GRADING RESULT CARD */
            <div className="p-6 rounded-2xl bg-dark-bg border border-dark-border text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto text-white shadow-xl">
                <Award size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-dark-text">Quiz Auto-Graded Successfully!</h3>
                <p className="text-xs text-dark-muted mt-1">Here is your instantaneous digital performance report card</p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 rounded-xl bg-dark-card border border-dark-border">
                  <span className="text-[10px] uppercase font-black text-dark-muted block">Correct</span>
                  <span className="text-xl font-black text-green-400 mt-1 block">{scoreResult.correct} / {scoreResult.total}</span>
                </div>
                <div className="p-4 rounded-xl bg-dark-card border border-dark-border">
                  <span className="text-[10px] uppercase font-black text-dark-muted block">Percentage</span>
                  <span className="text-xl font-black text-cyan-400 mt-1 block">{scoreResult.percentage}%</span>
                </div>
                <div className="p-4 rounded-xl bg-dark-card border border-dark-border">
                  <span className="text-[10px] uppercase font-black text-dark-muted block">Grade</span>
                  <span className="text-xl font-black text-yellow-400 mt-1 block">
                    {scoreResult.percentage >= 80 ? 'A+' : scoreResult.percentage >= 60 ? 'B' : 'C'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-dark-border flex justify-center gap-3">
                <button
                  onClick={() => handleStartLiveTest(selectedQuizForTest)}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Retake Quiz
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl shadow-lg"
                >
                  Return to Quiz Catalog
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

    </div>
  );
};

export default OnlineQuizEngine;
