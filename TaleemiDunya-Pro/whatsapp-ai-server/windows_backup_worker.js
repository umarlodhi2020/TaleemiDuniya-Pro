/**
 * TaleemiDunya Pro — Safe Windows PC Backup Worker
 * 
 * Requirements (Part 9):
 * 1. AlwaysData is the PRIMARY worker.
 * 2. This worker operates in passive STANDBY mode by default.
 * 3. Monitors primary AlwaysData health via /api/diagnostics.
 * 4. Never initializes the WhatsApp socket simultaneously with the primary.
 * 5. Uses a strict single-active-worker lease coordination.
 * 6. Conservative failover strategy: will NOT take over on transient blips.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIMARY_URL = process.env.PRIMARY_URL || 'https://umarhayat.alwaysdata.net';
const SCHOOL_ID = process.env.SCHOOL_ID || 'NNRuCtHxQNjISc9EPgMs';
const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const FAILOVER_THRESHOLD = 5;    // Require 5 consecutive failures before considering failover

let consecutiveFailures = 0;
let workerState = 'STANDBY'; // 'STANDBY' | 'ACQUIRING_LEASE' | 'ACTIVE' | 'ERROR'

console.log('======================================================');
console.log('🛡️ TaleemiDunya Pro — Safe Windows PC Backup Worker');
console.log(`🌐 Primary Backend: ${PRIMARY_URL}`);
console.log(`🏫 Monitored School: ${SCHOOL_ID}`);
console.log(`⚙️ State: ${workerState} (Passive Standby)`);
console.log('======================================================\n');

async function checkPrimaryHealth() {
  const diagUrl = `${PRIMARY_URL}/api/diagnostics?schoolId=${encodeURIComponent(SCHOOL_ID)}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(diagUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      consecutiveFailures = 0;
      if (workerState !== 'STANDBY') {
        console.log(`🟢 [BACKUP WORKER] Primary recovered (${data.status || 'OK'}). Returning to passive STANDBY.`);
        workerState = 'STANDBY';
      } else {
        console.log(`[${new Date().toISOString()}] 🟢 Primary Healthy (${data.status || 'OK'}). Standby worker passive.`);
      }
      return true;
    } else {
      consecutiveFailures++;
      console.warn(`[${new Date().toISOString()}] ⚠️ Primary returned HTTP ${res.status}. Failure count: ${consecutiveFailures}/${FAILOVER_THRESHOLD}`);
    }
  } catch (err) {
    consecutiveFailures++;
    console.warn(`[${new Date().toISOString()}] ⚠️ Primary unreachable (${err.message}). Failure count: ${consecutiveFailures}/${FAILOVER_THRESHOLD}`);
  }

  if (consecutiveFailures >= FAILOVER_THRESHOLD && workerState === 'STANDBY') {
    console.error(`\n🚨 [STANDBY ALERT] Primary has failed ${FAILOVER_THRESHOLD} consecutive health checks.`);
    console.log(`🔒 Conservative Failover Policy: To prevent Baileys Code 440 split-brain conflicts, automatic session takeover requires manual lease confirmation.`);
    console.log(`👉 To promote this Windows PC worker to ACTIVE, start server.js with STANDBY_PROMOTED=1.\n`);
  }

  return false;
}

// Initial health check
checkPrimaryHealth();

// Recurring monitoring loop
setInterval(checkPrimaryHealth, CHECK_INTERVAL_MS);
