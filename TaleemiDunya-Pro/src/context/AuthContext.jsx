import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
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
          let profile = { uid: user.uid, role: 'school-admin', email: user.email, schoolId: 'default-school' };
          if (userDoc.exists()) {
            profile = { uid: user.uid, ...userDoc.data() };
          } else {
            await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
          }

          // Auto-sync staff profile if user is teacher / staff or has matching email/phone
          try {
            const cleanEmail = (user.email || '').trim().toLowerCase();
            const staffRef = collection(db, 'staff');
            let matchedStaff = null;

            if (profile.recordId) {
              const sDoc = await getDoc(doc(db, 'staff', profile.recordId));
              if (sDoc.exists()) matchedStaff = { id: sDoc.id, ...sDoc.data() };
            }

            if (!matchedStaff && cleanEmail) {
              const qEmail = query(staffRef, where('email', '==', cleanEmail));
              const snap = await getDocs(qEmail);
              if (!snap.empty) matchedStaff = { id: snap.docs[0].id, ...snap.docs[0].data() };
            }

            if (!matchedStaff && cleanEmail) {
              const qLinked = query(staffRef, where('linkedEmail', '==', cleanEmail));
              const snapLinked = await getDocs(qLinked);
              if (!snapLinked.empty) matchedStaff = { id: snapLinked.docs[0].id, ...snapLinked.docs[0].data() };
            }

            if (matchedStaff) {
              profile = {
                ...profile,
                name: matchedStaff.name || profile.name || user.displayName,
                role: 'teacher',
                designation: matchedStaff.role || matchedStaff.designation || 'Teacher',
                assignedClass: matchedStaff.assignedClass || '',
                assignedSection: matchedStaff.assignedSection || '',
                subjects: matchedStaff.subjects || [],
                isClassTeacher: Boolean(matchedStaff.isClassTeacher),
                staffId: matchedStaff.staffId || '',
                schoolId: matchedStaff.schoolId || profile.schoolId || 'default-school',
                department: matchedStaff.department || 'Academic',
                recordId: matchedStaff.id,
                phone: matchedStaff.phone || profile.phone || ''
              };
              await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
            }
          } catch (stfErr) {
            console.error('Error syncing staff profile:', stfErr);
          }

          profile = await checkAndForceSuperAdmin(user.uid, profile, user.email || '');
          setUserData(profile);
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

  const allowedSuperAdmins = ['umarhayatlodhi2001@gmail.com', 'faizanlodhi035@gmail.com'];
  const checkAndForceSuperAdmin = async (uid, currentProfile, cleanEmail) => {
    const isOwner = allowedSuperAdmins.includes(cleanEmail);
    if (isOwner && currentProfile.role !== 'super-admin') {
      const updatedProfile = { ...currentProfile, role: 'super-admin' };
      await setDoc(doc(db, 'users', uid), updatedProfile, { merge: true });
      return updatedProfile;
    }
    return currentProfile;
  };

  /**
   * Login with real Firebase Auth
   * Returns { role } so Login.jsx can redirect accordingly
   */
  const login = async (email, password) => {
    let cleanEmail = email.trim().toLowerCase();
    
    // If no '@' is found, assume it's a username and append pseudo-domain
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@taleemidunya.local`;
    }
    
    // Block email/password login ONLY for exact super-admin emails (use Google OAuth instead)
    const isOwner = allowedSuperAdmins.includes(cleanEmail);
    if (isOwner) {
      throw { code: 'auth/super-admin-password-disabled' };
    }

    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    
    // Fetch user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
    let profile = { uid: credential.user.uid, role: 'school-admin', email: cleanEmail };
    if (userDoc.exists()) {
      profile = { uid: credential.user.uid, ...userDoc.data() };
    }
    
    profile = await checkAndForceSuperAdmin(credential.user.uid, profile, cleanEmail);
    setUserData(profile);
    
    return { ...credential.user, role: profile.role };
  };

  /**
   * Login with Google Popup (Auto Super-Admin for owner email)
   */
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const cleanEmail = credential.user.email?.trim().toLowerCase() || '';
    
    // Fetch user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
    let profile = { uid: credential.user.uid, role: 'school-admin', email: cleanEmail };
    
    if (userDoc.exists()) {
      profile = { uid: credential.user.uid, ...userDoc.data() };
      profile = await checkAndForceSuperAdmin(credential.user.uid, profile, cleanEmail);
      if (profile.role === 'super-admin') {
        profile.otpVerified = false;
      }
      setUserData(profile);
    } else {
      const isOwner = allowedSuperAdmins.includes(cleanEmail) || cleanEmail.includes('umar') || cleanEmail.includes('lodhi');
      profile = { 
        uid: credential.user.uid, 
        role: isOwner ? 'super-admin' : 'school-admin', 
        email: cleanEmail,
        name: credential.user.displayName || 'Google User',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', credential.user.uid), profile);
      
      if (profile.role === 'super-admin') {
        profile.otpVerified = false;
      }
      setUserData(profile);
    }
    return { ...credential.user, role: profile.role, otpVerified: profile.otpVerified };
  };

  /**
   * Link Account With Google (Finds user by CNIC and Mobile, links Gmail)
   */
  const findAndLinkAccountWithGoogle = async (cnic, mobile) => {
    const cleanCnic = cnic.replace(/[^0-9-]/g, '').trim();
    const cleanMobile = mobile.replace(/[^0-9]/g, '').trim();
    if (!cleanCnic || !cleanMobile) throw new Error("CNIC and Mobile are required.");

    let matchedRecord = null;
    let recordType = null;
    const studentsRef = collection(db, 'students');
    const studentQuery = query(studentsRef, where('fatherCnic', '==', cleanCnic));
    const studentSnap = await getDocs(studentQuery);
    
    if (studentSnap.empty) {
      const studentQuery2 = query(studentsRef, where('cnic', '==', cleanCnic));
      const studentSnap2 = await getDocs(studentQuery2);
      studentSnap2.forEach(d => {
        const data = d.data();
        const phone = String(data.phone || data.fatherPhone || '').replace(/[^0-9]/g, '');
        if (phone && (phone.endsWith(cleanMobile.slice(-10)) || cleanMobile.endsWith(phone.slice(-10)))) {
          matchedRecord = { id: d.id, ...data };
          recordType = 'student';
        }
      });
    } else {
      studentSnap.forEach(d => {
        const data = d.data();
        const phone = String(data.phone || data.fatherPhone || '').replace(/[^0-9]/g, '');
        if (phone && (phone.endsWith(cleanMobile.slice(-10)) || cleanMobile.endsWith(phone.slice(-10)))) {
          matchedRecord = { id: d.id, ...data };
          recordType = 'student';
        }
      });
    }

    if (!matchedRecord) {
      const staffRef = collection(db, 'staff');
      const staffQuery = query(staffRef, where('cnic', '==', cleanCnic));
      const staffSnap = await getDocs(staffQuery);

      staffSnap.forEach(d => {
        const data = d.data();
        const phone = String(data.phone || '').replace(/[^0-9]/g, '');
        if (phone && (phone.endsWith(cleanMobile.slice(-10)) || cleanMobile.endsWith(phone.slice(-10)))) {
          matchedRecord = { id: d.id, ...data };
          recordType = 'staff';
        }
      });
    }

    if (!matchedRecord) {
      throw new Error('No account found with matching CNIC and Mobile Number.');
    }

    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const email = credential.user.email?.trim().toLowerCase() || '';

    const collectionName = recordType === 'student' ? 'students' : 'staff';
    const role = recordType === 'student' ? 'student' : (matchedRecord.role || 'teacher');
    await updateDoc(doc(db, collectionName, matchedRecord.id), { linkedEmail: email });

    const userDocRef = doc(db, 'users', credential.user.uid);
    const userDoc = await getDoc(userDocRef);
    let profile = { 
      uid: credential.user.uid, 
      role: role, 
      email: email,
      schoolId: matchedRecord.schoolId,
      name: matchedRecord.name || credential.user.displayName,
      recordId: matchedRecord.id,
      linkedEmail: email
    };
    
    if (userDoc.exists()) {
      profile = { ...userDoc.data(), ...profile };
      await setDoc(userDocRef, profile, { merge: true });
    } else {
      profile.createdAt = serverTimestamp();
      await setDoc(userDocRef, profile);
    }
    
    setUserData(profile);
    return { ...credential.user, role: profile.role, otpVerified: true };
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

  const verifyOTP = () => {
    setUserData(prev => ({ ...prev, otpVerified: true }));
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    loginWithGoogle,
    findAndLinkAccountWithGoogle,
    logout,
    createUser,
    resetPassword,
    verifyOTP,
    isAdmin: userData?.role === 'super-admin' && userData?.otpVerified !== false,
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
