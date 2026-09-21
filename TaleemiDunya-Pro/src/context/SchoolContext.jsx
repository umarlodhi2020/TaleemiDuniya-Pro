import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { doc, getDoc, onSnapshot, setDoc, updateDoc, collection, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { useAuth } from './AuthContext';
import { getAllowedFeaturesForPlan, isFeatureAllowedByMap, getFeatureCatalogItem, SAAS_FEATURE_CATALOG } from '../config/saasFeaturesConfig';

// Helper to convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '14 165 233'; // default sky-500
};

const SchoolContext = createContext();

export const useSchool = () => useContext(SchoolContext);

export const SchoolProvider = ({ children }) => {
  const { userData } = useAuth();
  const [schoolData, setSchoolData] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // Listen to global settings for feature toggles
  useEffect(() => {
    const settingsRef = doc(db, 'system', 'settings');
    const unsub = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    let unsubClasses = () => {};
    
    // Resolve schoolId: ONLY use the schoolId attached to the user. No fallbacks to other panels.
    const schoolId = userData?.schoolId || null;

    if (schoolId) {
      const schoolRef = doc(db, 'schools', schoolId);
      
      const classesQuery = query(collection(db, 'classes'), where('schoolId', '==', schoolId));
      unsubClasses = onSnapshot(classesQuery, (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) return Number(a.order) - Number(b.order);
          const numA = parseInt(a.name || '99', 10);
          const numB = parseInt(b.name || '99', 10);
          if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
          return String(a.name || '').localeCompare(String(b.name || ''));
        });
        setSchoolClasses(list);
        setClassesLoading(false);
      }, (error) => {
        console.error("Error fetching school classes:", error);
        setClassesLoading(false);
      });
      
      // Use real-time listener for school settings
      unsubscribe = onSnapshot(schoolRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.logo && (typeof data.logo === 'object' || data.logo === '[object Object]')) {
            data.logo = typeof data.logo === 'object' ? (data.logo.url || '') : '';
          }
          setSchoolData({ id: docSnap.id, ...data });
          
          // Apply White-label Theme
          if (data.branding?.primaryColor) {
            const rgb = hexToRgb(data.branding.primaryColor);
            // Override 500, 600 (hover), 400 (light) shades with the same color for simplicity or calculate shades
            // Since tailwind opacity relies on `r g b` format, we inject the RGB string
            document.documentElement.style.setProperty('--color-primary-400', rgb);
            document.documentElement.style.setProperty('--color-primary-500', rgb);
            document.documentElement.style.setProperty('--color-primary-600', rgb);
          } else {
            // Revert to default
            document.documentElement.style.removeProperty('--color-primary-400');
            document.documentElement.style.removeProperty('--color-primary-500');
            document.documentElement.style.removeProperty('--color-primary-600');
          }
          
          setLoading(false);
        } else {
          // School document doesn't exist (it was deleted or invalid)
          console.warn("School not found! Logging out user...");
          setSchoolData(null);
          setSchoolClasses([]);
          setLoading(false);
          setClassesLoading(false);
          
          if (userData?.role !== 'super-admin') {
            signOut(auth).catch(console.error);
          }
        }
      }, (error) => {
        console.error("Error fetching school data:", error);
        setLoading(false);
      });
    } else {
      setSchoolData(null);
      setSchoolClasses([]);
      setLoading(false);
      setClassesLoading(false);
    }

    return () => {
      unsubscribe();
      unsubClasses();
    };
  }, [userData?.schoolId, userData?.role]);

  // Derive dynamic list of class names (only show created classes when initialized)
  const classesList = useMemo(() => {
    if (schoolClasses && schoolClasses.length > 0) {
      return schoolClasses
        .filter(c => c.status !== 'disabled')
        .map(c => c.name || String(c.id))
        .filter(Boolean);
    }
    return ['Nursery', 'Prep', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  }, [schoolClasses]);

  // Derive fee structure map directly from configured class objects
  const classFees = useMemo(() => {
    const fees = {};
    if (schoolClasses && schoolClasses.length > 0) {
      schoolClasses.forEach(c => {
        if (c.name && c.status !== 'disabled') {
          fees[c.name] = {
            monthlyFee: Number(c.monthlyFee || 0),
            admissionFee: Number(c.admissionFee || 0),
            annualFee: Number(c.annualFee || 0),
            otherFee: Number(c.otherFee || 0)
          };
        }
      });
    }
    return fees;
  }, [schoolClasses]);

  const getExpiryDate = () => {
    if (!schoolData?.expiryDate) return null;
    if (typeof schoolData.expiryDate.toDate === 'function') {
      return schoolData.expiryDate.toDate();
    }
    return new Date(schoolData.expiryDate);
  };

  // Compute exact allowed features map for this school
  const allowedFeaturesMap = useMemo(() => {
    const plan = schoolData?.plan || schoolData?.subscriptionPlan || 'premium';
    return getAllowedFeaturesForPlan(plan, schoolData?.allowedFeatures || {}, globalSettings?.globalDisabledFeatures || {});
  }, [schoolData?.plan, schoolData?.subscriptionPlan, schoolData?.allowedFeatures, globalSettings?.globalDisabledFeatures]);

  // Dynamic permission checker method
  const isFeatureAllowed = (keyOrPath) => {
    // Force allow WhatsApp features so they are never hidden
    if (keyOrPath === 'whatsapp-automation' || keyOrPath === 'sms-bot' || keyOrPath === 'ai-copilot') return true;
    
    // Always allow super admin config BUT ONLY FOR ACTUAL SUPER ADMINS!
    if (keyOrPath === 'super-admin-config' || keyOrPath === '/super-admin/dashboard') {
      return userData?.role === 'super-admin';
    }
    
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
    schoolClasses,
    classesList,
    classFees,
    classesLoading,
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
