import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldAlert, KeyRound, CheckCircle2, Eye, Users, UserPlus, BookOpen, CreditCard, CalendarCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/common/GlassCard';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { currentUser, userData, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUser && userData?.role) {
      navigate(userData.role === 'super-admin' ? '/super-admin/dashboard' : '/school-admin/dashboard');
    }
  }, [currentUser, userData, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/school-admin/dashboard');
    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/school-admin/dashboard');
    } catch (err) {
      setError('Google Sign In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Column - Branding & Features */}
      <div className="hidden lg:flex w-5/12 flex-col bg-blue-50/30 relative overflow-hidden">
        {/* Top Content */}
        <div className="p-8 xl:p-12 pb-6 z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                TaleemiDunya <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] rounded-full uppercase tracking-wide">Pro</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">School Management System</p>
            </div>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-gray-900 leading-tight mb-2">
            Better Learning<br/>
            <span className="text-blue-600">Brighter Future</span>
          </h1>
          <p className="text-gray-500 text-xs xl:text-sm mb-8 max-w-sm">
            Manage your school, students, teachers and all academic activities in one place.
          </p>

          <div className="grid grid-cols-2 gap-y-4 gap-x-4 max-w-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-100 text-green-500 flex items-center justify-center"><Users size={18}/></div>
              <span className="text-[11px] font-semibold text-gray-700 leading-tight">Student<br/>Management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center"><UserPlus size={18}/></div>
              <span className="text-[11px] font-semibold text-gray-700 leading-tight">Teacher<br/>Management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-500 flex items-center justify-center"><BookOpen size={18}/></div>
              <span className="text-[11px] font-semibold text-gray-700 leading-tight">Academic<br/>Records</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-500 flex items-center justify-center"><CreditCard size={18}/></div>
              <span className="text-[11px] font-semibold text-gray-700 leading-tight">Fee & Finance</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center"><CalendarCheck size={18}/></div>
              <span className="text-[11px] font-semibold text-gray-700 leading-tight">Attendance<br/>& Reports</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-500 flex items-center justify-center"><ShieldAlert size={18}/></div>
              <span className="text-[11px] font-semibold text-gray-700 leading-tight">Secure & Reliable</span>
            </div>
          </div>
        </div>

        {/* Bottom Photo and Blue Wave */}
        <div className="relative flex-1 w-full overflow-hidden rounded-tr-[100px] pointer-events-none mt-4">
          <img 
            src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1000" 
            alt="Classroom" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* SVG Wave at bottom */}
          <div className="absolute bottom-0 left-0 w-full">
            <svg viewBox="0 0 1440 320" className="w-full h-auto drop-shadow-lg translate-y-1">
              <path fill="#2563EB" fillOpacity="1" d="M0,160L80,181.3C160,203,320,245,480,245.3C640,245,800,203,960,170.7C1120,139,1280,117,1360,106.7L1440,96L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
            </svg>
            <div className="absolute bottom-8 left-10 text-white z-10 transform -rotate-[10deg] origin-bottom-left">
              <h3 className="text-3xl lg:text-4xl font-serif italic mb-1 font-bold">Education</h3>
              <h3 className="text-3xl lg:text-4xl font-serif italic mb-2 font-bold">Builds Nations</h3>
              <BookOpen className="w-10 h-10 ml-6 opacity-90 mt-2 transform rotate-[10deg]" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[400px] p-6 md:p-8">
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-3">
               <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-1.5 mb-4">
              TaleemiDunya <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full uppercase tracking-wide">Pro</span>
            </h2>
            <h3 className="text-lg font-bold text-gray-900">Welcome Back!</h3>
            <p className="text-[13px] text-gray-500 mt-0.5">Sign in to continue to your dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-gray-700">Email or Username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-[13px] bg-white" 
                  placeholder="Enter your email or username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-bold text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-[13px] bg-white"
                  placeholder="Enter your password"
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[12px] text-gray-500 group-hover:text-gray-700">Remember me</span>
              </label>
              <a href="#" className="text-[12px] font-bold text-blue-600 hover:text-blue-700">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4 text-[13px]"
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn size={16} /> Login
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="bg-white px-3 text-gray-400">or continue with</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-[13px] font-semibold text-gray-700 bg-white"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.3 8.9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.5.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.8z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.2L1.6 16c1.9 3.8 5.8 6.4 10.4 6.4z"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-[13px] font-semibold text-gray-700 bg-white"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.4 11.4H0V0H11.4V11.4Z" fill="#F25022"/>
                <path d="M24 11.4H12.6V0H24V11.4Z" fill="#7FBA00"/>
                <path d="M11.4 24H0V12.6H11.4V24Z" fill="#00A4EF"/>
                <path d="M24 24H12.6V12.6H24V24Z" fill="#FFB900"/>
              </svg>
              Continue with Microsoft
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-500 mt-6">
            Don't have an account? <a href="#" className="font-bold text-blue-600 hover:underline">Contact Administrator</a>
          </p>

          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col items-center gap-1.5 text-[9px] text-gray-400">
            <span className="flex items-center gap-1">
              <Lock size={9} /> TaleemiDunya Pro v2.0.0
            </span>
            <span>© 2025 TaleemiDunya. All rights reserved.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
