/**
 * NetworkStatusBar — Floating offline/sync indicator
 * 
 * Shows a compact banner when:
 * - User goes offline
 * - Background sync is in progress
 * - Operations are queued for sync
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, CheckCircle2 } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useFirestore';

const NetworkStatusBar = () => {
  const { isOnline, isSyncing, pendingCount, syncProgress } = useOfflineStatus();

  // Don't show anything when online with no pending items
  if (isOnline && !isSyncing && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 transition-all duration-500 animate-fade-in ${
      !isOnline 
        ? 'bg-red-500/15 border-red-500/30 text-red-400' 
        : isSyncing 
          ? 'bg-primary-500/15 border-primary-500/30 text-primary-400'
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
          <span className="text-xs font-bold uppercase tracking-widest">Syncing...</span>
          <span className="text-[10px] font-mono bg-primary-500/20 px-2 py-0.5 rounded-full">
            {syncProgress}%
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
