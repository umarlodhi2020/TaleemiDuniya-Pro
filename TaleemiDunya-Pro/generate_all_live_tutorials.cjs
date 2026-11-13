const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG_PATH = 'G:\\Nova Vid\\bin\\ffmpeg.exe';
const OUTPUT_DIR = path.resolve(__dirname, 'Tutorial_Videos_For_YouTube');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function getLiveAppHtml(moduleConfig) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TaleemiDunya Live Tutorial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { margin: 0; padding: 0; background-color: #f8fafc; overflow: hidden; width: 1920px; height: 1080px; }
    
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }

    #virtual-cursor {
      position: absolute;
      width: 28px;
      height: 28px;
      z-index: 999999;
      pointer-events: none;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
    }
    .click-ripple {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 3px solid #2563eb;
      background: rgba(37, 99, 235, 0.28);
      transform: translate(-50%, -50%) scale(0);
      animation: ripple 0.45s ease-out forwards;
      pointer-events: none;
      z-index: 999998;
    }
    @keyframes ripple {
      to { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
    }

    #step-overlay {
      position: absolute;
      bottom: 35px;
      right: 45px;
      z-index: 90000;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(16px);
      border: 1.5px solid rgba(59, 130, 246, 0.5);
      box-shadow: 0 25px 50px rgba(0,0,0,0.3);
      border-radius: 20px;
      padding: 18px 28px;
      display: flex;
      align-items: center;
      gap: 18px;
      color: white;
      transform: translateY(140px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #step-overlay.active {
      transform: translateY(0);
      opacity: 1;
    }

    .glow-active {
      outline: 3px solid #2563eb !important;
      outline-offset: 3px;
      box-shadow: 0 0 25px rgba(37, 99, 235, 0.35) !important;
      transition: all 0.3s ease;
    }

    .toast-popup {
      position: absolute;
      top: 85px;
      right: 45px;
      z-index: 85000;
      background: #10b981;
      color: white;
      font-weight: bold;
      font-size: 14px;
      padding: 14px 24px;
      border-radius: 14px;
      box-shadow: 0 15px 30px rgba(16, 185, 129, 0.35);
      transform: translateY(-80px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toast-popup.active {
      transform: translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body class="flex flex-col h-screen select-none">

  <!-- VIRTUAL MOUSE CURSOR -->
  <div id="virtual-cursor">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M4 3L11.5 21L14.5 13.5L22 10.5L4 3Z" fill="#2563eb" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  </div>

  <!-- FLOATING STEP OVERLAY -->
  <div id="step-overlay">
    <div class="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0" id="step-number">1</div>
    <div>
      <div class="text-xs uppercase tracking-widest text-blue-400 font-bold" id="step-urdu-title">مرحلہ 1 - Step 1</div>
      <div class="text-lg font-black text-slate-100" id="step-desc">Open Feature Screen</div>
    </div>
  </div>

  <!-- TOAST NOTIFICATION -->
  <div id="live-toast" class="toast-popup">
    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
    <span id="toast-text">Action Completed Successfully!</span>
  </div>

  <!-- REAL TOP NAVBAR -->
  <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-40">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20 text-base">
          TD
        </div>
        <div>
          <h1 class="text-lg font-black text-blue-600 tracking-tight leading-none flex items-center gap-2">
            TaleemiDunya
          </h1>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 font-mono text-[9px] font-black tracking-wider flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              v2.5.0 PRO • AI CLOUD SYNC
            </span>
            <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              • SCHOOL ADMIN | ID: 17408
            </span>
          </div>
        </div>
      </div>

      <div class="hidden xl:flex items-center justify-between gap-3 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl w-64 ml-4">
        <div class="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <span>Search students, records...</span>
        </div>
        <kbd class="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-500 font-bold">⌘K</kbd>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs">
        <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        <span>Install App</span>
      </div>

      <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs">
        <span>⚡ Shortcuts</span>
      </div>

      <div class="flex items-center gap-2 pl-3 border-l border-slate-200">
        <div class="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
          AH
        </div>
        <div>
          <div class="text-xs font-bold text-slate-800 leading-tight">Admin - Smart Angels</div>
          <div class="text-[10px] text-slate-500 font-semibold">School Admin</div>
        </div>
      </div>
    </div>
  </header>

  <!-- MAIN WRAPPER (SIDEBAR + LIVE CONTENT) -->
  <div class="flex flex-1 overflow-hidden">
    
    <!-- REAL SIDEBAR -->
    <aside class="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
      
      <!-- School Branding Badge -->
      <div class="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <div class="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-black text-sm">
          SA
        </div>
        <div class="overflow-hidden">
          <div class="text-xs font-black text-slate-800 truncate">Smart Angels Grammar...</div>
          <div class="text-[10px] text-blue-600 font-bold">v2.5.0 PRO</div>
        </div>
      </div>

      <!-- Quick Search Filter -->
      <div class="px-4 py-2">
        <input type="text" placeholder="Filter allowed features..." class="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-blue-500">
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-1 px-4 pb-2 border-b border-slate-100 text-[11px] font-bold text-slate-500">
        <span class="px-2 py-0.5 rounded bg-blue-600 text-white">All</span>
        <span class="px-2 py-0.5 rounded hover:bg-slate-100">Core</span>
        <span class="px-2 py-0.5 rounded hover:bg-slate-100">Student</span>
        <span class="px-2 py-0.5 rounded hover:bg-slate-100">Staff</span>
      </div>

      <!-- Sidebar Menu Tree -->
      <nav class="p-3 space-y-3.5 flex-1 text-xs font-semibold text-slate-600">
        
        <div>
          <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider px-2 mb-1 flex items-center justify-between">
            <span>DASHBOARD & CORE</span>
            <span class="text-rose-500 text-[8px]">▶</span>
          </div>
          <div class="space-y-0.5">
            <div id="nav-dashboard" class="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'dashboard' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              <span>Executive Dashboard</span>
            </div>
            <div id="nav-copilot" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 cursor-pointer">
              <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <span>AI School Copilot</span>
            </div>
          </div>
        </div>

        <div>
          <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider px-2 mb-1 flex items-center justify-between">
            <span>STUDENT MANAGEMENT</span>
            <span class="text-slate-400 text-[10px]">▼</span>
          </div>
          <div class="space-y-0.5">
            <div id="nav-addstudent" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'addstudent' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Add Student & ID Cards</span>
            </div>
            <div id="nav-familytree" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'familytree' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <span>Family Tree / Siblings</span>
            </div>
          </div>
        </div>

        <div>
          <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider px-2 mb-1 flex items-center justify-between">
            <span>Student Attendance</span>
            <span class="text-slate-400 text-[10px]">▲</span>
          </div>
          <div class="space-y-0.5">
            <div id="nav-attendance" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'attendance' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
              <span>Daily Attendance</span>
            </div>
            <div id="nav-qr" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'qr' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
              <span>2D QR & Barcode Machine</span>
            </div>
          </div>
        </div>

        <div>
          <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider px-2 mb-1">FEE MANAGEMENT</div>
          <div class="space-y-0.5">
            <div id="nav-vouchers" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'vouchers' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <span>3-Part Fee Vouchers</span>
            </div>
          </div>
        </div>

        <div>
          <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider px-2 mb-1">ACADEMICS & EXAMS</div>
          <div class="space-y-0.5">
            <div id="nav-timetable" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'timetable' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>Timetable & Daily Diary</span>
            </div>
            <div id="nav-exams" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'exams' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Exams & Marksheet Cards</span>
            </div>
          </div>
        </div>

        <div>
          <div class="text-[10px] uppercase font-black text-slate-400 tracking-wider px-2 mb-1">STAFF & BACKUP</div>
          <div class="space-y-0.5">
            <div id="nav-staff" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'staff' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <span>Staff & Payroll Directory</span>
            </div>
            <div id="nav-cloud" class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer ${moduleConfig.activeNav === 'cloud' ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200' : 'hover:bg-slate-100'}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
              <span>Cloud Backup & WhatsApp</span>
            </div>
          </div>
        </div>

      </nav>

      <!-- Sidebar Footer Badge -->
      <div class="p-3 border-t border-slate-200 bg-slate-50">
        <div class="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
          <div class="flex items-center justify-between text-[11px] font-black">
            <span>PREMIUM PLAN</span>
            <span class="px-1.5 py-0.5 rounded bg-white/20 text-[9px]">43/36 Active</span>
          </div>
          <button class="w-full mt-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold border border-white/20 flex items-center justify-center gap-1">
            <span>⚡ ONLINE PAY & ADD-ONS</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- LIVE CONTENT WORKSPACE -->
    <main class="flex-1 overflow-y-auto p-8 bg-[#f8fafc]" id="live-viewport">
      ${moduleConfig.contentHtml}
    </main>

  </div>

  <!-- SCRIPT FOR VIRTUAL CURSOR AND STEP ANIMATIONS -->
  <script>
    const cursor = document.getElementById('virtual-cursor');
    const overlay = document.getElementById('step-overlay');
    const stepNum = document.getElementById('step-number');
    const stepTitle = document.getElementById('step-urdu-title');
    const stepDesc = document.getElementById('step-desc');
    const toast = document.getElementById('live-toast');
    const toastText = document.getElementById('toast-text');

    function moveMouseTo(x, y, duration = 650) {
      return new Promise(resolve => {
        cursor.style.transition = \`all \${duration}ms cubic-bezier(0.25, 1, 0.5, 1)\`;
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
        setTimeout(resolve, duration);
      });
    }

    function clickMouse() {
      return new Promise(resolve => {
        const rect = cursor.getBoundingClientRect();
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = (rect.left + 5) + 'px';
        ripple.style.top = (rect.top + 5) + 'px';
        document.body.appendChild(ripple);
        setTimeout(() => {
          ripple.remove();
          resolve();
        }, 300);
      });
    }

    function showStep(num, urdu, desc) {
      stepNum.innerText = num;
      stepTitle.innerText = urdu;
      stepDesc.innerText = desc;
      overlay.classList.add('active');
    }

    function hideStep() {
      overlay.classList.remove('active');
    }

    function triggerToast(msg) {
      toastText.innerText = msg;
      toast.classList.add('active');
      setTimeout(() => {
        toast.classList.remove('active');
      }, 3500);
    }

    window.addEventListener('DOMContentLoaded', async () => {
      cursor.style.left = '350px';
      cursor.style.top = '120px';
      ${moduleConfig.scriptLogic}
    });
  </script>
</body>
</html>`;
}

// 8 Modules with authentic TaleemiDunya software interfaces & live interactions
const MODULES = [
  // 1: Dashboard
  {
    fileName: '01_Dashboard_And_Core_Overview.mp4',
    title: 'Executive Dashboard & Live Stats',
    activeNav: 'dashboard',
    durationMs: 11000,
    contentHtml: `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black text-slate-800">Executive School Dashboard</h2>
            <p class="text-xs text-slate-500 font-semibold mt-1">Smart Angels Grammar School • Live Administration Centre</p>
          </div>
          <div class="flex items-center gap-3">
            <button class="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700" id="btn-quick-admission">
              <span>+ Quick Admission</span>
            </button>
            <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700" id="btn-collect-fee">
              <span>Collect Fee</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-5">
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm" id="card-students">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</span>
            <div class="text-3xl font-black text-slate-800 mt-2">43 Students</div>
            <div class="text-xs text-emerald-600 font-bold mt-1">↑ +12% active this session</div>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm" id="card-fee">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Collected</span>
            <div class="text-3xl font-black text-slate-800 mt-2">Rs. 185,400</div>
            <div class="text-xs text-emerald-600 font-bold mt-1">92% Recovery Rate</div>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm" id="card-att">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Today Attendance</span>
            <div class="text-3xl font-black text-slate-800 mt-2">96.8%</div>
            <div class="text-xs text-purple-600 font-bold mt-1">41 Present / 2 Absent</div>
          </div>
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm" id="card-staff">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff On Duty</span>
            <div class="text-3xl font-black text-slate-800 mt-2">12 / 12 Staff</div>
            <div class="text-xs text-amber-600 font-bold mt-1">Biometric Verified</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="table-students">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="text-sm font-black text-slate-800">Recent Student Admissions</h3>
            <span class="text-xs text-blue-600 font-bold">43 Active Students</span>
          </div>
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-400 uppercase text-[10px] font-black">
              <tr>
                <th class="p-3 pl-5">Student Name</th>
                <th class="p-3">Roll No</th>
                <th class="p-3">Father & CNIC</th>
                <th class="p-3">Class</th>
                <th class="p-3">Fee</th>
                <th class="p-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
              <tr>
                <td class="p-3 pl-5 font-bold text-slate-900">Umar Hayat</td>
                <td class="p-3 font-mono font-bold text-blue-600">Roll: 8</td>
                <td class="p-3">Ayan <span class="text-slate-400 text-[10px] font-mono">(42201-7016279-1)</span></td>
                <td class="p-3"><span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">8th - A</span></td>
                <td class="p-3 font-bold">Rs. 4,500</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Active</span></td>
              </tr>
              <tr>
                <td class="p-3 pl-5 font-bold text-slate-900">Hayat</td>
                <td class="p-3 font-mono font-bold text-blue-600">Roll: 10</td>
                <td class="p-3">Ayan <span class="text-slate-400 text-[10px] font-mono">(42201-7016279-1)</span></td>
                <td class="p-3"><span class="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">7th - A</span></td>
                <td class="p-3 font-bold">Rs. 1,000</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Active</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
    scriptLogic: `
      (async () => {
        await new Promise(r => setTimeout(r, 600));
        showStep(1, "ڈیش بورڈ جائزہ - Overview", "Live school summary: students, fees, attendance & biometric staff");
        await moveMouseTo(420, 260, 900);
        document.getElementById('card-students').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 1800));

        showStep(2, "فیس ریکوری اور اعداد و شمار - Fee Stats", "Total collected fee and real-time 92% recovery tracking");
        await moveMouseTo(700, 260, 800);
        document.getElementById('card-students').classList.remove('glow-active');
        document.getElementById('card-fee').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 1800));

        showStep(3, "فوری داخلہ بٹن - Quick Admission", "Single-click admission button from top navigation header");
        document.getElementById('card-fee').classList.remove('glow-active');
        await moveMouseTo(1680, 130, 900);
        await clickMouse();
        document.getElementById('btn-quick-admission').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 1600));

        showStep(4, "طلباء کی لسٹ - Active Student List", "Verified student profiles with Father Name, CNIC and Monthly Fee");
        document.getElementById('btn-quick-admission').classList.remove('glow-active');
        await moveMouseTo(650, 520, 900);
        document.getElementById('table-students').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2200));
        hideStep();
      })();
    `
  },

  // 2: Student Admissions & ID Cards
  {
    fileName: '02_Student_Admissions_And_ID_Cards.mp4',
    title: 'Student Admissions & Digital ID Cards',
    activeNav: 'addstudent',
    durationMs: 12000,
    contentHtml: `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black text-slate-800">New Student Admission & ID Card</h2>
            <p class="text-xs text-slate-500 font-semibold mt-1">Register student and generate instant printable Barcode ID card</p>
          </div>
          <button class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700" id="btn-save-admission">
            <span>💾 Save Admission & Print Card</span>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <!-- Form Section -->
          <div class="col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="form-admission">
            <h3 class="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Student & Parent Particulars</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Student Full Name *</label>
                <input type="text" id="inp-name" value="Muhammad Zayan" class="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Roll Number *</label>
                <input type="text" id="inp-roll" value="14" class="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Father Name *</label>
                <input type="text" id="inp-father" value="Tariq Mehmood" class="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Father CNIC *</label>
                <input type="text" id="inp-cnic" value="42101-9876543-1" class="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Class & Section *</label>
                <select id="inp-class" class="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none">
                  <option>9th - Computer Science (Sec A)</option>
                  <option>10th - Science (Sec A)</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Monthly Tuition Fee (Rs) *</label>
                <input type="text" id="inp-fee" value="4,000" class="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none font-bold text-emerald-700">
              </div>
            </div>
          </div>

          <!-- Live Digital ID Card Preview -->
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center justify-between" id="card-preview">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider self-start">Live ID Card Preview</span>
            
            <div class="w-64 bg-gradient-to-b from-blue-700 to-blue-900 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden mt-2">
              <div class="text-[10px] font-black uppercase tracking-wider">Smart Angels Grammar School</div>
              <div class="text-[8px] opacity-80">Govt. Recognized • Karachi</div>
              
              <div class="w-20 h-20 mx-auto my-3 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-2xl font-black shadow-inner">
                MZ
              </div>
              
              <div class="text-sm font-black text-white">Muhammad Zayan</div>
              <div class="text-xs text-amber-300 font-bold">Class 9th (Sec A) • Roll: 14</div>
              
              <div class="mt-3 p-1.5 bg-white rounded-lg flex flex-col items-center">
                <div class="font-mono text-[9px] font-black tracking-widest text-slate-900">||| ||||| ||| |||| |||</div>
                <div class="text-[8px] font-mono font-bold text-slate-500">ID: 17408-014</div>
              </div>
            </div>

            <button class="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5">
              <span>🖨️ Print PVC ID Card</span>
            </button>
          </div>
        </div>
      </div>
    `,
    scriptLogic: `
      (async () => {
        await new Promise(r => setTimeout(r, 600));
        showStep(1, "طالب علم کی تفصیلات درج کریں - Enter Details", "Fill student name, roll number, class and monthly tuition fee");
        await moveMouseTo(600, 280, 900);
        document.getElementById('form-admission').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2000));

        showStep(2, "والد کا نام اور CNIC - Father CNIC Verification", "Matching Father Name + CNIC groups siblings automatically in Family Tree");
        await moveMouseTo(600, 360, 800);
        await new Promise(r => setTimeout(r, 1800));

        showStep(3, "لائیو ڈیجیٹل بارکوڈ کارڈ - Live ID Card Preview", "Instant 2D QR and Barcode enabled student card ready to print");
        document.getElementById('form-admission').classList.remove('glow-active');
        await moveMouseTo(1600, 380, 900);
        document.getElementById('card-preview').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2000));

        showStep(4, "داخلہ محفوظ کریں - Save Admission", "Student saved in directory and cloud syncs automatically");
        document.getElementById('card-preview').classList.remove('glow-active');
        await moveMouseTo(1680, 130, 800);
        await clickMouse();
        document.getElementById('btn-save-admission').classList.add('glow-active');
        triggerToast("✅ Muhammad Zayan Enrolled! ID Card Ready for Print.");
        await new Promise(r => setTimeout(r, 2500));
        hideStep();
      })();
    `
  },

  // 3: Attendance & 2D QR Gate Scanner
  {
    fileName: '03_Student_Attendance_And_QR_Gate_Scanner.mp4',
    title: 'Daily Attendance & QR Gate Scanner',
    activeNav: 'qr',
    durationMs: 12000,
    contentHtml: `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black text-slate-800">2D QR & Barcode Attendance Machine</h2>
            <p class="text-xs text-slate-500 font-semibold mt-1">High-speed gate scanner with automatic parent WhatsApp arrival notifications</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Gate Camera Connected
            </span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- Live QR Camera Scanner HUD -->
          <div class="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col items-center justify-between h-[450px]" id="qr-hud">
            <div class="w-full flex items-center justify-between text-xs text-slate-400">
              <span class="font-mono text-emerald-400 font-bold">● SCANNER ACTIVE (60 FPS)</span>
              <span>Class 9th - Morning Gate</span>
            </div>

            <!-- Targeting Box -->
            <div class="relative w-72 h-72 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-center p-4">
              <!-- Corner brackets -->
              <div class="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-400"></div>
              <div class="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-400"></div>
              <div class="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-400"></div>
              <div class="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-400"></div>
              
              <!-- Red Laser Beam Animation -->
              <div class="absolute w-full h-0.5 bg-red-500 shadow-[0_0_15px_#ef4444] animate-bounce"></div>

              <!-- Student Card Being Scanned -->
              <div class="w-48 bg-white text-slate-900 rounded-xl p-3 shadow-2xl text-center transform scale-95" id="scanned-card">
                <div class="text-[9px] font-black text-blue-600 uppercase">Smart Angels Grammar</div>
                <div class="text-xs font-black mt-1">Umar Hayat</div>
                <div class="text-[10px] text-slate-500 font-bold">Roll: 8 • Class 8th-A</div>
                <div class="w-16 h-16 bg-slate-900 rounded-lg mx-auto my-1.5 flex items-center justify-center text-white text-[9px] font-mono">
                  [QR CODE]
                </div>
              </div>
            </div>

            <!-- Instant Verification Banner -->
            <div class="w-full bg-emerald-600/30 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs font-bold" id="scan-result">
              <span class="text-emerald-300">⚡ Verified: Umar Hayat (Roll #8)</span>
              <span class="text-white font-mono">08:02:14 AM</span>
            </div>
          </div>

          <!-- Real Time Attendance Register Feed -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4" id="reg-feed">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-sm font-black text-slate-800">Live Attendance Log</h3>
              <span class="text-xs text-slate-500 font-bold">41 Present / 2 Absent</span>
            </div>

            <div class="space-y-2.5">
              <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div class="text-xs font-black text-slate-800">Umar Hayat (Roll 8)</div>
                  <div class="text-[10px] text-emerald-700 font-bold">Class 8th-A • Scanned via Gate QR</div>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-black">PRESENT</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div class="text-xs font-black text-slate-800">Hayat (Roll 10)</div>
                  <div class="text-[10px] text-slate-500 font-bold">Class 7th-A • Scanned via Gate QR</div>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-black">PRESENT</span>
              </div>
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div>
                  <div class="text-xs font-black text-slate-800">Zeeshan (Roll 15)</div>
                  <div class="text-[10px] text-rose-700 font-bold">Class 9th-A • Not arrived</div>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-black">ABSENT</span>
              </div>
            </div>

            <button class="w-full mt-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20" id="btn-whatsapp-sms">
              <span>📲 Send Absent WhatsApp Alerts to Parents</span>
            </button>
          </div>
        </div>
      </div>
    `,
    scriptLogic: `
      (async () => {
        await new Promise(r => setTimeout(r, 600));
        showStep(1, "2D کیو آر گیٹ سکینر - Fast Barcode Scanning", "Students scan their ID card at gate camera for 1-second check-in");
        await moveMouseTo(580, 320, 900);
        document.getElementById('qr-hud').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2000));

        showStep(2, "فوری تصدیق اور حاضری - Instant Attendance Marked", "Green confirmation beep marks student present in cloud registry");
        await moveMouseTo(580, 500, 800);
        document.getElementById('scan-result').classList.add('glow-active');
        triggerToast("✅ Beep! Umar Hayat (Roll 8) marked Present at 08:02 AM");
        await new Promise(r => setTimeout(r, 2200));

        showStep(3, "حاضری رجسٹر فیڈ - Real-Time Attendance Register", "Live monitoring of present, late, and absent students across classes");
        document.getElementById('qr-hud').classList.remove('glow-active');
        document.getElementById('scan-result').classList.remove('glow-active');
        await moveMouseTo(1400, 320, 900);
        document.getElementById('reg-feed').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2000));

        showStep(4, "والدین کو واٹس ایپ الرٹ - WhatsApp Absence SMS", "Send instant automated absence notification to parents with one click");
        await moveMouseTo(1400, 500, 800);
        await clickMouse();
        triggerToast("📲 WhatsApp Absence Messages Sent to 2 Parents!");
        await new Promise(r => setTimeout(r, 2400));
        hideStep();
      })();
    `
  },

  // 4: Fee Challans & Collection
  {
    fileName: '04_Fee_Challans_Collection_And_Ledgers.mp4',
    title: '3-Part Fee Vouchers & Collection',
    activeNav: 'vouchers',
    durationMs: 12000,
    contentHtml: `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black text-slate-800">3-Part Bank Fee Voucher & Collection</h2>
            <p class="text-xs text-slate-500 font-semibold mt-1">Official printable 3-copy fee voucher (Bank, School, Student) with QR payment</p>
          </div>
          <div class="flex items-center gap-3">
            <button class="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700" id="btn-print-challan">
              <span>🖨️ Print Batch Vouchers</span>
            </button>
            <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700" id="btn-quick-collect">
              <span>💵 Receive Cash Fee</span>
            </button>
          </div>
        </div>

        <!-- 3-PART VOUCHER LAYOUT -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" id="voucher-container">
          <div class="grid grid-cols-3 gap-4 divide-x divide-slate-200 text-xs">
            
            <!-- COPY 1: BANK COPY -->
            <div class="pr-4 space-y-3">
              <div class="text-center border-b border-slate-100 pb-2">
                <div class="font-black text-blue-700 text-sm">SMART ANGELS GRAMMAR</div>
                <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">BANK COPY • A/C: 1048-0021-998</div>
              </div>
              <div class="flex justify-between font-bold text-slate-600 text-[11px]">
                <span>Challan #: <b class="text-slate-900 font-mono">CH-8419</b></span>
                <span>Due: <b class="text-rose-600">10-Nov-2026</b></span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl space-y-1">
                <div class="text-slate-800 font-black">Umar Hayat (Roll 8)</div>
                <div class="text-slate-500 text-[10px]">Father: Ayan | Class 8th-A</div>
              </div>
              <div class="space-y-1 text-slate-600 text-[11px]">
                <div class="flex justify-between"><span>Tuition Fee</span><span class="font-bold">Rs. 4,000</span></div>
                <div class="flex justify-between"><span>Exam & Lab Fee</span><span class="font-bold">Rs. 500</span></div>
                <div class="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900 text-xs">
                  <span>Total Payable:</span><span class="text-blue-700 font-mono">Rs. 4,500</span>
                </div>
              </div>
              <div class="pt-2 text-center text-[9px] text-slate-400">Cashier Signature & Stamp</div>
            </div>

            <!-- COPY 2: SCHOOL COPY -->
            <div class="px-4 space-y-3">
              <div class="text-center border-b border-slate-100 pb-2">
                <div class="font-black text-blue-700 text-sm">SMART ANGELS GRAMMAR</div>
                <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">SCHOOL ACCOUNTS COPY</div>
              </div>
              <div class="flex justify-between font-bold text-slate-600 text-[11px]">
                <span>Challan #: <b class="text-slate-900 font-mono">CH-8419</b></span>
                <span>Due: <b class="text-rose-600">10-Nov-2026</b></span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl space-y-1">
                <div class="text-slate-800 font-black">Umar Hayat (Roll 8)</div>
                <div class="text-slate-500 text-[10px]">Father: Ayan | Class 8th-A</div>
              </div>
              <div class="space-y-1 text-slate-600 text-[11px]">
                <div class="flex justify-between"><span>Tuition Fee</span><span class="font-bold">Rs. 4,000</span></div>
                <div class="flex justify-between"><span>Exam & Lab Fee</span><span class="font-bold">Rs. 500</span></div>
                <div class="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900 text-xs">
                  <span>Total Payable:</span><span class="text-blue-700 font-mono">Rs. 4,500</span>
                </div>
              </div>
              <div class="pt-2 text-center text-[9px] text-slate-400">Accounts Officer Signature</div>
            </div>

            <!-- COPY 3: STUDENT COPY -->
            <div class="pl-4 space-y-3">
              <div class="text-center border-b border-slate-100 pb-2">
                <div class="font-black text-blue-700 text-sm">SMART ANGELS GRAMMAR</div>
                <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">STUDENT / PARENT COPY</div>
              </div>
              <div class="flex justify-between font-bold text-slate-600 text-[11px]">
                <span>Challan #: <b class="text-slate-900 font-mono">CH-8419</b></span>
                <span>Due: <b class="text-rose-600">10-Nov-2026</b></span>
              </div>
              <div class="bg-slate-50 p-2.5 rounded-xl space-y-1">
                <div class="text-slate-800 font-black">Umar Hayat (Roll 8)</div>
                <div class="text-slate-500 text-[10px]">Father: Ayan | Class 8th-A</div>
              </div>
              <div class="space-y-1 text-slate-600 text-[11px]">
                <div class="flex justify-between"><span>Tuition Fee</span><span class="font-bold">Rs. 4,000</span></div>
                <div class="flex justify-between"><span>Exam & Lab Fee</span><span class="font-bold">Rs. 500</span></div>
                <div class="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900 text-xs">
                  <span>Total Payable:</span><span class="text-blue-700 font-mono">Rs. 4,500</span>
                </div>
              </div>
              <div class="pt-2 text-center text-[9px] text-slate-400">Paid Receipt Verified</div>
            </div>

          </div>
        </div>
      </div>
    `,
    scriptLogic: `
      (async () => {
        await new Promise(r => setTimeout(r, 600));
        showStep(1, "تین حصوں والا بینک فیس واؤچر - 3-Part Voucher", "Standard 3-Copy voucher layout: Bank Copy, School Copy and Student Copy");
        await moveMouseTo(800, 320, 900);
        document.getElementById('voucher-container').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2200));

        showStep(2, "فیس کی بریک ڈاؤن - Fee Particulars Breakdown", "Itemized breakdown of tuition fee, exam fee, late charges and net total");
        await moveMouseTo(500, 420, 800);
        await new Promise(r => setTimeout(r, 1800));

        showStep(3, "ایک کلک میں پرنٹ - One-Click Batch Print", "Print vouchers for entire class or individual students instantly");
        document.getElementById('voucher-container').classList.remove('glow-active');
        await moveMouseTo(1450, 130, 900);
        await clickMouse();
        document.getElementById('btn-print-challan').classList.add('glow-active');
        triggerToast("🖨️ Generating PDF: 43 Student Vouchers Ready for Print!");
        await new Promise(r => setTimeout(r, 2000));

        showStep(4, "کاؤنٹر فیس کلیکشن - Quick Cash Collection", "Enter student roll number to receive fee and print instant receipt");
        document.getElementById('btn-print-challan').classList.remove('glow-active');
        await moveMouseTo(1680, 130, 800);
        await clickMouse();
        document.getElementById('btn-quick-collect').classList.add('glow-active');
        triggerToast("💵 Fee Received: Rs. 4,500 - Receipt #REC-8419 Issued");
        await new Promise(r => setTimeout(r, 2400));
        hideStep();
      })();
    `
  },

  // 5: Academics & Timetable Builder
  {
    fileName: '05_Academics_Timetable_And_Daily_Diary.mp4',
    title: 'Timetable Builder & Daily Diary',
    activeNav: 'timetable',
    durationMs: 11000,
    contentHtml: `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black text-slate-800">Class Timetable & Daily Diary Hub</h2>
            <p class="text-xs text-slate-500 font-semibold mt-1">Weekly period scheduling and WhatsApp homework diary broadcast</p>
          </div>
          <button class="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700" id="btn-broadcast-diary">
            <span>📲 Broadcast Today Diary to Parents</span>
          </button>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5" id="timetable-grid">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-black text-slate-800">Class 9th - Weekly Schedule (Mon - Fri)</h3>
            <span class="text-xs text-blue-600 font-bold">Periods: 8:00 AM - 1:30 PM</span>
          </div>

          <table class="w-full text-center text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead class="bg-slate-50 text-slate-600 font-black">
              <tr>
                <th class="p-3 border-r border-slate-200">Day</th>
                <th class="p-3 border-r border-slate-200">P1 (08:15)</th>
                <th class="p-3 border-r border-slate-200">P2 (09:00)</th>
                <th class="p-3 border-r border-slate-200">P3 (09:45)</th>
                <th class="p-3 border-r border-slate-200 bg-amber-50 text-amber-800">BREAK</th>
                <th class="p-3 border-r border-slate-200">P4 (11:00)</th>
                <th class="p-3">P5 (11:45)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 font-semibold text-slate-700">
              <tr>
                <td class="p-3 font-black bg-slate-50 border-r border-slate-200">Monday</td>
                <td class="p-3 border-r border-slate-200"><span class="px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold">English (Sir Bilal)</span></td>
                <td class="p-3 border-r border-slate-200"><span class="px-2 py-1 rounded bg-purple-50 text-purple-700 font-bold">Math (Sir Kamran)</span></td>
                <td class="p-3 border-r border-slate-200"><span class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold">Physics (Miss Sana)</span></td>
                <td class="p-3 border-r border-slate-200 bg-amber-50 font-bold text-amber-700">Recess</td>
                <td class="p-3 border-r border-slate-200"><span class="px-2 py-1 rounded bg-rose-50 text-rose-700 font-bold">Chemistry</span></td>
                <td class="p-3"><span class="px-2 py-1 rounded bg-cyan-50 text-cyan-700 font-bold">Computer Lab</span></td>
              </tr>
              <tr>
                <td class="p-3 font-black bg-slate-50 border-r border-slate-200">Tuesday</td>
                <td class="p-3 border-r border-slate-200"><span class="px-2 py-1 rounded bg-purple-50 text-purple-700 font-bold">Math (Sir Kamran)</span></td>
                <td class="p-3 border-r border-slate-200"><span class="px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold">English (Sir Bilal)</span></td>
                <td class="p-3 border-r border-slate-200"><span class="px-2 py-1 rounded bg-amber-50 text-amber-700 font-bold">Islamiat</span></td>
                <td class="p-3 border-r border-slate-200 bg-amber-50 font-bold text-amber-700">Recess</td>
                <td class="p-3 border-r border-slate-200"><span class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold">Physics</span></td>
                <td class="p-3"><span class="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-bold">Urdu Adab</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
    scriptLogic: `
      (async () => {
        await new Promise(r => setTimeout(r, 600));
        showStep(1, "ہفتہ وار ٹائم ٹیبل مینیجر - Timetable Builder", "Easily assign periods, subject teachers and recess breaks per class");
        await moveMouseTo(800, 320, 900);
        document.getElementById('timetable-grid').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2200));

        showStep(2, "پیریڈز اور اساتذہ کا شیڈول - Subject Schedule", "Automatic conflict detection prevents two classes sharing the same teacher");
        await moveMouseTo(600, 400, 800);
        await new Promise(r => setTimeout(r, 2000));

        showStep(3, "روزانہ کی ڈائری واٹس ایپ براڈکاسٹ - Broadcast Diary", "Send daily homework and announcements directly to parents via WhatsApp");
        document.getElementById('timetable-grid').classList.remove('glow-active');
        await moveMouseTo(1650, 130, 900);
        await clickMouse();
        document.getElementById('btn-broadcast-diary').classList.add('glow-active');
        triggerToast("📲 Daily Homework Diary broadcasted to 43 Parents!");
        await new Promise(r => setTimeout(r, 2400));
        hideStep();
      })();
    `
  },

  // 6: Exams & Marksheets
  {
    fileName: '06_Exam_Management_And_Marksheets.mp4',
    title: 'Exams & Marksheet Report Cards',
    activeNav: 'exams',
    durationMs: 11500,
    contentHtml: `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black text-slate-800">Exam Marks & Position Report Cards</h2>
            <p class="text-xs text-slate-500 font-semibold mt-1">Automatic grading, percentage calculation, position ranking & printable marksheet</p>
          </div>
          <button class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700" id="btn-print-report">
            <span>🖨️ Print Student Report Card</span>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <!-- Marks Table -->
          <div class="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4" id="marks-table">
            <h3 class="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Mid-Term Examination Marks Entry (Class 8th-A)</h3>
            
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th class="p-2.5">Subject</th>
                  <th class="p-2.5">Total Marks</th>
                  <th class="p-2.5">Obtained</th>
                  <th class="p-2.5">Grade</th>
                  <th class="p-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
                <tr><td class="p-2.5 font-bold">English</td><td class="p-2.5">100</td><td class="p-2.5 text-blue-700 font-black">88</td><td class="p-2.5"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">A+</span></td><td class="p-2.5 text-slate-500">Excellent</td></tr>
                <tr><td class="p-2.5 font-bold">Mathematics</td><td class="p-2.5">100</td><td class="p-2.5 text-blue-700 font-black">94</td><td class="p-2.5"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">A+</span></td><td class="p-2.5 text-slate-500">Outstanding</td></tr>
                <tr><td class="p-2.5 font-bold">General Science</td><td class="p-2.5">100</td><td class="p-2.5 text-blue-700 font-black">90</td><td class="p-2.5"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">A+</span></td><td class="p-2.5 text-slate-500">Very Good</td></tr>
                <tr class="bg-blue-50/50 font-black text-slate-900">
                  <td class="p-2.5">Grand Total</td>
                  <td class="p-2.5">300</td>
                  <td class="p-2.5 text-blue-700">272</td>
                  <td class="p-2.5 text-emerald-700">90.6% (A+)</td>
                  <td class="p-2.5 text-blue-700">Position: 1st</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Marksheet Card Preview -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between" id="report-card-preview">
            <div class="border-2 border-slate-800 rounded-xl p-4 text-center space-y-2">
              <div class="text-[11px] font-black uppercase text-blue-800">Smart Angels Grammar School</div>
              <div class="text-[9px] font-bold text-slate-500">ANNUAL PROGRESS REPORT CARD</div>
              <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center font-black text-sm">UH</div>
              <div class="text-xs font-black text-slate-900">Umar Hayat (Roll 8)</div>
              <div class="text-[10px] text-slate-600 font-bold">Class: 8th-A • Position: <b class="text-emerald-700">1st</b></div>
              <div class="p-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-700">
                Total: 272/300 • Grade: A+ (90.6%)
              </div>
              <div class="pt-3 flex justify-between text-[8px] text-slate-400 border-t border-slate-200">
                <span>Class Teacher</span>
                <span>Principal Stamp</span>
              </div>
            </div>

            <button class="w-full mt-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100">
              Download PDF Report
            </button>
          </div>
        </div>
      </div>
    `,
    scriptLogic: `
      (async () => {
        await new Promise(r => setTimeout(r, 600));
        showStep(1, "امتحانی نمبرات درج کریں - Enter Exam Marks", "Automatic calculations for total marks, percentage and letter grade");
        await moveMouseTo(600, 320, 900);
        document.getElementById('marks-table').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2200));

        showStep(2, "پوزیشن اور رینکنگ - Automated Position Ranking", "System automatically ranks class positions (1st, 2nd, 3rd)");
        await moveMouseTo(600, 420, 800);
        await new Promise(r => setTimeout(r, 1800));

        showStep(3, "آفیشل پروگریس رپورٹ کارڈ - Official Marksheet Card", "Print-ready student report card with school seal and grading chart");
        document.getElementById('marks-table').classList.remove('glow-active');
        await moveMouseTo(1600, 340, 900);
        document.getElementById('report-card-preview').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2000));

        showStep(4, "رپورٹ کارڈ پرنٹ کریں - Print Report Cards", "Print complete batch or download high-resolution PDF for parents");
        document.getElementById('report-card-preview').classList.remove('glow-active');
        await moveMouseTo(1650, 130, 800);
        await clickMouse();
        document.getElementById('btn-print-report').classList.add('glow-active');
        triggerToast("🖨️ PDF Report Card Generated for Umar Hayat (Grade A+)");
        await new Promise(r => setTimeout(r, 2400));
        hideStep();
      })();
    `
  },

  // 7: Staff & Payroll
  {
    fileName: '07_Staff_Directory_And_Payroll_Management.mp4',
    title: 'Staff Directory & Payroll Slips',
    activeNav: 'staff',
    durationMs: 11000,
    contentHtml: `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black text-slate-800">Staff Directory & Monthly Payroll Hub</h2>
            <p class="text-xs text-slate-500 font-semibold mt-1">Manage teachers, biometric attendance and generate instant printable salary slips</p>
          </div>
          <button class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700" id="btn-print-slip">
            <span>🖨️ Print Monthly Salary Slip</span>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <!-- Staff List -->
          <div class="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4" id="staff-table">
            <h3 class="text-sm font-black text-slate-800 border-b border-slate-100 pb-2">Active Teaching & Admin Staff (12 Members)</h3>
            
            <div class="space-y-3">
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm">SB</div>
                  <div>
                    <div class="text-xs font-black text-slate-900">Sir Bilal Ahmad</div>
                    <div class="text-[10px] text-slate-500 font-bold">Senior Mathematics Teacher • Full Time</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-black text-slate-900">Basic: Rs. 45,000</div>
                  <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Biometric: Present 07:55 AM</span>
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center text-sm">MS</div>
                  <div>
                    <div class="text-xs font-black text-slate-900">Miss Sana Farooq</div>
                    <div class="text-[10px] text-slate-500 font-bold">Senior Physics Lecturer • Full Time</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-black text-slate-900">Basic: Rs. 42,000</div>
                  <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Biometric: Present 07:58 AM</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Salary Slip Preview -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between" id="slip-preview">
            <div class="border border-slate-300 rounded-xl p-4 text-xs space-y-2">
              <div class="text-center border-b border-slate-200 pb-2">
                <div class="font-black text-blue-700">SMART ANGELS GRAMMAR</div>
                <div class="text-[9px] text-slate-400 font-bold uppercase">MONTHLY SALARY SLIP (NOV 2026)</div>
              </div>
              <div class="font-bold text-slate-800">Employee: Sir Bilal Ahmad</div>
              <div class="space-y-1 text-[11px] text-slate-600 pt-1">
                <div class="flex justify-between"><span>Basic Salary:</span><span class="font-bold">Rs. 45,000</span></div>
                <div class="flex justify-between"><span>Allowances:</span><span class="font-bold">Rs. 5,000</span></div>
                <div class="flex justify-between"><span>Deductions:</span><span class="font-bold">Rs. 0</span></div>
                <div class="flex justify-between border-t border-slate-200 pt-1 font-black text-slate-900">
                  <span>Net Payable:</span><span class="text-emerald-700 font-mono">Rs. 50,000</span>
                </div>
              </div>
            </div>

            <button class="w-full mt-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
              Download PDF Slip
            </button>
          </div>
        </div>
      </div>
    `,
    scriptLogic: `
      (async () => {
        await new Promise(r => setTimeout(r, 600));
        showStep(1, "اسٹاف ڈائریکٹری اور حاضری - Staff Directory", "View complete teacher profiles and daily biometric check-in log");
        await moveMouseTo(600, 320, 900);
        document.getElementById('staff-table').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2200));

        showStep(2, "ماہانہ تنخواہ سلپ - Monthly Salary Slip", "Automated payroll calculator with allowances, deductions and net pay");
        document.getElementById('staff-table').classList.remove('glow-active');
        await moveMouseTo(1600, 320, 900);
        document.getElementById('slip-preview').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2000));

        showStep(3, "تنخواہ سلپ پرنٹ کریں - Print Salary Slip", "Print professional salary slip for bank account deposit or cash voucher");
        document.getElementById('slip-preview').classList.remove('glow-active');
        await moveMouseTo(1680, 130, 800);
        await clickMouse();
        document.getElementById('btn-print-slip').classList.add('glow-active');
        triggerToast("🖨️ Salary Slip Issued: Rs. 50,000 Net Paid to Sir Bilal");
        await new Promise(r => setTimeout(r, 2400));
        hideStep();
      })();
    `
  },

  // 8: Cloud Backups & WhatsApp Bot
  {
    fileName: '08_Cloud_Backups_And_WhatsApp_AI_Bot.mp4',
    title: 'Google Drive Backups & WhatsApp AI Bot',
    activeNav: 'cloud',
    durationMs: 11500,
    contentHtml: `
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black text-slate-800">Google Drive Cloud Backups & WhatsApp Automation</h2>
            <p class="text-xs text-slate-500 font-semibold mt-1">Automatic encrypted cloud storage sync and 24/7 automated parent WhatsApp assistant</p>
          </div>
          <button class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700" id="btn-backup-now">
            <span>🚀 Backup All School Data Now</span>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- Google Drive Vault -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" id="vault-card">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">☁️</div>
                <h3 class="text-sm font-black text-slate-800">Google Drive Cloud Vault</h3>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">Active & Encrypted</span>
            </div>

            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div class="flex justify-between text-slate-600"><span>Last Auto Backup:</span><b class="text-slate-900">Today, 06:00 AM</b></div>
              <div class="flex justify-between text-slate-600"><span>Total Records:</span><b class="text-blue-700">1,480 Records Synced</b></div>
              <div class="flex justify-between text-slate-600"><span>Encryption Standard:</span><b class="text-emerald-700">AES-256 Military Grade</b></div>
            </div>

            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-blue-600 h-2 rounded-full w-full animate-pulse"></div>
            </div>
          </div>

          <!-- WhatsApp Bot Simulator -->
          <div class="bg-slate-900 rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between space-y-3" id="whatsapp-bot-card">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
              <span class="font-bold text-emerald-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                TaleemiDunya WhatsApp AI Bot Online
              </span>
              <span class="text-slate-500 text-[10px]">Auto-Reply Engine</span>
            </div>

            <!-- Chat Bubbles -->
            <div class="space-y-2 text-xs">
              <div class="bg-slate-800 p-2.5 rounded-xl rounded-tl-none max-w-xs self-start border border-slate-700">
                <div class="text-[10px] text-slate-400 font-bold">Parent (Ayan):</div>
                <div>Roll 8 ki fee kitni baqi hai?</div>
              </div>
              <div class="bg-emerald-700 p-2.5 rounded-xl rounded-tr-none max-w-xs ml-auto text-right shadow-md">
                <div class="text-[10px] text-emerald-200 font-bold">AI Bot:</div>
                <div>Mohtaram Ayan sb, Umar Hayat (Roll 8) ki November ki fee Rs. 4,500 due hai. Due date: 10 Nov.</div>
              </div>
            </div>

            <div class="p-2 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-slate-400 text-center font-bold">
              ⚡ 24/7 Automated Responses Without Any Human Effort
            </div>
          </div>
        </div>
      </div>
    `,
    scriptLogic: `
      (async () => {
        await new Promise(r => setTimeout(r, 600));
        showStep(1, "گوگل ڈرائیو کلاؤڈ بیک اپ - Google Drive Cloud Vault", "Automatic AES-256 encrypted backup for student, fee and exam records");
        await moveMouseTo(550, 320, 900);
        document.getElementById('vault-card').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2200));

        showStep(2, "فوری بیک اپ محفوظ کریں - Instant Backup", "One-click instant backup saves entire school database to your Google Drive");
        document.getElementById('vault-card').classList.remove('glow-active');
        await moveMouseTo(1680, 130, 800);
        await clickMouse();
        document.getElementById('btn-backup-now').classList.add('glow-active');
        triggerToast("🚀 Backup Complete: 1,480 Records Safely Stored in Google Drive!");
        await new Promise(r => setTimeout(r, 2000));

        showStep(3, "24/7 واٹس ایپ آٹو بوٹ - WhatsApp AI Assistant", "Parents can query fees, attendance and diary via WhatsApp anytime");
        document.getElementById('btn-backup-now').classList.remove('glow-active');
        await moveMouseTo(1400, 340, 900);
        document.getElementById('whatsapp-bot-card').classList.add('glow-active');
        await new Promise(r => setTimeout(r, 2500));
        hideStep();
      })();
    `
  }
];

async function generateAllLiveVideos() {
  console.log('======================================================================');
  console.log('🎬 Starting Real Live UI Video Generator for TaleemiDunya-Pro');
  console.log('📁 Output Folder:', OUTPUT_DIR);
  console.log('🎬 Total Videos to Render:', MODULES.length);
  console.log('======================================================================\n');

  const browser = await chromium.launch({ headless: true });

  for (let i = 0; i < MODULES.length; i++) {
    const mod = MODULES[i];
    console.log(`[${i + 1}/${MODULES.length}] Rendering Live UI: ${mod.fileName} (${mod.title})...`);

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: OUTPUT_DIR,
        size: { width: 1920, height: 1080 }
      }
    });

    const page = await context.newPage();
    const html = getLiveAppHtml(mod);
    await page.setContent(html);

    // Wait for the full live interaction sequence
    await page.waitForTimeout(mod.durationMs);

    const rawVideoPath = await page.video().path();
    await context.close();

    // Encode to final YouTube-ready MP4
    const targetMp4 = path.join(OUTPUT_DIR, mod.fileName);
    console.log(`   ⚙️ Encoding with FFmpeg (H.264 / AAC / YUV420P)...`);

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(FFMPEG_PATH, [
        '-y',
        '-i', rawVideoPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '19',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        targetMp4
      ]);

      ffmpeg.on('close', (code) => {
        if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath);
        if (code === 0) {
          const stats = fs.statSync(targetMp4);
          const mb = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(`   ✅ Finished: ${mod.fileName} (${mb} MB)\n`);
          resolve();
        } else {
          console.error(`   ❌ FFmpeg exited with code ${code}`);
          reject(new Error(`FFmpeg error ${code}`));
        }
      });
    });
  }

  await browser.close();
  console.log('======================================================================');
  console.log('🎉 ALL 8 REAL LIVE UI TUTORIAL VIDEOS GENERATED SUCCESSFULLY!');
  console.log('📁 Files saved in:', OUTPUT_DIR);
  console.log('======================================================================');
}

generateAllLiveVideos().catch(err => {
  console.error('Fatal generator error:', err);
  process.exit(1);
});
