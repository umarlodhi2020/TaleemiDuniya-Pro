/**
 * NetworkStatusBar — Floating offline/sync indicator
 * 
 * Shows a compact banner when:
 * - User goes offline
 * - Background sync is in progress
 * - Operations are queued for sync
 */

import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, CheckCircle2 } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useFirestore';

const NetworkStatusBar = () => {
  const { isOnline, isSyncing, pendingCount, syncProgress } = useOfflineStatus();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const prevOnlineRef = useRef(isOnline);
  const prevSyncingRef = useRef(isSyncing);

  useEffect(() => {
    // Detect reconnection from offline to online OR completion of background sync
    const wasOffline = !prevOnlineRef.current && isOnline;
    const finishedSync = prevSyncingRef.current && !isSyncing && pendingCount === 0;

    if (wasOffline || finishedSync) {
      setShowSuccessToast(true);
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }

    prevOnlineRef.current = isOnline;
    prevSyncingRef.current = isSyncing;
  }, [isOnline, isSyncing, pendingCount]);

  // If online, not syncing, no pending items, and success toast is done, render nothing
  if (isOnline && !isSyncing && pendingCount === 0 && !showSuccessToast) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 transition-all duration-500 animate-fade-in no-print ${
      !isOnline 
        ? 'bg-red-500/15 border-red-500/30 text-red-400' 
        : isSyncing 
          ? 'bg-primary-500/15 border-primary-500/30 text-primary-400'
          : showSuccessToast
            ? 'bg-green-500/20 border-green-500/40 text-green-400 shadow-green-500/10'
            : 'bg-orange-500/15 border-orange-500/30 text-orange-400'
    }`}>
      {!isOnline ? (
        <>
          <WifiOff size={18} className="animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest">Offline Mode</span>
          {pendingCount > 0 && (
            <span className="ml-1 text-[10px] font-mono bg-red-500/20 px-2 py-0.5 rounded-full">
              {pendingCount} queued
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">Syncing Data...</span>
          <span className="text-[10px] font-mono bg-primary-500/20 px-2 py-0.5 rounded-full">
            {syncProgress}%
          </span>
        </>
      ) : showSuccessToast ? (
        <>
          <CheckCircle2 size={18} className="text-green-400 animate-bounce" />
          <span className="text-xs font-bold uppercase tracking-widest">Connected & Synced!</span>
          <span className="text-[10px] text-green-300 font-semibold">
            All records safely backed up to cloud.
          </span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <CloudOff size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">
            {pendingCount} pending sync
          </span>
        </>
      ) : null}
    </div>
  );
};

export default NetworkStatusBar;
