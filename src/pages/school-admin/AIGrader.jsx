import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { Bot, Wand2, CheckCircle2, AlertTriangle, FileText, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AIGrader = () => {
  const { userData, showToast } = useAuth();
  const [question, setQuestion] = useState('Explain the process of photosynthesis.');
  const [maxMarks, setMaxMarks] = useState('10');
  const [studentAnswer, setStudentAnswer] = useState('Photosynthesis is how plants make food. They take water from the ground and carbon dioxide from the air. Using sunlight, they turn this into suger and oxygen. It happens in the leafs.');
  
  const [gradingState, setGradingState] = useState('idle'); // idle, scanning, analyzing, complete
  const [result, setResult] = useState(null);
  const [typedFeedback, setTypedFeedback] = useState('');

  const handleGrade = (e) => {
    e.preventDefault();
    if (!question || !studentAnswer) {
      showToast('error', 'Please provide both question and answer');
      return;
    }

    setGradingState('scanning');
    setResult(null);
    setTypedFeedback('');

    // Simulate AI pipeline
    setTimeout(() => {
      setGradingState('analyzing');
      
      setTimeout(() => {
        const fakeResult = {
          score: 7.5,
          grammarIssues: [
            { error: 'suger', correction: 'sugar', type: 'Spelling' },
            { error: 'leafs', correction: 'leaves', type: 'Spelling' }
          ],
          feedbackText: "Good basic understanding of the concept. You correctly identified the inputs (water, carbon dioxide, sunlight) and outputs (sugar, oxygen). However, you should mention the role of 'chlorophyll' which is crucial for capturing sunlight. Also, pay attention to spelling mistakes.",
          strengths: ['Identified inputs/outputs', 'Clear sentence structure'],
          weaknesses: ['Missed mentioning chlorophyll', 'Minor spelling errors']
        };
        setResult(fakeResult);
        setGradingState('complete');
        typeWriterEffect(fakeResult.feedbackText);
      }, 2500);

    }, 1500);
  };

  const typeWriterEffect = (text) => {
    let i = 0;
    setTypedFeedback('');
    const timer = setInterval(() => {
      setTypedFeedback((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, 20); // 20ms per character
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
              <Bot className="text-white" size={28} />
            </div>
            AI Homework Grader
          </h1>
          <p className="text-dark-muted mt-2 max-w-2xl">
            Automatically grade written assignments, detect grammar mistakes, and generate constructive feedback using our proprietary AI engine.
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 font-mono text-sm">
          <Sparkles size={16} /> Beta Engine Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Input Workspace */}
        <GlassCard className="p-0 overflow-hidden flex flex-col border-dark-border/50">
          <div className="p-4 bg-black/40 border-b border-dark-border/50 flex justify-between items-center">
            <h2 className="font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-400" /> Assessment Workspace
            </h2>
          </div>
          
          <form onSubmit={handleGrade} className="p-6 flex flex-col flex-grow space-y-5">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Question Prompt</label>
                <input 
                  type="text" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors"
                  placeholder="e.g. Explain the process of..."
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Max Marks</label>
                <input 
                  type="number" 
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-colors text-center font-mono"
                />
              </div>
            </div>

            <div className="flex-grow flex flex-col">
              <label className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2 block">Student's Written Answer</label>
              <textarea 
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                className="w-full flex-grow min-h-[250px] bg-dark-bg border border-dark-border rounded-xl p-4 text-white focus:border-purple-500 outline-none transition-colors resize-none leading-relaxed"
                placeholder="Paste the student's answer here for AI evaluation..."
              />
            </div>

            <button 
              type="submit"
              disabled={gradingState !== 'idle' && gradingState !== 'complete'}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gradingState === 'scanning' || gradingState === 'analyzing' ? (
                <><Loader2 className="animate-spin" size={20} /> Processing via AI...</>
              ) : (
                <><Wand2 size={20} /> Evaluate with AI</>
              )}
            </button>
          </form>
        </GlassCard>

        {/* Right Side: AI Output Pane */}
        <GlassCard className="p-0 overflow-hidden flex flex-col relative border-purple-500/20 bg-gradient-to-b from-dark-card to-black">
          
          {/* Top Bar */}
          <div className="p-4 bg-purple-900/20 border-b border-purple-500/20 flex justify-between items-center z-10">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-purple-400" /> Analysis Results
            </h2>
            {gradingState === 'complete' && (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/20">
                Evaluation Complete
              </span>
            )}
          </div>

          <div className="p-6 flex-grow flex flex-col relative z-10">
            {gradingState === 'idle' && (
              <div className="flex-grow flex flex-col items-center justify-center text-dark-muted space-y-4">
                <div className="w-20 h-20 rounded-full border border-dashed border-dark-border flex items-center justify-center opacity-50">
                  <Bot size={32} />
                </div>
                <p className="text-sm">Waiting for input. Click Evaluate to begin.</p>
              </div>
            )}

            {(gradingState === 'scanning' || gradingState === 'analyzing') && (
              <div className="flex-grow flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
                    <Bot size={40} className="text-purple-400 animate-pulse" />
                  </div>
                  {/* Scanning ring */}
                  <div className="absolute inset-0 rounded-full border-t-4 border-purple-500 animate-spin"></div>
                </div>
                <h3 className="text-xl font-black text-white tracking-widest uppercase">
                  {gradingState === 'scanning' ? 'Scanning Text...' : 'Analyzing Semantics...'}
                </h3>
                <div className="w-64 h-2 bg-dark-bg rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 animate-pulse w-full origin-left transform scale-x-100 transition-transform duration-1000"></div>
                </div>
                {/* Mock code terminal effect */}
                <div className="mt-8 text-xs font-mono text-purple-400/50 space-y-1 text-left w-full max-w-xs">
                  <p className="animate-fade-in">&gt; initializing NLP pipeline...</p>
                  <p className="animate-fade-in" style={{ animationDelay: '0.5s' }}>&gt; checking grammatical structure...</p>
                  {gradingState === 'analyzing' && (
                    <p className="animate-fade-in text-emerald-400/50">&gt; computing semantic similarity to rubric...</p>
                  )}
                </div>
              </div>
            )}

            {gradingState === 'complete' && result && (
              <div className="space-y-6 animate-fade-in flex-grow flex flex-col">
                
                {/* Score Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-2xl border border-purple-500/30">
                  <div>
                    <p className="text-xs text-purple-300 font-bold uppercase tracking-wider mb-1">AI Generated Score</p>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black text-white">{result.score}</span>
                      <span className="text-xl text-dark-muted font-bold mb-1">/ {maxMarks}</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-500">
                    <span className="text-lg font-black text-white">{((result.score / maxMarks) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {/* Grammar Issues */}
                {result.grammarIssues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" /> Language & Grammar
                    </h3>
                    <div className="space-y-2">
                      {result.grammarIssues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase rounded-md">
                            {issue.type}
                          </span>
                          <p className="text-sm">
                            <span className="text-red-400 line-through mr-2">{issue.error}</span>
                            <span className="text-emerald-400 font-bold">{issue.correction}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Feedback Typed */}
                <div className="flex-grow flex flex-col">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Bot size={16} className="text-blue-400" /> Teacher Feedback (Auto-Generated)
                  </h3>
                  <div className="p-4 bg-black/40 border border-dark-border rounded-xl flex-grow font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {typedFeedback}
                    <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1 align-middle"></span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-dark-border/50">
                  <button onClick={() => setGradingState('idle')} className="flex-1 py-3 rounded-xl bg-dark-bg border border-dark-border text-white font-bold hover:bg-white/5 transition-colors cursor-pointer">
                    Reset
                  </button>
                  <button onClick={() => showToast('success', 'Grade saved to gradebook!')} className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors flex justify-center items-center gap-2 cursor-pointer">
                    <CheckCircle2 size={18} /> Apply Grade
                  </button>
                </div>

              </div>
            )}
          </div>
        </GlassCard>

      </div>
    </div>
  );
};

export default AIGrader;
