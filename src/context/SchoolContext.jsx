import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { getAllowedFeaturesForPlan, isFeatureAllowedByMap, getFeatureCatalogItem, SAAS_FEATURE_CATALOG } from '../config/saasFeaturesConfig';

const SchoolContext = createContext();

export const useSchool = () => useContext(SchoolContext);

export const SchoolProvider = ({ children }) => {
  const { userData } = useAuth();
  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    
    // Resolve schoolId: try userData.schoolId, fallback to 'default-school' if role is school-admin
    const schoolId = userData?.schoolId || (userData?.role === 'school-admin' ? 'default-school' : null);

    if (schoolId) {
      const schoolRef = doc(db, 'schools', schoolId);
      
      // Use real-time listener for school settings
      unsubscribe = onSnapshot(schoolRef, async (docSnap) => {
        if (docSnap.exists()) {
          setSchoolData({ id: docSnap.id, ...docSnap.data() });
          setLoading(false);
        } else {
          // Auto-create default school document so that school admin panel never fails
          try {
            const defaultSchool = {
              name: userData?.schoolName || 'Lodhi School System',
              email: userData?.email || 'admin@lodhischool.com',
              phone: '0300-1234567',
              address: 'Main Campus, Lahore, Pakistan',
              status: 'active',
              plan: 'premium',
              subscriptionPlan: 'premium',
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiry
              createdAt: new Date().toISOString(),
              allowedFeatures: {}, // Custom overrides map if super admin changes specific toggles
              eServices: {
                websiteActive: true,
                whatsAppActive: true,
                virtualClassesActive: true,
                libraryActive: true,
                admissionsActive: true,
                parentActive: true,
                website: {
                  themeColor: '#3b82f6',
                  logoUrl: '',
                  contactPhone: '0300-1234567',
                  contactEmail: userData?.email || 'admin@lodhischool.com',
                  address: 'Main Campus, Lahore, Pakistan',
                  brandName: userData?.schoolName || 'Lodhi School System'
                },
                whatsApp: {
                  triggers: ['attendance', 'fee'],
                  apiKey: 'wts_live_990848x28a38c',
                  phoneNumber: '0300-1234567'
                },
                virtualClasses: [
                  { id: '1', grade: '9', subject: 'Physics', time: '10:00 AM - 11:00 AM', link: 'https://zoom.us/j/9082384218' },
                  { id: '2', grade: '10', subject: 'Mathematics', time: '11:30 AM - 12:30 PM', link: 'https://meet.google.com/abc-defg-hij' }
                ],
                libraryBooks: [
                  { id: '1', name: 'Oxford Progressive English', grade: '5', subject: 'English', fileUrl: 'https://taleemi.edu/books/english5.pdf' },
                  { id: '2', name: 'Mathematics Grade 9 Sindh Board', grade: '9', subject: 'Mathematics', fileUrl: 'https://taleemi.edu/books/maths9.pdf' }
                ],
                admissions: {
                  isAccepting: true,
                  applications: [
                    { id: 'app1', name: 'Fatima Lodhi', fatherName: 'Umar Hayat', grade: '5', phone: '03001234567', status: 'Pending', date: '2026-05-15' },
                    { id: 'app2', name: 'Muhammad Ali', fatherName: 'Sajid Ali', grade: '8', phone: '03129876543', status: 'Pending', date: '2026-05-16' },
                    { id: 'app3', name: 'Ayesha Khan', fatherName: 'Tariq Khan', grade: '2', phone: '03214567890', status: 'Approved', date: '2026-05-14' }
                  ]
                },
                parentPortal: {
                  pins: {
                    'std1': '4829',
                    'std2': '9012'
                  }
                }
              }
            };
            await setDoc(schoolRef, defaultSchool);
          } catch (e) {
            console.error("Error auto-creating school:", e);
            setLoading(false);
          }
        }
      }, (error) => {
        console.error("Error fetching school data:", error);
        setLoading(false);
      });
    } else {
      setSchoolData(null);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [userData?.schoolId, userData?.role]);

  const getExpiryDate = () => {
    if (!schoolData?.expiryDate) return null;
    if (typeof schoolData.expiryDate.toDate === 'function') {
      return schoolData.expiryDate.toDate();
    }
    return new Date(schoolData.expiryDate);
  };

  // Compute exact allowed features map for this school
  const allowedFeaturesMap = useMemo(() => {
    // If super admin is viewing, all features are allowed
    if (userData?.role === 'super-admin') {
      const allTrue = {};
      SAAS_FEATURE_CATALOG.forEach(f => { allTrue[f.key] = true; });
      return allTrue;
    }
    const plan = schoolData?.plan || schoolData?.subscriptionPlan || 'premium';
    return getAllowedFeaturesForPlan(plan, schoolData?.allowedFeatures || {});
  }, [schoolData?.plan, schoolData?.subscriptionPlan, schoolData?.allowedFeatures, userData?.role]);

  // Dynamic permission checker method
  const isFeatureAllowed = (keyOrPath) => {
    if (userData?.role === 'super-admin') return true;
    return isFeatureAllowedByMap(keyOrPath, allowedFeaturesMap);
  };

  const getFeatureInfo = (keyOrPath) => {
    return getFeatureCatalogItem(keyOrPath);
  };

  // Helper for instant local demo or super-admin updates
  const updateSchoolAllowedFeatures = async (newOverrides) => {
    const schoolId = schoolData?.id || userData?.schoolId || 'default-school';
    const updated = { ...(schoolData?.allowedFeatures || {}), ...newOverrides };
    
    // Immediately update local state so sidebar and UI re-render instantly without waiting for network
    setSchoolData(prev => prev ? { ...prev, allowedFeatures: updated } : { id: schoolId, allowedFeatures: updated });

    if (schoolRefOrIdExists(schoolId)) {
      try {
        await updateDoc(doc(db, 'schools', schoolId), { allowedFeatures: updated });
      } catch (e) {
        console.warn("Firestore update failed, kept local override active:", e);
      }
    }
  };

  const schoolRefOrIdExists = (id) => Boolean(id);

  const value = {
    schoolData,
    loading,
    isSubscriptionActive: schoolData?.status === 'active' && (getExpiryDate() ? getExpiryDate() > new Date() : true),
    allowedFeaturesMap,
    isFeatureAllowed,
    getFeatureInfo,
    updateSchoolAllowedFeatures,
    currentSaaSPlan: (schoolData?.plan || schoolData?.subscriptionPlan || 'premium').toLowerCase()
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
};
