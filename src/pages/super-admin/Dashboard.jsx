import React from 'react';
import { 
  Users, 
  School, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import GlassCard from '../../components/common/GlassCard';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const q = query(collection(db, 'schools'));
        const querySnapshot = await getDocs(q);
        const schoolsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSchools(schoolsData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const totalRevenue = schools.reduce((acc, s) => acc + (Number(s.revenue) || 0), 0);

  const stats = [
    { title: 'Total Schools', value: schools.length.toString(), icon: School, trend: 'up', trendValue: '12', color: 'primary' },
    { title: 'Active Accounts', value: schools.filter(s => s.status === 'active').length.toString(), icon: Users, trend: 'up', trendValue: '8', color: 'secondary' },
    { title: 'Total Revenue', value: `PKR ${totalRevenue.toLocaleString()}`, icon: DollarSign, trend: 'up', trendValue: '15', color: 'success' },
    { 
      title: 'New This Month', 
      value: schools.filter(s => {
        if (!s.createdAt) return false;
        const date = s.createdAt.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        return !isNaN(date.getTime()) && date > new Date(new Date().setMonth(new Date().getMonth() - 1));
      }).length.toString(), 
      icon: TrendingUp, 
      trend: 'up', 
      trendValue: '4', 
      color: 'warning' 
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, Super Admin</h1>
          <p className="text-dark-muted mt-1">Here is what's happening with TaleemiDunya today.</p>
        </div>
        
        <button 
          onClick={() => navigate('/super-admin/schools/add')}
          className="premium-button-primary"
        >
          <Plus size={20} />
          Add New School
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Recent Registered Schools</h2>
            <button 
              onClick={() => navigate('/super-admin/schools')}
              className="text-primary-500 hover:text-primary-400 text-sm font-semibold flex items-center gap-1 transition-colors"
            >
              View All <ArrowUpRight size={16} />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-sm uppercase tracking-wider">
                  <th className="pb-4 font-semibold">School Name</th>
                  <th className="pb-4 font-semibold">Admin</th>
                  <th className="pb-4 font-semibold">Status</th>
                  <th className="pb-4 font-semibold">Plan</th>
                  <th className="pb-4 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {schools.length === 0 ? (
                  <tr><td colSpan="5" className="py-10 text-center text-dark-muted">No schools registered yet.</td></tr>
                ) : schools.slice(0, 5).map((school) => (
                  <tr key={school.id} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4 font-medium flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-dark-hover flex items-center justify-center font-bold text-primary-500 uppercase">
                        {school.name?.charAt(0)}
                      </div>
                      {school.name}
                    </td>
                    <td className="py-4 text-dark-muted text-sm">{school.adminEmail}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                        school.status === 'active' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {school.status}
                      </span>
                    </td>
                    <td className="py-4 text-dark-muted text-xs font-bold">{school.plan || 'Premium'}</td>
                    <td className="py-4 font-black text-primary-500">PKR {Number(school.revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <div className="space-y-8">
          <GlassCard>
            <h2 className="text-xl font-bold mb-6">Subscription Distribution</h2>
            <div className="flex flex-col gap-4">
              {(() => {
                const planTypes = [
                  { name: 'Basic', color: 'bg-blue-500', key: 'basic' },
                  { name: 'Premium', color: 'bg-purple-500', key: 'premium' },
                  { name: 'Enterprise', color: 'bg-amber-500', key: 'enterprise' },
                ];
                const total = schools.length || 1;
                return planTypes.map(pt => {
                  const count = schools.filter(s => String(s.plan || s.subscriptionPlan || '').toLowerCase() === pt.key).length;
                  const pct = ((count / total) * 100).toFixed(0);
                  return (
                    <div key={pt.key} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-muted">{pt.name} Plan</span>
                        <span className="font-bold text-dark-text">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-dark-border rounded-full overflow-hidden">
                        <div className={`h-full ${pt.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
