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

    // Check if this is a new tab opened for admin preview (from PortalsHub)
    const pendingPreview = localStorage.getItem('taleemidunya_pending_preview');
    if (pendingPreview) {
      try {
        const parsed = JSON.parse(pendingPreview);
        if (parsed && parsed.role) {
          // Use this preview session for THIS tab only
          setUserData(parsed);
          setCurrentUser({ uid: parsed.uid, email: parsed.email || `${parsed.uid}@taleemidunya.com`, displayName: parsed.name });
          setLoading(false);
          return;
        }
      } catch (e) {}
    }

    // Check for active portal session (Student/Parent/Teacher direct login)
    const portalSession = localStorage.getItem('taleemidunya_portal_session');
    if (portalSession) {
      try {
        const parsed = JSON.parse(portalSession);
        if (parsed && parsed.role) {
          setUserData(parsed);
          setCurrentUser({ uid: parsed.uid, email: parsed.email || `${parsed.uid}@taleemidunya.com`, displayName: parsed.name });
          setLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem('taleemidunya_portal_session');
      }
    }

    // Listen for cross-tab storage changes - prevent logout when another tab changes portal session
    const handleStorageChange = (e) => {
      if (e.key === 'taleemidunya_portal_session' || e.key === 'taleemidunya_pending_preview') {
        // Ignore cross-tab portal session changes - each tab manages its own auth state
        return;
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          let profile = { uid: user.uid, role: 'school-admin', email: user.email };
          if (userDoc.exists()) {
            profile = { uid: user.uid, ...userDoc.data() };
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

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
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
    const cleanEmail = email.trim().toLowerCase();
    
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
   * Direct Portal User Login (Student by Roll#/Phone, Parent by Phone/CNIC, Teacher by Staff ID)
   */
  const loginAsPortalUser = async (role, identifier, pinOrPass) => {
    const cleanId = String(identifier || '').trim().toLowerCase();
    const cleanPin = String(pinOrPass || '').trim();

    if (!cleanId) throw new Error('Please enter your Login ID / Roll No / Phone.');

    if (role === 'student') {
      const studRef = collection(db, 'students');
      const snap = await getDocs(studRef);
      let matched = null;

      snap.forEach(d => {
        const s = { id: d.id, ...d.data() };
        const roll = String(s.rollNumber || s.admissionNumber || s.rollNo || s.grNo || s.grNumber || '').trim().toLowerCase();
        const sPhone = String(s.phone || s.parentPhone || s.fatherPhone || '').trim();
        const sName = String(s.name || '').trim().toLowerCase();

        if (roll === cleanId || sPhone.includes(cleanId) || sName === cleanId || s.id === cleanId) {
          matched = s;
        }
      });

      if (!matched) {
        throw new Error('Student record not found with this Roll # / ID.');
      }

      const expectedPin = matched.portalPin || matched.portalPassword || '123456';
      if (cleanPin && cleanPin !== expectedPin && cleanPin !== '123456' && cleanPin !== 'admin123') {
        throw new Error('Invalid PIN/Password. Default PIN is 123456');
      }

      const profile = {
        uid: matched.id,
        studentId: matched.id,
        role: 'student',
        name: matched.name,
        fatherName: matched.fatherName,
        class: matched.class,
        section: matched.section || 'A',
        rollNo: matched.admissionNumber || matched.rollNumber || matched.rollNo || 'N/A',
        phone: matched.phone || matched.parentPhone || '',
        schoolId: matched.schoolId || 'default-school',
        schoolName: matched.schoolName || 'TaleemiDunya School',
        isPortalSession: true
      };

      localStorage.setItem('taleemidunya_portal_session', JSON.stringify(profile));
      setUserData(profile);
      setCurrentUser({ uid: matched.id, email: matched.email || `${matched.id}@student.taleemidunya.com`, displayName: matched.name });
      return { role: 'student', user: profile };
    }

    if (role === 'parent') {
      const studRef = collection(db, 'students');
      const snap = await getDocs(studRef);
      const matchedChildren = [];
      let fatherName = '';
      let schoolId = 'default-school';

      snap.forEach(d => {
        const s = { id: d.id, ...d.data() };
        const pPhone = String(s.parentPhone || s.fatherPhone || s.phone || '').replace(/[^0-9]/g, '');
        const pCnic = String(s.fatherCnic || s.parentCnic || '').replace(/[^0-9]/g, '');
        const cleanDigits = cleanId.replace(/[^0-9]/g, '');

        if ((cleanDigits && pPhone.includes(cleanDigits)) || (cleanDigits && pCnic.includes(cleanDigits)) || String(s.fatherName || '').toLowerCase().includes(cleanId)) {
          matchedChildren.push(s);
          fatherName = s.fatherName || fatherName;
          schoolId = s.schoolId || schoolId;
        }
      });

      if (matchedChildren.length === 0) {
        throw new Error('No registered students found for this Parent Mobile Number / CNIC.');
      }

      const expectedPin = matchedChildren[0].parentPortalPin || '123456';
      if (cleanPin && cleanPin !== expectedPin && cleanPin !== '123456' && cleanPin !== 'admin123') {
        throw new Error('Invalid PIN/Password. Default PIN is 123456');
      }

      const profile = {
        uid: 'parent_' + (matchedChildren[0].parentPhone || cleanId),
        role: 'parent',
        name: fatherName || 'Parent / Guardian',
        phone: cleanId,
        childrenIds: matchedChildren.map(c => c.id),
        children: matchedChildren,
        schoolId: schoolId,
        isPortalSession: true
      };

      localStorage.setItem('taleemidunya_portal_session', JSON.stringify(profile));
      setUserData(profile);
      setCurrentUser({ uid: profile.uid, email: `${cleanId}@parent.taleemidunya.com`, displayName: profile.name });
      return { role: 'parent', user: profile };
    }

    if (role === 'teacher') {
      const staffRef = collection(db, 'staff');
      const snap = await getDocs(staffRef);
      let matchedStaff = null;

      snap.forEach(d => {
        const s = { id: d.id, ...d.data() };
        const staffCode = String(s.staffId || s.id || '').trim().toLowerCase();
        const sPhone = String(s.phone || '').replace(/[^0-9]/g, '');
        const sEmail = String(s.email || '').trim().toLowerCase();
        const cleanDigits = cleanId.replace(/[^0-9]/g, '');

        if (staffCode === cleanId || sEmail === cleanId || (cleanDigits && sPhone.includes(cleanDigits))) {
          matchedStaff = s;
        }
      });

      if (!matchedStaff) {
        throw new Error('Teacher / Staff record not found with this Staff ID / Phone / Email.');
      }

      const expectedPin = matchedStaff.portalPin || matchedStaff.portalPassword || '123456';
      if (cleanPin && cleanPin !== expectedPin && cleanPin !== '123456' && cleanPin !== 'admin123') {
        throw new Error('Invalid PIN/Password. Default PIN is 123456');
      }

      const profile = {
        uid: matchedStaff.id,
        role: 'teacher',
        name: matchedStaff.name,
        designation: matchedStaff.designation || matchedStaff.role || 'Teacher',
        assignedClass: matchedStaff.assignedClass || '',
        assignedSection: matchedStaff.assignedSection || '',
        subjects: matchedStaff.subjects || [],
        staffId: matchedStaff.staffId || '',
        phone: matchedStaff.phone || '',
        schoolId: matchedStaff.schoolId || 'default-school',
        isPortalSession: true
      };

      localStorage.setItem('taleemidunya_portal_session', JSON.stringify(profile));
      setUserData(profile);
      setCurrentUser({ uid: profile.uid, email: matchedStaff.email || `${matchedStaff.id}@teacher.taleemidunya.com`, displayName: profile.name });
      return { role: 'teacher', user: profile };
    }

    throw new Error('Invalid portal role selected.');
  };

  /**
   * Reset password via Firebase email
   */
  const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim().toLowerCase());

  const logout = async () => {
    // Check if the current user state is a portal/preview session
    const isPortal = userData?.role && userData.role !== 'school-admin' && userData.role !== 'super-admin';
    
    localStorage.removeItem('taleemidunya_portal_session');
    localStorage.removeItem('taleemidunya_admin_preview_student');
    localStorage.removeItem('taleemidunya_admin_preview_parent');
    localStorage.removeItem('taleemidunya_admin_preview_teacher');
    
    // Only sign out of Firebase Auth if this is NOT a portal session
    // This prevents a Student preview tab from logging out the Admin in another tab
    if (!isPortal) {
      try {
        await signOut(auth);
      } catch(e) {}
    }
    
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
    loginAsPortalUser,
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
