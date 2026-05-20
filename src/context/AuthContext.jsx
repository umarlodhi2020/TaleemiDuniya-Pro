import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, secondaryAuth } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set persistence to local (survive browser restart)
    setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData({ uid: user.uid, ...userDoc.data() });
          } else {
            // User exists in Auth but no Firestore doc — create basic one
            setUserData({ uid: user.uid, role: 'school-admin', email: user.email });
          }
        } catch (e) {
          console.error('Error fetching user data:', e);
          setUserData({ uid: user.uid, role: 'school-admin', email: user.email });
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Login with real Firebase Auth
   * Returns { role } so Login.jsx can redirect accordingly
   */
  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    
    // Fetch user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
    let profile = { uid: credential.user.uid, role: 'school-admin', email: cleanEmail };
    if (userDoc.exists()) {
      profile = { uid: credential.user.uid, ...userDoc.data() };
      setUserData(profile);
    }
    return { ...credential.user, role: profile.role };
  };

  /**
   * Create a new Firebase Auth user AND their Firestore profile
   * Used by: RolesManager (school admin creates staff/teacher accounts)
   *          Super Admin creates school admin accounts
   */
  const createUser = async ({ email, password, role, name, schoolId, ...extra }) => {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), password);
    
    // Write Firestore user profile
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email: email.trim().toLowerCase(),
      name,
      role,
      schoolId: schoolId || null,
      ...extra,
      createdAt: serverTimestamp(),
    });

    // Clean up secondary auth session so it doesn't persist
    await signOut(secondaryAuth);

    return credential.user;
  };

  /**
   * Reset password via Firebase email
   */
  const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim().toLowerCase());

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserData(null);
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    logout,
    createUser,
    resetPassword,
    isAdmin: userData?.role === 'super-admin',
    isSchoolAdmin: userData?.role === 'school-admin',
    isTeacher: userData?.role === 'teacher',
    isStudent: userData?.role === 'student',
    isParent: userData?.role === 'parent',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
