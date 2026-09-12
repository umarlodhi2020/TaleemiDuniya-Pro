import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import GlassCard from '../../components/common/GlassCard';
import { useNavigate } from 'react-router-dom';

/**
 * SuperAdminSetup — First-time setup page
 * Only accessible at /setup — creates the first super-admin account.
 * After setup, this should be removed/disabled.
 */
const SuperAdminSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('check'); // check | form | done
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    setupKey: '',
  });

  // IMPORTANT: Change this key for security
  const SETUP_KEY = 'TALEEMI_SETUP_2026';

  const checkSetup = async () => {
    setLoading(true);
    try {
      // Check if super admin already exists by checking a marker doc
      const markerDoc = await getDoc(doc(db, 'system', 'setup'));
      if (markerDoc.exists() && markerDoc.data().superAdminCreated) {
        setAlreadyExists(true);
      }
      setStep('form');
    } catch (e) {
      // Firestore might have open rules — just proceed
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.setupKey !== SETUP_KEY) {
      setError('Invalid setup key. Contact your system administrator.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim().toLowerCase(),
        form.password
      );

      // 2. Create Firestore user profile
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: 'super-admin',
        schoolId: null,
        createdAt: serverTimestamp(),
      });

      // 3. Mark setup as complete
      await setDoc(doc(db, 'system', 'setup'), {
        superAdminCreated: true,
        superAdminEmail: form.email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      });

      setStep('done');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try logging in instead.');
      } else if (err.code === 'permission-denied') {
        setError('Firestore rules are blocking setup. Temporarily set rules to allow all writes, then redo.');
      } else {
        setError(`Setup failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-500/20 rounded-full blur-[128px] animate-pulse"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-secondary-500/20 rounded-full blur-[128px] animate-pulse delay-700"></div>

      <GlassCard className="max-w-lg w-full p-10 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-primary-500" size={32} />
          </div>
          <h1 className="text-3xl font-bold bg-premium-gradient bg-clip-text text-transparent">
            TaleemiDunya Pro
          </h1>
          <p className="text-dark-muted mt-2">First-Time Super Admin Setup</p>
        </div>

        {step === 'check' && (
          <div className="text-center space-y-6">
            <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-left">
              <p className="text-amber-400 font-bold text-sm mb-2">⚠️ One-Time Setup</p>
              <p className="text-dark-muted text-xs leading-relaxed">
                This page creates the first Super Admin account for TaleemiDunya Pro. 
                You will need the <strong className="text-white">Setup Key</strong> provided by the developer.
                After setup, this page should be removed from the app.
              </p>
            </div>
            <button onClick={checkSetup} disabled={loading} className="w-full premium-button-primary">
              {loading ? 'Checking...' : <>Continue to Setup <ArrowRight size={16} /></>}
            </button>
            <button onClick={() => navigate('/login')} className="w-full premium-button-secondary">
              Already have an account? Login
            </button>
          </div>
        )}

        {step === 'form' && (
          <>
            {alreadyExists && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-400 text-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                Super Admin already exists! You can still create an additional admin below.
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Setup Key *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="setupKey" required type="password" value={form.setupKey} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="Enter setup key" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="name" required value={form.name} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="Super Admin Name" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="email" type="email" required value={form.email} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="admin@taleemidunya.pro" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="password" type="password" required value={form.password} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="Min 8 characters" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-dark-muted uppercase tracking-widest">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                  <input name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange}
                    className="w-full premium-input pl-12" placeholder="Repeat password" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full premium-button-primary mt-2">
                {loading ? 'Creating Super Admin...' : <><ShieldCheck size={18} /> Create Super Admin Account</>}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-green-400" size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-400">Setup Complete!</h2>
              <p className="text-dark-muted text-sm mt-2">Super Admin account created successfully.</p>
            </div>

            <div className="p-5 bg-dark-hover border border-dark-border rounded-2xl text-left space-y-2">
              <p className="text-xs font-black text-dark-muted uppercase tracking-widest mb-3">Your Credentials</p>
              <p className="text-sm"><span className="text-dark-muted">Email:</span> <strong className="text-primary-400">{form.email}</strong></p>
              <p className="text-sm"><span className="text-dark-muted">Role:</span> <strong className="text-amber-400">Super Admin</strong></p>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400 text-left">
              <strong>Important:</strong> Please remove or disable the <code>/setup</code> route from App.jsx after this. Setup page should not be publicly accessible.
            </div>

            <button onClick={() => navigate('/login')} className="w-full premium-button-primary">
              Go to Login <ArrowRight size={16} />
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default SuperAdminSetup;
