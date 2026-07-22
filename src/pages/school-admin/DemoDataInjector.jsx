import React, { useState } from 'react';
import { Database, Loader2, CheckCircle2, AlertTriangle, Wand2, Users, Receipt, BookOpen } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

const DemoDataInjector = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const generateDemoData = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const batch = writeBatch(db);
      
      // 1. Generate 50 Fake Students
      const classNames = ['Playgroup', 'Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      const sections = ['A', 'B', 'C'];
      const statuses = ['Active', 'Active', 'Active', 'Active', 'Struck Off'];
      
      for (let i = 1; i <= 50; i++) {
        const studentRef = doc(collection(db, 'schools', schoolId, 'students'));
        const cl = classNames[Math.floor(Math.random() * classNames.length)];
        const sec = sections[Math.floor(Math.random() * sections.length)];
        const isDefaulter = Math.random() > 0.7; // 30% defaulters
        
        batch.set(studentRef, {
          rollNumber: `STD-2026-${String(i).padStart(4, '0')}`,
          name: `Demo Student ${i}`,
          fatherName: `Demo Parent ${i}`,
          phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
          class: cl,
          section: sec,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          feeStatus: isDefaulter ? 'Unpaid' : 'Paid',
          monthlyFee: 3500 + (Math.floor(Math.random() * 10) * 500),
          balance: isDefaulter ? 4500 : 0,
          transportRoute: Math.random() > 0.8 ? 'Route 1' : 'None',
          createdAt: new Date().toISOString()
        });
      }
      
      // 2. Generate 10 Fake Teachers
      for (let i = 1; i <= 10; i++) {
        const staffRef = doc(collection(db, 'schools', schoolId, 'staff'));
        batch.set(staffRef, {
          empId: `EMP-${String(i).padStart(3, '0')}`,
          name: `Demo Teacher ${i}`,
          role: i === 1 ? 'Principal' : 'Teacher',
          phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
          salary: 25000 + (Math.floor(Math.random() * 10) * 2000),
          status: 'Active',
          createdAt: new Date().toISOString()
        });
      }

      // 3. Generate 30 Fake Challans (for recent months)
      const months = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'];
      for (let i = 1; i <= 30; i++) {
        const challanRef = doc(collection(db, 'schools', schoolId, 'challans'));
        const isPaid = Math.random() > 0.4;
        batch.set(challanRef, {
          challanNo: `CHL-${Date.now()}-${i}`,
          studentName: `Demo Student ${Math.floor(Math.random() * 50) + 1}`,
          rollNumber: `STD-2026-${String(Math.floor(Math.random() * 50) + 1).padStart(4, '0')}`,
          class: classNames[Math.floor(Math.random() * classNames.length)],
          month: months[Math.floor(Math.random() * months.length)],
          amount: 4500,
          status: isPaid ? 'Paid' : 'Unpaid',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      await batch.commit();
      setSuccess(true);
      
    } catch (err) {
      console.error("Demo Data Injection Error:", err);
      setError(err.message || 'Failed to inject demo data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Database className="text-primary-500" /> Demo Data Injector
        </h1>
        <p className="text-dark-muted mt-1">Populate your empty school dashboard with realistic dummy data instantly.</p>
      </div>

      <GlassCard className="p-8 border border-primary-500/20 text-center max-w-2xl mx-auto mt-10">
        <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-500 mx-auto mb-6">
          <Wand2 size={40} />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Magic Data Generator</h2>
        <p className="text-dark-muted mb-8 leading-relaxed">
          Are you testing out TaleemiDunya? Click the button below and we will automatically generate 
          <strong> 50 Students, 10 Staff Members, and 30 Fee Challans </strong> 
          so you can see how the graphs, reports, and tables look when filled with data.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-dark-bg p-4 rounded-xl border border-dark-border">
            <Users className="text-blue-400 mx-auto mb-2" />
            <div className="font-bold">50 Students</div>
          </div>
          <div className="bg-dark-bg p-4 rounded-xl border border-dark-border">
            <BookOpen className="text-purple-400 mx-auto mb-2" />
            <div className="font-bold">10 Teachers</div>
          </div>
          <div className="bg-dark-bg p-4 rounded-xl border border-dark-border">
            <Receipt className="text-green-400 mx-auto mb-2" />
            <div className="font-bold">30 Challans</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3 text-left">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl mb-6 flex items-start gap-3 text-left">
            <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
            <p className="text-sm">Boom! Magic successful. Go check your Dashboard, Students, and Finance sections to see your new fake data!</p>
          </div>
        )}

        <button 
          onClick={generateDemoData}
          disabled={loading || success}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-primary-500/25 transition-all w-full md:w-auto flex items-center justify-center gap-3 mx-auto"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={20} /> Injecting Data... </>
          ) : success ? (
            <><CheckCircle2 size={20} /> Data Injected! </>
          ) : (
            <><Wand2 size={20} /> Inject Demo Data </>
          )}
        </button>
      </GlassCard>
    </div>
  );
};

export default DemoDataInjector;
