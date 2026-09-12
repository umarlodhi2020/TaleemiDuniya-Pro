/**
 * Custom React Hooks for TaleemiDunya-Pro
 * 
 * - useOfflineStatus: Track online/offline and sync state
 * - useFirestoreQuery: Simplified Firestore data fetching with loading/error
 * - useRealtimeCollection: Real-time Firestore subscription hook
 */

import { useState, useEffect, useCallback } from 'react';
import { onStatusChange, onSyncProgress, getPendingCount, getOnlineStatus } from '../services/offline';
import { getRecords, subscribeToCollection, getSingleRecord, subscribeToDocument } from '../services/db';

// ═══════════════════════════════════════════════════════
//  useOfflineStatus — Network & Sync status
// ═══════════════════════════════════════════════════════

/**
 * Hook to track online/offline status and sync progress
 * @returns {{ isOnline: boolean, isSyncing: boolean, pendingCount: number, syncProgress: number }}
 */
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(getOnlineStatus());
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    pendingCount: getPendingCount(),
    syncProgress: 0,
  });

  useEffect(() => {
    const unsubStatus = onStatusChange(setIsOnline);
    const unsubSync = onSyncProgress((data) => {
      setSyncState({
        isSyncing: data.syncing || false,
        pendingCount: data.pending ?? getPendingCount(),
        syncProgress: data.progress || 0,
      });
    });

    return () => {
      unsubStatus();
      unsubSync();
    };
  }, []);

  return {
    isOnline,
    ...syncState,
  };
};

// ═══════════════════════════════════════════════════════
//  useFirestoreQuery — One-time data fetching
// ═══════════════════════════════════════════════════════

/**
 * Hook for fetching Firestore collection data
 * @param {string} collectionName
 * @param {string} schoolId
 * @param {Array} filters - Optional filters
 * @param {Array} deps - Extra dependencies to trigger refetch
 * @returns {{ data: Array, loading: boolean, error: Error|null, refetch: Function }}
 */
export const useFirestoreQuery = (collectionName, schoolId, filters = [], deps = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await getRecords(collectionName, schoolId, filters);
      setData(results);
    } catch (e) {
      console.error(`useFirestoreQuery error [${collectionName}]:`, e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [collectionName, schoolId, JSON.stringify(filters), ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

// ═══════════════════════════════════════════════════════
//  useRealtimeCollection — Live Firestore subscription
// ═══════════════════════════════════════════════════════

/**
 * Hook for real-time Firestore collection subscription
 * @param {string} collectionName
 * @param {string} schoolId
 * @param {Array} filters - Optional filters
 * @returns {{ data: Array, loading: boolean }}
 */
export const useRealtimeCollection = (collectionName, schoolId, filters = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToCollection(collectionName, schoolId, (results) => {
      setData(results);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [collectionName, schoolId, JSON.stringify(filters)]);

  return { data, loading };
};

// ═══════════════════════════════════════════════════════
//  useRealtimeDocument — Single document subscription
// ═══════════════════════════════════════════════════════

/**
 * Hook for real-time single document subscription
 * @param {string} collectionName
 * @param {string} docId
 * @returns {{ data: Object|null, loading: boolean }}
 */
export const useRealtimeDocument = (collectionName, docId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToDocument(collectionName, docId, (result) => {
      setData(result);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, docId]);

  return { data, loading };
};

export default { useOfflineStatus, useFirestoreQuery, useRealtimeCollection, useRealtimeDocument };
