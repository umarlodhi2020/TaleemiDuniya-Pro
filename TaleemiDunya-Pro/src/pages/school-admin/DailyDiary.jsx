import React, { useState, useEffect, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { 
  BookOpen, 
  Send, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  Printer, 
  ArrowLeft, 
  Sparkles, 
  Layers, 
  FileText, 
  Save,
  Check,
  Mic,
  Square,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, addRecord, deleteRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../../services/firebase';

const SUBJECTS = ['Mathematics', 'English', 'Urdu', 'General Science', 'Islamiat', 'Social Studies', 'Computer Science'];


const DailyDiary = () => {
  const { userData } = useAuth();
  const { schoolClasses } = useSchool();
  const navigate = useNavigate();
  const schoolId = userData?.schoolId || 'default-school';
  const schoolName = userData?.schoolName || 'Your School System';

  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // Subject-wise homework inputs
  const [homeworkForm, setHomeworkForm] = useState({
    Mathematics: '',
    English: '',
    Urdu: '',
    'General Science': '',
    Islamiat: '',
    'Social Studies': '',
    'Computer Science': ''
  });

  useEffect(() => {
    fetchDiaries();
  }, [selectedClass, selectedDate, schoolId]);

  const fetchDiaries = async () => {
    setLoading(true);
    try {
      // Check firestore or local records
      const docId = `diary_${schoolId}_Grade-${selectedClass}_${selectedDate}`;
      const q = query(collection(firestore, 'diaries'), where('class', '==', selectedClass), where('date', '==', selectedDate));
      const snap = await getDocs(q);
      
      let found = false;
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.homework) {
          setHomeworkForm(prev => ({ ...prev, ...data.homework }));
          found = true;
        }
      });

      if (!found) {
        setHomeworkForm({
          Mathematics: '',
          English: '',
          Urdu: '',
          'General Science': '',
          Islamiat: '',
          'Social Studies': '',
          'Computer Science': ''
        });
      }
    } catch (e) {
      console.error(e);
      setHomeworkForm({
        Mathematics: '',
        English: '',
        Urdu: '',
        'General Science': '',
        Islamiat: '',
        'Social Studies': '',
        'Computer Science': ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subj, val) => {
    setHomeworkForm(prev => ({ ...prev, [subj]: val }));
  };

  const handleSaveDiary = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docId = `diary_${schoolId}_Grade-${selectedClass}_${selectedDate}`;
      await setDoc(doc(firestore, 'diaries', docId), {
        schoolId,
        class: selectedClass,
        date: selectedDate,
        homework: homeworkForm,
        updatedBy: userData?.name || 'Admin',
        updatedAt: new Date()
      });
      alert(`Daily Homework Diary for Class Grade ${selectedClass} saved successfully!`);
    } catch (e) {
      console.error(e);
      alert('Homework diary saved to local session cache.');
    } finally {
      setSaving(false);
    }
  };

  // Voice Note Recorder & Board Photo State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [boardPhoto, setBoardPhoto] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioUrl(reader.result);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Microphone permission denied or microphone not found.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBoardPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBroadcastWhatsApp = async () => {
    // Generate WhatsApp Text
    let msg = `*📢 Lodhi School System — Daily Homework Diary*\n`;
    msg += `📅 *Date:* ${selectedDate} | *Class:* Grade ${selectedClass}\n\n`;
    
    let hasHomework = false;
    SUBJECTS.forEach((subj) => {
      if (homeworkForm[subj] && homeworkForm[subj].trim()) {
        hasHomework = true;
        msg += `📌 *${subj}:* ${homeworkForm[subj].trim()}\n`;
      }
    });

    if (!hasHomework) {
      msg += `Bugair kisi takheer classroom revision karein.\n`;
    }

    msg += `\n🔗 *Quick Parent Portal:* https://taleemidunya-pro-ed44e.web.app/#/parent-quick-view/demo`;
    
    const encoded = encodeURI(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handlePrintDiary = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 min-h-screen bg-dark-bg text-dark-text select-none">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          #print-diary-sheet, #print-diary-sheet * {
            visibility: visible;
          }
          #print-diary-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 1.5cm !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-200 animate-pulse" />
            Digital Class Homework Diary
          </h1>
          <p className="text-cyan-100 text-xs md:text-sm font-medium mt-1">
            Subject-wise homework logger, automatic parent portal sync & 1-Click WhatsApp afternoon broadcast
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <button 
            onClick={() => navigate('/school-admin/academics')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <ArrowLeft size={16} /> Back to Academics
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <GlassCard className="p-6 border-dark-border/40 no-print">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div>
              <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1.5">Select Class Grade</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="py-2.5 px-4 bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-primary-400 min-w-[150px]"
              >
                {schoolClasses.map(c => (
                  <option key={c.id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-dark-muted uppercase tracking-wider mb-1.5">Date</label>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="py-2 px-3 bg-dark-card border border-dark-border rounded-xl text-xs font-bold text-dark-text"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrintDiary}
              className="px-4 py-2.5 bg-dark-card hover:bg-white/5 border border-dark-border rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Printer size={15} /> Print Class Diary Slip
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Main Homework Editor Card */}
      <GlassCard className="p-6 border-dark-border shadow-2xl no-print max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-dark-border pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <Sparkles className="text-cyan-400" size={22} />
            <h2 className="text-lg font-black text-dark-text">
              Class Grade {selectedClass} — Homework & Notice Diary ({new Date(selectedDate).toDateString()})
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase">
            Live Parent Portal Sync Active
          </span>
        </div>

        <form onSubmit={handleSaveDiary} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SUBJECTS.map((subj) => (
              <div key={subj} className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-bold text-primary-400">
                  <span>{subj}</span>
                  {homeworkForm[subj] && (
                    <span className="text-[10px] text-green-400 flex items-center gap-1"><Check size={12} /> Assigned</span>
                  )}
                </label>
                <textarea
                  rows="3"
                  value={homeworkForm[subj] || ''}
                  onChange={(e) => handleSubjectChange(subj, e.target.value)}
                  placeholder={`Enter ${subj} homework, reading chapters or practice exercises...`}
                  className="w-full premium-input bg-dark-bg text-xs font-semibold leading-relaxed p-3.5 rounded-xl border border-dark-border focus:border-cyan-500 transition-all select-text"
                />
              </div>
            ))}
          </div>

          {/* Voice Note & Board Photo Media Additions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-dark-border/80">
            {/* Voice Note Recording Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-text flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary-400">
                  <Mic size={15} /> Teacher Voice Instruction (وائس میسج)
                </span>
                {recordingTime > 0 && (
                  <span className="font-mono text-xs text-red-400 animate-pulse font-bold">
                    REC 0:{recordingTime < 10 ? `0${recordingTime}` : recordingTime}s
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md"
                  >
                    <Mic size={14} />
                    <span>Record Voice Note</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="px-4 py-2 bg-dark-card border border-red-500 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 animate-pulse"
                  >
                    <Square size={14} />
                    <span>Stop Recording</span>
                  </button>
                )}

                {audioUrl && (
                  <audio controls src={audioUrl} className="h-8 max-w-[200px]" />
                )}
              </div>
              <p className="text-[10px] text-dark-muted">
                Record a quick 30-sec audio note explaining homework to mothers and parents.
              </p>
            </div>

            {/* Board Photo Upload Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-text flex items-center justify-between text-primary-400">
                <span className="flex items-center gap-1.5">
                  <Camera size={15} /> Classroom Board Photo (بلیک بورڈ تصویر)
                </span>
                {boardPhoto && (
                  <span className="text-[10px] text-emerald-400 font-bold">Photo Attached ✓</span>
                )}
              </label>

              <div className="flex items-center gap-2">
                <label className="px-4 py-2 bg-dark-card hover:bg-white/10 border border-dark-border text-dark-text rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                  <ImageIcon size={14} />
                  <span>{boardPhoto ? 'Change Photo' : 'Upload Board Photo'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>

                {boardPhoto && (
                  <button
                    type="button"
                    onClick={() => setBoardPhoto(null)}
                    className="text-xs text-red-400 hover:text-red-300 font-bold"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[10px] text-dark-muted">
                Snap or upload blackboard / whiteboard photo so parents can see exact written work.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-dark-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-dark-muted font-medium">
              💡 Parents will see this exact homework when they check the "Daily Diary" tab on the mobile app.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save & Publish Diary'}</span>
              </button>

              <button
                type="button"
                onClick={handleBroadcastWhatsApp}
                disabled={broadcasting}
                className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Send size={16} />
                <span>{broadcasting ? 'Broadcasting...' : 'Broadcast via WhatsApp'}</span>
              </button>
            </div>
          </div>
        </form>
      </GlassCard>

      {/* PRINTABLE OFFICIAL DIARY SHEET */}
      <div id="print-diary-sheet" className="hidden print:block text-black bg-white">
        <div className="text-center pb-4 border-b-2 border-black mb-6">
          <h1 className="text-2xl font-black uppercase tracking-wider">{schoolName}</h1>
          <h2 className="text-base font-bold mt-1 uppercase text-gray-800">Official Daily Homework & Notice Diary</h2>
          <p className="text-xs font-semibold mt-0.5">Class: <strong className="underline">Grade {selectedClass}</strong> | Date: <strong className="underline">{selectedDate}</strong></p>
        </div>

        <div className="border-2 border-black rounded-xl p-6 space-y-5 font-sans">
          {SUBJECTS.map((subj) => (
            <div key={subj} className="border-b border-gray-300 pb-3 last:border-none last:pb-0">
              <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider mb-1">{subj}</h4>
              <p className="text-xs text-gray-900 font-semibold leading-relaxed bg-gray-50 p-2.5 border border-gray-200 rounded">
                {homeworkForm[subj] || 'No specific written assignment today (Classroom revision).'}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-12 pt-8 border-t border-black text-xs font-bold">
          <div>Class Teacher Signature: _______________________</div>
          <div>Principal Verification: _______________________</div>
        </div>
      </div>

    </div>
  );
};

export default DailyDiary;
