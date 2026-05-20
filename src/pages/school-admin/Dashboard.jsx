import React from 'react';
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  CalendarCheck,
  ArrowUpRight,
  UserPlus
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import GlassCard from '../../components/common/GlassCard';
import ModuleGrid from '../../components/school-admin/ModuleGrid';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const FeeCollectionWidget = ({ schoolId }) => {
  const [feeData, setFeeData] = useState({ collected: 0, pending: 0 });
  useEffect(() => {
    const fetchFees = async () => {
      const challans = await getRecords('challans', schoolId);
      const collected = challans.filter(c => c.status === 'Paid').reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
      const pending = challans.filter(c => c.status !== 'Paid').reduce((s, c) => s + (Number(c.totalAmount) || 0), 0);
      setFeeData({ collected, pending });
    };
    fetchFees();
  }, [schoolId]);
  const total = feeData.collected + feeData.pending || 1;
  const collectedPct = ((feeData.collected / total) * 100).toFixed(0);
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 bg-dark-hover rounded-full h-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700" style={{ width: `${collectedPct}%` }} />
        </div>
        <span className="text-sm font-bold text-green-400">{collectedPct}%</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-500 font-bold uppercase">Collected</p>
          <p className="text-xl font-bold mt-1">PKR {feeData.collected.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-500 font-bold uppercase">Pending</p>
          <p className="text-xl font-bold mt-1">PKR {feeData.pending.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

const SchoolAdminDashboard = () => {
  const { userData } = useAuth();
  const [counts, setCounts] = useState({
    students: 0,
    staff: 0,
    inquiries: 0,
    attendance: '0%'
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      const schoolId = userData?.schoolId || 'default-school';
      const [students, staff, inquiries] = await Promise.all([
        getRecords('students', schoolId),
        getRecords('staff', schoolId),
        getRecords('inquiries', schoolId)
      ]);
      setCounts({
        students: students.length,
        staff: staff.length,
        inquiries: inquiries.length,
        attendance: '95%' // Mock for now
      });
      setRecentStudents(students.slice(0, 4));
      setLoading(false);
    };
    fetchCounts();
  }, [userData]);

  const stats = [
    { title: 'Total Students', value: counts.students.toLocaleString(), icon: GraduationCap, trend: 'up', trendValue: '5', color: 'primary' },
    { title: 'Total Staff', value: counts.staff.toLocaleString(), icon: Users, trend: 'up', trendValue: '2', color: 'secondary' },
    { title: 'Total Inquiries', value: counts.inquiries.toLocaleString(), icon: CreditCard, trend: 'up', trendValue: '10', color: 'success' },
    { title: 'Attendance Today', value: counts.attendance, icon: CalendarCheck, trend: 'up', trendValue: '1', color: 'warning' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-text">School Overview</h1>
          <p className="text-dark-muted mt-1">Manage your school operations efficiently.</p>
        </div>
        
        <div className="flex gap-4">
          <button className="premium-button-secondary">
            Generate Report
          </button>
          <button 
            onClick={() => navigate('/school-admin/students/add')}
            className="premium-button-primary"
          >
            <UserPlus size={20} />
            Add Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold px-1">Quick Access Modules</h2>
        <ModuleGrid />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Admissions</h2>
            <button className="text-primary-500 hover:text-primary-400 text-sm font-semibold flex items-center gap-1 transition-colors">
              View All <ArrowUpRight size={16} />
            </button>
          </div>
          
          <div className="space-y-4">
            {recentStudents.length === 0 ? (
              <div className="text-center py-10 text-dark-muted">No students registered yet.</div>
            ) : recentStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold uppercase">
                    {student.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-xs text-dark-muted">Grade {student.class} • Section {student.section || 'A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-dark-muted">Admitted</p>
                  <p className="text-sm font-medium">{student.admissionDate}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Fee Collection Status</h2>
            <button onClick={() => navigate('/school-admin/fees')} className="text-primary-500 hover:text-primary-400 text-sm font-semibold flex items-center gap-1 transition-colors">
              Fee Records <ArrowUpRight size={16} />
            </button>
          </div>
          
          <FeeCollectionWidget schoolId={userData?.schoolId || 'default-school'} />
        </GlassCard>
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
