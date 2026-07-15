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
  const { login, loginWithGoogle, resetPassword } = useAuth();
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const authenticatedUser = await loginWithGoogle();
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
        navigate('/super-admin/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google Sign In failed. Please try again.');
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
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/10">
            <KeyRound className="text-primary-500" size={28} />
          </div>
          <h1 className="text-4xl font-bold bg-premium-gradient bg-clip-text text-transparent">
            TaleemiDunya
          </h1>
          <p className="text-dark-muted mt-1.5 font-medium text-sm">SaaS-based School Management Pro</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[10px] font-black tracking-wider flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              v2.5.0 PRO BUILD
            </span>
          </div>
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

              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-dark-border w-full"></div>
                <span className="bg-dark-bg px-3 text-xs font-semibold text-dark-muted absolute uppercase tracking-wider">or</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:border-primary-500/40"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.3 8.9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.5.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.8z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.2L1.6 16c1.9 3.8 5.8 6.4 10.4 6.4z"/>
                </svg>
                Sign in with Google
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
