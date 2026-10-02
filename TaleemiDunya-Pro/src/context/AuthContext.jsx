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
          let profile = { uid: user.uid, role: 'guest', email: user.email, schoolId: null };
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
    const rawInput = email.trim().toLowerCase();
    const isUsername = !cleanEmail.includes('@');
    
    // If no '@' is found, assume it's a username and append pseudo-domain
    if (isUsername) {
      cleanEmail = `${cleanEmail}@taleemidunya.local`;
    }
    
    // Block email/password login ONLY for exact super-admin emails (use Google OAuth instead)
    const isOwner = allowedSuperAdmins.includes(cleanEmail);
    if (isOwner) {
      throw { code: 'auth/super-admin-password-disabled' };
    }

    let credential;
    try {
      // Try normal sign in first
      credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (signInErr) {
      // If user not found AND it was a username login → search Firestore and create account
      if (
        isUsername &&
        (signInErr.code === 'auth/user-not-found' ||
          signInErr.code === 'auth/invalid-credential' ||
          signInErr.code === 'auth/invalid-email')
      ) {
        // Search students, staff, parents for this username
        let firestoreRecord = null;
        let recordRole = 'student';
        let schoolId = 'default-school';

        // Search students
        const studentsSnap = await getDocs(
          query(collection(db, 'students'), where('username', '==', rawInput))
        );
        if (!studentsSnap.empty) {
          firestoreRecord = { id: studentsSnap.docs[0].id, ...studentsSnap.docs[0].data() };
          recordRole = 'student';
          schoolId = firestoreRecord.schoolId || 'default-school';
        }

        // Search staff
        if (!firestoreRecord) {
          const staffSnap = await getDocs(
            query(collection(db, 'staff'), where('username', '==', rawInput))
          );
          if (!staffSnap.empty) {
            firestoreRecord = { id: staffSnap.docs[0].id, ...staffSnap.docs[0].data() };
            recordRole = 'teacher';
            schoolId = firestoreRecord.schoolId || 'default-school';
          }
        }

        // Search parents (parentUsername field in students collection)
        if (!firestoreRecord) {
          const parentSnap = await getDocs(
            query(collection(db, 'students'), where('parentUsername', '==', rawInput))
          );
          if (!parentSnap.empty) {
            firestoreRecord = { id: parentSnap.docs[0].id, ...parentSnap.docs[0].data() };
            recordRole = 'parent';
            schoolId = firestoreRecord.schoolId || 'default-school';
          }
        }

        if (!firestoreRecord) {
          // Username not found in any collection
          throw { code: 'auth/user-not-found' };
        }

        // Create Firebase Auth account for this user (first time login)
        try {
          credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        } catch (createErr) {
          // If email already exists but wrong password
          if (createErr.code === 'auth/email-already-in-use') {
            throw { code: 'auth/wrong-password' };
          }
          throw createErr;
        }

        // Create Firestore user profile
        const newProfile = {
          uid: credential.user.uid,
          role: recordRole,
          email: cleanEmail,
          username: rawInput,
          name: firestoreRecord.name || firestoreRecord.fatherName || rawInput,
          schoolId,
          recordId: firestoreRecord.id,
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(db, 'users', credential.user.uid), newProfile);

        // Update Firestore record with Firebase UID
        try {
          const collectionName = recordRole === 'student' ? 'students' : recordRole === 'teacher' ? 'staff' : 'students';
          const fieldToUpdate = recordRole === 'parent' ? { parentAuthUid: credential.user.uid } : { authUid: credential.user.uid };
          await updateDoc(doc(db, collectionName, firestoreRecord.id), fieldToUpdate);
        } catch (_) {}

        const profile = newProfile;
        setUserData(profile);
        return { ...credential.user, role: profile.role };
      }
      // Any other error: re-throw
      throw signInErr;
    }
    
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
    let profile = { uid: credential.user.uid, role: 'guest', email: cleanEmail };
    
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
        role: isOwner ? 'super-admin' : 'guest', 
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
