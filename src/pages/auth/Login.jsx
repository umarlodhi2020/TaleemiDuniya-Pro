import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/common/GlassCard';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const authenticatedUser = await login(email, password);
      const role = authenticatedUser.role;
      if (role === 'super-admin') {
        navigate('/super-admin/dashboard');
      } else if (role === 'school-admin') {
        navigate('/school-admin/dashboard');
      } else if (role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (role === 'student') {
        navigate('/student/dashboard');
      } else if (role === 'parent') {
        navigate('/parent/dashboard');
      } else {
        navigate('/school-admin/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later or reset your password.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err) {
      setError('Could not send reset email. Please check the email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-500/20 rounded-full blur-[128px] animate-pulse"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-secondary-500/20 rounded-full blur-[128px] animate-pulse delay-700"></div>

      <GlassCard className="max-w-md w-full p-10 relative z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="text-primary-500" size={28} />
          </div>
          <h1 className="text-4xl font-bold bg-premium-gradient bg-clip-text text-transparent">
            TaleemiDunya
          </h1>
          <p className="text-dark-muted mt-2 font-medium">SaaS-based School Management Pro</p>
        </div>

        {!showReset ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-dark-text">Sign In</h2>
              <p className="text-dark-muted text-sm mt-1">Enter your credentials to access your dashboard</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-dark-muted ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted group-focus-within:text-primary-500 transition-colors" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@school.edu" 
                    className="w-full premium-input pl-12"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-dark-muted ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted group-focus-within:text-primary-500 transition-colors" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full premium-input pl-12"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end text-xs">
                <button 
                  type="button"
                  onClick={() => { setShowReset(true); setError(''); }}
                  className="text-primary-500 hover:text-primary-400 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full premium-button-primary mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Password Reset View */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-dark-text">Reset Password</h2>
              <p className="text-dark-muted text-sm mt-1">We'll send a reset link to your email address</p>
            </div>

            {resetSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-green-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-green-400 mb-2">Email Sent!</h3>
                <p className="text-dark-muted text-sm mb-6">Check your inbox for the password reset link.</p>
                <button
                  onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(''); }}
                  className="premium-button-secondary w-full"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                    <ShieldAlert size={20} />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-dark-muted ml-1">Your Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted group-focus-within:text-primary-500 transition-colors" size={18} />
                    <input 
                      type="email" 
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@school.edu" 
                      className="w-full premium-input pl-12"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full premium-button-primary">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setError(''); }}
                  className="w-full premium-button-secondary"
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </>
        )}

        <p className="text-dark-muted text-[10px] mt-8 text-center">
          © {new Date().getFullYear()} TaleemiDunya Pro. All rights reserved.
        </p>
      </GlassCard>
    </div>
  );
};

export default Login;
