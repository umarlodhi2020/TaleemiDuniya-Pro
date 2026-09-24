import React from 'react';
import QRCode from 'react-qr-code';

export const THEMES = {
  blue: {
    bg: 'bg-gradient-to-b from-[#1e3a8a] via-[#2563eb] to-[#1d4ed8]',
    text: 'text-white',
    accent: '#3b82f6',
    border: 'border-[#1e3a8a]/40',
    headerBg: 'bg-white/10',
    badge: 'bg-yellow-400 text-[#1e3a8a]',
    accentText: 'text-yellow-300'
  },
  emerald: {
    bg: 'bg-gradient-to-b from-[#064e3b] via-[#059669] to-[#047857]',
    text: 'text-white',
    accent: '#10b981',
    border: 'border-[#064e3b]/40',
    headerBg: 'bg-white/10',
    badge: 'bg-yellow-400 text-[#064e3b]',
    accentText: 'text-yellow-200'
  },
  crimson: {
    bg: 'bg-gradient-to-b from-[#7f1d1d] via-[#dc2626] to-[#b91c1c]',
    text: 'text-white',
    accent: '#ef4444',
    border: 'border-[#7f1d1d]/40',
    headerBg: 'bg-white/10',
    badge: 'bg-white text-[#7f1d1d]',
    accentText: 'text-yellow-300'
  },
  charcoal: {
    bg: 'bg-gradient-to-b from-[#111827] via-[#374151] to-[#1f2937]',
    text: 'text-white',
    accent: '#9ca3af',
    border: 'border-[#111827]/40',
    headerBg: 'bg-white/10',
    badge: 'bg-yellow-500 text-black',
    accentText: 'text-cyan-300'
  }
};

export const LAYOUTS = {
  portrait: 'Modern Portrait',
  landscape: 'Corporate Landscape',
  minimal: 'Minimal Badge',
  govt: 'Govt Board Style (PK)',
  elite: 'Elite Private School',
  madrassa: 'Islamic Academy',
  college: 'Classic College (FSc)',
  smart: 'Smart Scholar (NADRA)',
  uni: 'University/College Standard',
  tech: 'Institute of Technology',
  custom: 'Custom Canva Design'
};

// Internal Renderers
const renderPortraitCard = (st, isPrint, settings) => {
  const { schoolName, cardSubtitle, validity, principalName, stampImage, activeTheme } = settings;
  const scale = isPrint ? 'scale-[0.95]' : '';
  const width = isPrint ? 'w-[210px]' : 'w-[220px]';
  const height = isPrint ? 'h-[315px]' : 'h-[330px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} rounded-[18px] bg-white border border-gray-200 shadow-xl overflow-hidden print-card-break select-text text-black flex flex-col font-sans transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${scale} mx-auto`}>
      <div className={`h-[80px] w-full ${activeTheme.bg} p-2 flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 text-center`}>
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-10 -right-10 w-20 h-20 rounded-full bg-white/10 blur-xl" />
        
        <h3 className="text-[10px] font-black uppercase leading-tight tracking-wider text-white line-clamp-2 max-w-[95%]">
          {schoolName}
        </h3>
        <span className="text-[7.5px] font-extrabold tracking-widest uppercase bg-white/20 text-yellow-300 mt-1 py-0.5 px-2 rounded-full leading-none">
          {cardSubtitle}
        </span>
      </div>

      <div className="flex-1 px-3.5 pt-3 pb-2 flex flex-col items-center justify-between bg-white text-center">
        <div className="relative z-10 w-[72px] h-[72px] rounded-full border-[3px] border-white shadow-md bg-gray-100 flex items-center justify-center overflow-hidden -mt-10 flex-shrink-0">
          {st.profilePhoto || st.photoUrl ? (
            <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-full h-full text-gray-300 mt-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
          <span className={`absolute bottom-0 right-0 text-[6.5px] font-black px-1.5 py-0.5 rounded-full border border-white shadow ${activeTheme.badge} uppercase leading-none`}>
            {st.class || 'N/A'}
          </span>
        </div>

        <div className="w-full my-1.5 flex-1 flex flex-col justify-center">
          <h4 className="text-[12.5px] font-black text-gray-900 tracking-wide uppercase leading-tight mt-1 truncate">
            {st.name || 'N/A'}
          </h4>
          
          <div className="mt-2.5 space-y-1 text-left text-[8.5px] font-bold text-gray-700 max-w-[95%] mx-auto">
            <div className="flex justify-between border-b border-gray-100 pb-0.5">
              <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">F. Name</span>
              <span className="text-gray-800 uppercase truncate max-w-[100px]">{st.fatherName || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-0.5">
              <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Roll No</span>
              <span className="text-gray-900 font-extrabold">{st.rollNo || st.rollNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-0.5">
              <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Reg No</span>
              <span className="text-gray-800 font-mono font-black">{st.registrationNo || st.id || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="w-full flex-shrink-0 flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg p-1.5 mt-1 mb-1">
          <div className="flex-1 text-left px-1">
             <span className="block text-[6px] text-gray-400 uppercase font-black tracking-tighter leading-none mb-1">Contact</span>
             <span className="text-[7.5px] font-black text-gray-800 leading-none block">{st.phone || st.contact || 'N/A'}</span>
          </div>
          <div className="bg-white p-0.5 rounded shadow-sm border border-gray-200">
             {(st.rollNo || st.rollNumber) ? <QRCode value={String(st.rollNo || st.rollNumber)} size={32} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[8px] border border-dashed border-red-500">NO ROLL NO</div>}
          </div>
        </div>

        <div className="w-full border-t border-gray-100 pt-2 flex items-center justify-between flex-shrink-0">
          <div className="text-left">
            <span className="block text-[6px] text-gray-400 uppercase font-black tracking-tighter leading-none">Validity</span>
            <span className="text-[7.5px] font-black text-gray-800 leading-none">{validity}</span>
          </div>
          <div className="text-right relative min-w-[70px]">
            {stampImage ? (
              <img src={stampImage} alt="Stamp" className="absolute -top-10 right-0 h-12 max-w-[70px] object-contain opacity-90 select-none pointer-events-none" />
            ) : (
              <div className="absolute -top-4 right-4 text-[7px] text-gray-300 font-semibold italic border border-dashed border-gray-200 px-1 select-none pointer-events-none">STAMP</div>
            )}
            <span className="block text-[6px] text-gray-400 uppercase font-black tracking-tighter leading-none">Auth By</span>
            <span className="text-[7.5px] font-black text-gray-900 font-serif leading-none truncate max-w-[75px] block mt-0.5">{principalName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderLandscapeCard = (st, isPrint, settings) => {
  const { schoolName, cardSubtitle, validity, principalName, stampImage, activeTheme } = settings;
  const scale = '';
  const width = 'w-[340px]';
  const height = 'h-[215px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} rounded-[18px] bg-white border border-gray-200 shadow-xl overflow-hidden print-card-break select-text text-black flex font-sans transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${scale} mx-auto`}>
      <div className={`w-[90px] h-full ${activeTheme.bg} flex flex-col items-center justify-start p-2 relative overflow-hidden flex-shrink-0`}>
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-white/10 blur-xl" />
        
        <div className="relative z-10 w-[60px] h-[60px] mt-4 rounded-lg border-[2px] border-white shadow-md bg-gray-100 flex items-center justify-center overflow-hidden">
          {st.profilePhoto || st.photoUrl ? (
            <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-full h-full text-gray-300 mt-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>
        <span className={`mt-3 text-[7.5px] font-black px-2 py-0.5 rounded border border-white/20 shadow ${activeTheme.badge} uppercase text-center w-full truncate`}>
          {st.class ? `Class ${st.class}` : 'Student'}
        </span>
      </div>

      <div className="flex-1 p-3 flex flex-col bg-white">
        <div className="border-b border-gray-100 pb-2 mb-2">
          <h3 className="text-[11px] font-black uppercase leading-tight tracking-wider text-gray-900 truncate">
            {schoolName}
          </h3>
          <span className={`text-[7.5px] font-extrabold tracking-widest uppercase ${activeTheme.text.replace('text-white', 'text-gray-500')} leading-none`}>
            {cardSubtitle}
          </span>
        </div>

        <div className="flex-1 flex gap-2">
          <div className="flex-1 space-y-1 text-left text-[8.5px] font-bold text-gray-700">
            <h4 className="text-[14px] font-black text-gray-900 tracking-wide uppercase leading-tight mb-2 truncate">
              {st.name || 'N/A'}
            </h4>
            <div className="flex justify-between border-b border-gray-50 pb-0.5">
              <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Roll No</span>
              <span className="text-gray-900 font-extrabold">{st.rollNo || st.rollNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-0.5">
              <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Reg No</span>
              <span className="text-gray-800 font-mono font-black">{st.registrationNo || st.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-0.5">
              <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">F. Name</span>
              <span className="text-gray-800 uppercase truncate max-w-[80px]">{st.fatherName || 'N/A'}</span>
            </div>
            <div className="flex justify-between pb-0.5">
              <span className="text-gray-400 font-extrabold uppercase text-[7.5px]">Contact</span>
              <span className="text-gray-800">{st.phone || st.contact || 'N/A'}</span>
            </div>
          </div>

          <div className="w-[60px] flex flex-col items-center justify-between border-l border-gray-100 pl-2">
            <div className="bg-white p-0.5 rounded shadow-sm border border-gray-200">
              {(st.rollNo || st.rollNumber) ? <QRCode value={String(st.rollNo || st.rollNumber)} size={45} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[8px] border border-dashed border-red-500">NO ROLL NO</div>}
            </div>
            
            <div className="text-center w-full relative mt-2">
              {stampImage && (
                <img src={stampImage} alt="Stamp" className="absolute -top-8 left-1/2 -translate-x-1/2 h-10 max-w-[70px] object-contain opacity-90 select-none pointer-events-none" />
              )}
              <span className="block text-[5.5px] text-gray-400 uppercase font-black leading-none mt-4">Authorized By</span>
              <span className="text-[6.5px] font-black text-gray-900 font-serif leading-none truncate block mt-0.5">{principalName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderMinimalCard = (st, isPrint, settings) => {
  const { schoolName, cardSubtitle, validity, principalName, stampImage, activeTheme } = settings;
  const scale = isPrint ? 'scale-[0.95]' : '';
  const width = isPrint ? 'w-[200px]' : 'w-[210px]';
  const height = isPrint ? 'h-[335px]' : 'h-[350px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} rounded-2xl bg-white border-2 border-gray-100 shadow-lg overflow-hidden print-card-break select-text text-black flex flex-col font-sans transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${scale} mx-auto`}>
      <div className="p-3 pb-1 text-center bg-white flex-shrink-0">
        <h3 className="text-[10.5px] font-black uppercase leading-tight tracking-wide text-gray-900 line-clamp-2">
          {schoolName}
        </h3>
        <span className={`text-[7px] font-black tracking-widest uppercase mt-0.5 block ${activeTheme.text.replace('text-white', 'text-primary-600')}`}>
          {cardSubtitle}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center pt-2 pb-4 bg-gray-50/50">
        <div className={`relative w-[85px] h-[85px] rounded-full p-1 ${activeTheme.bg} mb-3 shadow-md`}>
          <div className="w-full h-full rounded-full border-[3px] border-white overflow-hidden bg-gray-100 flex items-center justify-center">
            {st.profilePhoto || st.photoUrl ? (
              <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-full h-full text-gray-300 mt-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
          </div>
        </div>
        
        <h4 className="text-[14px] font-black text-gray-900 uppercase leading-none mb-1 truncate px-2 text-center w-full">
          {st.name || 'N/A'}
        </h4>
        <span className="text-[9px] font-bold text-gray-500 uppercase">
          Class {st.class || 'N/A'}
        </span>
        <span className="text-[9px] font-bold text-gray-400 mt-0.5">
          Roll: <strong className="text-gray-700">{st.rollNo || st.rollNumber || 'N/A'}</strong>
        </span>

        <div className="mt-auto pt-4 flex flex-col items-center justify-center">
          <div className="p-1 bg-white rounded shadow-sm border border-gray-100 mb-2">
            {(st.rollNo || st.rollNumber) ? <QRCode value={String(st.rollNo || st.rollNumber)} size={50} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[8px] border border-dashed border-red-500">NO ROLL NO</div>}
          </div>
          <span className="text-[7px] font-mono text-gray-400 tracking-widest">
            ID: {st.registrationNo || st.id}
          </span>
        </div>
      </div>

      <div className={`h-[12px] w-full ${activeTheme.bg} flex-shrink-0`} />
    </div>
  );
};

const renderGovtCard = (st, isPrint, settings) => {
  const { schoolName, cardSubtitle, principalName, stampImage } = settings;
  const scale = isPrint ? 'scale-[0.95]' : '';
  const width = isPrint ? 'w-[210px]' : 'w-[220px]';
  const height = isPrint ? 'h-[315px]' : 'h-[330px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} bg-white border-2 border-green-700 overflow-hidden print-card-break select-text text-black flex flex-col font-sans transition-all duration-300 hover:scale-[1.02] ${scale} mx-auto`}>
      <div className="w-full bg-green-700 p-2 flex flex-col items-center justify-center text-center">
        <h3 className="text-[11px] font-black uppercase text-white line-clamp-2">
          {schoolName}
        </h3>
        <span className="text-[7.5px] font-bold text-green-100 uppercase mt-0.5">
          {cardSubtitle}
        </span>
      </div>

      <div className="flex-1 px-3 pt-2 pb-1 bg-white text-center flex flex-col">
        <div className="flex justify-center mb-2">
          <div className="w-[75px] h-[85px] border-2 border-gray-400 bg-gray-100 p-0.5">
            {st.profilePhoto || st.photoUrl ? (
              <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">Photo</div>
            )}
          </div>
        </div>
        
        <h4 className="text-[13px] font-bold text-black uppercase mb-1">
          {st.name || 'N/A'}
        </h4>

        <div className="text-left text-[9px] font-semibold space-y-1.5 w-full px-1">
          <div className="flex justify-between border-b border-gray-300 pb-0.5">
            <span>Father:</span> <span>{st.fatherName || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-300 pb-0.5">
            <span>Class:</span> <span>{st.class || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-300 pb-0.5">
            <span>B-Form / Reg:</span> <span>{st.registrationNo || st.id || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-300 pb-0.5">
            <span>Blood Group:</span> <span className="text-red-600 font-black">{st.bloodGroup || 'O+'}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 p-2 border-t border-gray-300 flex justify-between items-end">
        <div className="text-left text-[7px] text-gray-600">
          <strong>Emergency:</strong><br/>{st.phone || st.contact || 'N/A'}
        </div>
        <div className="text-center relative">
          {stampImage && <img src={stampImage} alt="Stamp" className="absolute -top-8 left-1/2 -translate-x-1/2 h-10 max-w-[70px] object-contain mb-1" />}
          <div className="border-t border-black text-[7px] font-bold px-2 pt-0.5 mt-4">{principalName}</div>
        </div>
      </div>
    </div>
  );
};

const renderEliteCard = (st, isPrint, settings) => {
  const { schoolName, validity, principalName, activeTheme } = settings;
  const scale = '';
  const width = 'w-[340px]';
  const height = 'h-[215px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} rounded-xl bg-white border border-gray-200 shadow-md overflow-hidden print-card-break select-text text-black flex font-sans transition-all duration-300 hover:scale-[1.02] ${scale} mx-auto`}>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full border border-gray-300 bg-gray-100 z-50"></div>
      <div className="flex-1 flex flex-col p-4 pt-5">
         <h3 className="text-[12px] font-black uppercase text-gray-900 tracking-wider mb-2">
          {schoolName}
         </h3>
         <div className="flex gap-3">
            <div className="w-[70px] h-[80px] rounded-lg overflow-hidden border border-gray-200">
               {st.profilePhoto || st.photoUrl ? (
                <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[8px] text-gray-400">Photo</div>
              )}
            </div>
            <div className="flex-1 text-[9px] font-bold text-gray-700 space-y-1">
              <h4 className="text-[14px] font-black text-gray-900 uppercase mb-1">{st.name || 'N/A'}</h4>
              <p>Class: <span className="font-black text-gray-900">{st.class || 'N/A'}</span></p>
              <p>Roll No: <span className="font-black text-gray-900">{st.rollNo || st.rollNumber || 'N/A'}</span></p>
              <p>Contact: <span className="font-black text-gray-900">{st.phone || st.contact || 'N/A'}</span></p>
            </div>
         </div>
         
         <div className="mt-auto flex justify-between items-end border-t border-gray-100 pt-2">
            <div className="text-[7.5px] text-gray-500 font-medium">
              Valid till: {validity}<br/>
              Blood Group: <span className="font-bold text-red-600">{st.bloodGroup || 'A+'}</span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black italic block">{principalName}</span>
              <span className="text-[6.5px] uppercase text-gray-400">Auth Signature</span>
            </div>
         </div>
      </div>

      <div className={`w-[60px] ${activeTheme.bg} p-2 flex flex-col items-center justify-center`}>
         <div className="bg-white p-1 rounded-md mb-2">
           {(st.rollNo || st.rollNumber) ? <QRCode value={String(st.rollNo || st.rollNumber)} size={38} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[8px] border border-dashed border-red-500">NO ROLL NO</div>}
         </div>
         <span className="text-[7px] text-white/90 font-bold tracking-widest" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)'}}>STUDENT</span>
      </div>
    </div>
  );
};

const renderMadrassaCard = (st, isPrint, settings) => {
  const { schoolName, cardSubtitle, validity } = settings;
  const scale = isPrint ? 'scale-[0.95]' : '';
  const width = isPrint ? 'w-[210px]' : 'w-[220px]';
  const height = isPrint ? 'h-[315px]' : 'h-[330px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} bg-green-50 border-4 border-green-800 rounded-lg overflow-hidden print-card-break select-text text-black flex flex-col font-serif transition-all duration-300 hover:scale-[1.02] ${scale} mx-auto`}>
      <div className="w-full bg-green-800 text-yellow-400 p-3 flex flex-col items-center justify-center text-center rounded-b-3xl border-b-4 border-yellow-500 shadow-md relative">
        <div className="absolute top-1 left-2 text-[8px]">بسم الله</div>
        <h3 className="text-[12px] font-black uppercase tracking-widest mt-2 line-clamp-2">
          {schoolName}
        </h3>
        <span className="text-[8px] font-bold text-white uppercase mt-1">
          {cardSubtitle}
        </span>
      </div>

      <div className="flex-1 px-4 pt-3 pb-1 text-center flex flex-col items-center">
        <div className="w-[65px] h-[65px] rounded-full border-2 border-yellow-500 bg-white p-0.5 overflow-hidden mb-2">
          {st.profilePhoto || st.photoUrl ? (
            <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">تصویر</div>
          )}
        </div>
        
        <h4 className="text-[14px] font-black text-green-900 uppercase mb-0.5">
          {st.name || 'N/A'}
        </h4>
        <span className="text-[9px] text-green-700 font-bold mb-2">S/O {st.fatherName || 'N/A'}</span>

        <div className="text-left text-[9px] font-bold text-green-900 space-y-1.5 w-full border-t border-green-200 pt-2">
          <div className="flex justify-between">
            <span>Darja / Class:</span> <span>{st.class || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Reg No:</span> <span>{st.registrationNo || st.id || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Rabta (Contact):</span> <span>{st.phone || st.contact || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="bg-green-800 p-1.5 text-center text-white text-[7px]">
        <div className="flex justify-between items-center px-2">
           <span>Blood: {st.bloodGroup || 'B+'}</span>
           <span className="text-yellow-400">{validity}</span>
        </div>
      </div>
    </div>
  );
};

const renderCollegeCard = (st, isPrint, settings) => {
  const { schoolName, cardSubtitle, principalName, stampImage, activeTheme } = settings;
  const scale = isPrint ? 'scale-[0.95]' : '';
  const width = isPrint ? 'w-[210px]' : 'w-[220px]';
  const height = isPrint ? 'h-[315px]' : 'h-[330px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} bg-white border border-gray-300 shadow-sm overflow-hidden print-card-break select-text text-black flex flex-col font-sans transition-all duration-300 hover:scale-[1.02] ${scale} mx-auto`}>
      <div className={`w-full p-2 text-center ${activeTheme.bg}`}>
        <h3 className="text-[12px] font-black uppercase text-white line-clamp-2">{schoolName}</h3>
      </div>
      <div className="bg-gray-800 text-white text-[7.5px] font-bold tracking-widest uppercase text-center py-0.5">
        {cardSubtitle}
      </div>

      <div className="flex-1 p-2 flex flex-col">
        <div className="flex gap-2 mb-2">
          <div className="w-[60px] h-[75px] border border-gray-300 bg-gray-50 flex-shrink-0">
            {st.profilePhoto || st.photoUrl ? (
              <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[7px] text-gray-400">Photo</div>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-end">
             <h4 className="text-[12px] font-black text-gray-900 uppercase leading-none">{st.name || 'N/A'}</h4>
             <span className="text-[8px] text-gray-600 mt-1">S/D of {st.fatherName || 'N/A'}</span>
          </div>
        </div>
        
        <div className="text-[8.5px] font-bold text-gray-800 space-y-1.5 mt-1 border-t border-gray-100 pt-2">
          <div className="grid grid-cols-[60px_1fr] gap-1">
            <span className="text-gray-500 uppercase">Roll No:</span>
            <span>{st.rollNo || st.rollNumber || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-[60px_1fr] gap-1">
            <span className="text-gray-500 uppercase">Class:</span>
            <span>{st.class || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-[60px_1fr] gap-1">
            <span className="text-gray-500 uppercase">B-Form:</span>
            <span>{st.registrationNo || st.id || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-[60px_1fr] gap-1">
            <span className="text-gray-500 uppercase">Blood Grp:</span>
            <span className="text-red-600">{st.bloodGroup || 'AB+'}</span>
          </div>
          <div className="grid grid-cols-[60px_1fr] gap-1">
            <span className="text-gray-500 uppercase">Contact:</span>
            <span>{st.phone || st.contact || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="p-2 pt-0 flex justify-end items-end relative h-10">
         {stampImage && <img src={stampImage} alt="Stamp" className="absolute bottom-6 right-2 h-12 max-w-[70px] object-contain opacity-85" />}
         <div className="border-t border-black text-[7px] font-bold px-2 pt-0.5 text-center min-w-[70px]">
           {principalName}
         </div>
      </div>
    </div>
  );
};

const renderSmartScholarCard = (st, isPrint, settings) => {
  const { schoolName, validity, principalName, activeTheme } = settings;
  const scale = '';
  const width = 'w-[340px]';
  const height = 'h-[215px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} rounded-lg bg-[#f0f4f8] border border-gray-300 shadow-sm overflow-hidden print-card-break select-text text-black flex flex-col font-sans transition-all duration-300 hover:scale-[1.02] ${scale} mx-auto`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
      <div className={`w-full p-1.5 px-3 flex justify-between items-center ${activeTheme.bg}`}>
         <div className="text-[10px] font-black uppercase text-white tracking-widest">{schoolName}</div>
         <div className="text-[7px] text-white/80 bg-black/20 px-1.5 py-0.5 rounded">{validity}</div>
      </div>
      <div className="flex-1 flex p-2 gap-3 relative z-10">
         <div className="w-[65px] flex flex-col gap-1 items-center">
            <div className="w-[60px] h-[75px] rounded border border-gray-300 bg-white p-0.5">
               {st.profilePhoto || st.photoUrl ? (
                <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover rounded-sm" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[7px] text-gray-400">Photo</div>
              )}
            </div>
            <div className="bg-white p-0.5 rounded-sm border border-gray-200 mt-1">
              {(st.rollNo || st.rollNumber) ? <QRCode value={String(st.rollNo || st.rollNumber)} size={32} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[8px] border border-dashed border-red-500">NO ROLL NO</div>}
            </div>
         </div>
         <div className="flex-1 flex flex-col">
            <div className="border-b border-gray-300 pb-1 mb-1.5">
               <h4 className="text-[14px] font-black text-gray-900 uppercase tracking-wide">{st.name || 'N/A'}</h4>
               <div className="text-[7px] font-bold text-gray-500 uppercase mt-0.5">Student Name</div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
               <div>
                  <div className="text-[10px] font-bold text-gray-900">{st.fatherName || 'N/A'}</div>
                  <div className="text-[6.5px] text-gray-500 uppercase">Father Name</div>
               </div>
               <div>
                  <div className="text-[10px] font-bold text-gray-900">{st.class || 'N/A'}</div>
                  <div className="text-[6.5px] text-gray-500 uppercase">Class/Section</div>
               </div>
               <div>
                  <div className="text-[10px] font-bold text-gray-900">{st.registrationNo || st.id || 'N/A'}</div>
                  <div className="text-[6.5px] text-gray-500 uppercase">Identity No (B-Form)</div>
               </div>
               <div>
                  <div className="text-[10px] font-bold text-red-600">{st.bloodGroup || 'O-'}</div>
                  <div className="text-[6.5px] text-gray-500 uppercase">Blood Group</div>
               </div>
            </div>
            <div className="mt-auto flex justify-between items-end border-t border-gray-200 pt-1">
               <div className="text-[7px] font-bold text-gray-800">
                  Emerg: {st.phone || st.contact || 'N/A'}
               </div>
               <div className="text-[7px] font-black italic border-b border-gray-400 px-1">
                  {principalName}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const renderUniCard = (st, isPrint, settings) => {
  const { schoolName, validity, stampImage, logoImage } = settings;
  const scale = isPrint ? 'scale-[0.95]' : '';
  const width = isPrint ? 'w-[230px]' : 'w-[240px]';
  const height = isPrint ? 'h-[360px]' : 'h-[380px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} bg-white border-2 border-gray-800 shadow-sm overflow-hidden print-card-break select-text text-black flex flex-col font-sans transition-all duration-300 hover:scale-[1.02] ${scale} mx-auto`}>
      <div className="flex items-center p-2 border-b-2 border-gray-800">
         <div className="w-[35px] h-[35px] flex-shrink-0 flex items-center justify-center border border-gray-400 bg-gray-50 mr-2">
           {logoImage ? (
              <img src={logoImage} alt="Logo" className="w-full h-full object-contain p-0.5" />
           ) : (
              <span className="text-[6px] text-gray-500 font-bold">LOGO</span>
           )}
         </div>
         <div className="flex-1 text-center pr-4">
           <h3 className="text-[11px] font-black uppercase text-gray-900 tracking-tight leading-tight">
             {schoolName.toUpperCase()}
           </h3>
           <p className="text-[8px] text-gray-700 font-bold tracking-wide mt-0.5">
             LAHORE, PAKISTAN
           </p>
         </div>
      </div>

      <div className="flex justify-center mt-3 mb-2">
         <div className="w-[85px] h-[105px] border-2 border-gray-800 bg-gray-100 p-0.5 flex flex-col items-center justify-center shadow-sm">
           {st.profilePhoto || st.photoUrl ? (
              <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
           ) : (
              <>
                <span className="text-[9px] font-bold text-gray-500">PASSPORT</span>
                <span className="text-[9px] font-bold text-gray-500">SIZE</span>
                <span className="text-[9px] font-bold text-gray-500">PHOTO</span>
              </>
           )}
         </div>
      </div>

      <div className="flex-1 px-3 mt-1">
         <div className="text-[9.5px] font-bold text-gray-900 space-y-1.5 uppercase w-full">
           <div className="flex">
              <span className="w-[75px] shrink-0">STUDENT NAME</span>
              <span className="mr-1">:</span>
              <span className="flex-1 truncate">{st.name || 'N/A'}</span>
           </div>
           <div className="flex">
              <span className="w-[75px] shrink-0">FATHER NAME</span>
              <span className="mr-1">:</span>
              <span className="flex-1 truncate">{st.fatherName || 'N/A'}</span>
           </div>
           <div className="flex">
              <span className="w-[75px] shrink-0">ROLL NO</span>
              <span className="mr-1">:</span>
              <span className="flex-1 truncate">{st.rollNo || st.rollNumber || 'N/A'}</span>
           </div>
           <div className="flex">
              <span className="w-[75px] shrink-0">PROGRAM</span>
              <span className="mr-1">:</span>
              <span className="flex-1 truncate">{st.class || 'N/A'}</span>
           </div>
           <div className="flex">
              <span className="w-[75px] shrink-0">BLOOD GROUP</span>
              <span className="mr-1">:</span>
              <span className="flex-1 truncate font-black text-red-700">{st.bloodGroup || 'O+'}</span>
           </div>
           <div className="flex">
              <span className="w-[75px] shrink-0">VALID UP TO</span>
              <span className="mr-1">:</span>
              <span className="flex-1 truncate">{validity}</span>
           </div>
         </div>
      </div>

      <div className="p-3 border-t-2 border-gray-800 flex justify-between items-end bg-gray-50 relative mt-2">
         <div className="bg-white p-1 border border-gray-300 rounded shadow-sm">
           {(st.rollNo || st.rollNumber) ? <QRCode value={String(st.rollNo || st.rollNumber)} size={32} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[8px] border border-dashed border-red-500">NO ROLL NO</div>}
           <div className="text-[5px] text-center text-gray-500 font-mono mt-0.5 truncate max-w-[32px]">ID:{st.rollNo || st.rollNumber || '000'}</div>
         </div>
         
         <div className="text-center w-[75px] relative">
            {stampImage && <img src={stampImage} alt="Stamp" className="absolute -top-10 left-1/2 -translate-x-1/2 h-12 max-w-[80px] object-contain opacity-80" />}
            <div className="border-t border-black pt-1 mt-6">
              <span className="text-[8px] font-bold text-gray-800 uppercase block">Principal Sign</span>
            </div>
         </div>
      </div>
    </div>
  );
};

const renderTechCard = (st, isPrint, settings) => {
  const { schoolName, validity, principalName, stampImage, logoImage } = settings;
  const scale = isPrint ? 'scale-[0.95]' : '';
  const width = isPrint ? 'w-[230px]' : 'w-[240px]';
  const height = isPrint ? 'h-[360px]' : 'h-[380px]';
  
  return (
    <div key={st.id} className={`relative group ${width} ${height} rounded-lg bg-white shadow-md overflow-hidden print-card-break select-text text-[#1e3a8a] flex flex-col font-sans transition-all duration-300 hover:scale-[1.02] ${scale} mx-auto`}>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(#1e3a8a 1px, transparent 1px)', 
        backgroundSize: '10px 10px'
      }}>
         <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
           <path d="M20,50 L50,50 L70,30 L100,30" stroke="#1e3a8a" strokeWidth="1" fill="none"/>
           <path d="M150,80 L180,80 L200,100 L230,100" stroke="#1e3a8a" strokeWidth="1" fill="none"/>
           <path d="M30,150 L60,150 L80,170 L110,170" stroke="#1e3a8a" strokeWidth="1" fill="none"/>
           <path d="M170,250 L200,250 L220,230 L240,230" stroke="#1e3a8a" strokeWidth="1" fill="none"/>
         </svg>
      </div>

      <div className="w-full bg-[#1e3a8a] text-white p-3 pt-4 flex gap-2 items-center z-10 relative">
         <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white rounded-full p-1 shadow-inner">
           {logoImage ? (
              <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
           ) : (
              <div className="w-full h-full border-2 border-[#1e3a8a] rounded-full flex items-center justify-center">
                <span className="text-[6px] text-[#1e3a8a] font-bold">LOGO</span>
              </div>
           )}
         </div>
         <div className="flex-1">
           <h3 className="text-[12px] font-black uppercase tracking-wide leading-tight">
             {schoolName}
           </h3>
           <p className="text-[6.5px] font-medium tracking-widest uppercase mt-0.5 opacity-90">
             KARACHI, PAKISTAN | Est. 1968
           </p>
         </div>
      </div>

      <div className="flex justify-center mt-4 mb-2 z-10 relative">
         <div className="w-[85px] h-[105px] border-[3px] border-[#3b82f6] bg-gray-100 p-0.5 flex flex-col items-center justify-center relative">
           <div className="absolute -top-3 -left-3 text-[4px] text-gray-400 rotate-90 whitespace-nowrap">||||||||||||||||||||||||||||||||||||</div>
           <div className="absolute -bottom-3 -right-3 text-[4px] text-gray-400 rotate-90 whitespace-nowrap">||||||||||||||||||||||||||||||||||||</div>
           {st.profilePhoto || st.photoUrl ? (
              <img src={st.profilePhoto || st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
           ) : (
              <span className="text-[8px] font-bold text-gray-400">PHOTO</span>
           )}
         </div>
      </div>

      <div className="flex-1 px-4 mt-2 z-10 relative">
         <div className="text-[10px] text-[#1e3a8a] space-y-1 w-full uppercase">
           <div className="flex items-center gap-1.5">
              <span className="font-bold w-[75px] shrink-0">NAME:</span>
              <span className="font-black text-[12px] truncate">{st.name || 'N/A'}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="font-bold w-[75px] shrink-0">STUDENT ID:</span>
              <span className="font-medium truncate">{st.registrationNo || st.rollNo || st.rollNumber || st.id || 'N/A'}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="font-bold w-[75px] shrink-0">COURSE:</span>
              <span className="font-medium truncate">{st.class || 'BS COMPUTER SCIENCE'}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="font-bold w-[75px] shrink-0">YEAR:</span>
              <span className="font-medium truncate">2023 - 2027</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="font-bold w-[75px] shrink-0">BLOOD GROUP:</span>
              <span className="font-black">{st.bloodGroup || 'B+'}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <span className="font-bold w-[75px] shrink-0">VALID UNTIL:</span>
              <span className="font-medium truncate">{validity}</span>
           </div>
         </div>
      </div>

      <div className="px-4 pb-3 flex justify-between items-end z-10 relative mt-2">
         <div className="text-center w-[60px]">
            <div className="border-t border-gray-400 pt-0.5 pb-1">
              <span className="text-[6px] font-bold text-gray-600 uppercase block tracking-wider">STUDENT SIGNATURE</span>
            </div>
         </div>
         <div className="flex flex-col items-center mx-2">
           <div className="flex gap-1 mb-1 items-end">
             <div className="flex space-x-[1px]">
               <div className="w-[1px] h-4 bg-[#1e3a8a]"></div>
               <div className="w-[2px] h-4 bg-[#1e3a8a]"></div>
               <div className="w-[1px] h-4 bg-[#1e3a8a]"></div>
               <div className="w-[3px] h-4 bg-[#1e3a8a]"></div>
               <div className="w-[1px] h-4 bg-[#1e3a8a]"></div>
             </div>
             {(st.rollNo || st.rollNumber) ? <QRCode value={String(st.rollNo || st.rollNumber)} size={28} fgColor="#1e3a8a" /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[8px] border border-dashed border-red-500">NO ROLL NO</div>}
           </div>
         </div>
         <div className="text-center w-[60px] relative">
            {stampImage && <img src={stampImage} alt="Stamp" className="absolute bottom-6 left-1/2 -translate-x-1/2 h-10 max-w-[70px] object-contain opacity-80" />}
            <div className="border-t border-gray-400 pt-0.5 pb-1">
              <span className="text-[6px] font-bold text-gray-600 uppercase block tracking-wider">REGISTRAR SIGNATURE</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export const renderCustomCard = (st, isPrint, settings) => {
  const { customTemplate } = settings;
  if (!customTemplate) return renderPortraitCard(st, isPrint, settings);

  const scale = isPrint ? 'scale-[0.95]' : '';
  const scaleRatio = isPrint ? 0.95 : 1;
  const widthStr = `${customTemplate.width}px`;
  const heightStr = `${customTemplate.height}px`;

  return (
    <div 
      key={st.id} 
      className={`relative group rounded-[18px] shadow-xl overflow-hidden print-card-break select-text text-black font-sans mx-auto ${scale}`}
      style={{
        width: widthStr,
        height: heightStr,
        backgroundColor: customTemplate.backgroundColor,
        border: '1px solid #e5e7eb'
      }}
    >
      {/* Background Image Watermark */}
      {customTemplate.backgroundImage && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${customTemplate.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: (customTemplate.backgroundOpacity || 100) / 100
          }}
        />
      )}

      {customTemplate.elements.map(el => {
        let content = null;
        if (el.type === 'profilePhoto') {
          content = st.profilePhoto || st.photoUrl ? (
            <img src={st.profilePhoto || st.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
             <svg style={{ width: '100%', height: '100%', color: '#d1d5db' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          );
        } else if (el.type === 'qrCode') {
          content = (st.rollNo || st.rollNumber) ? <QRCode value={String(st.rollNo || st.rollNumber)} size={el.width} fgColor={el.color || '#000000'} bgColor={el.backgroundColor === 'transparent' ? '#ffffff' : (el.backgroundColor || '#ffffff')} style={{ width: '100%', height: '100%' }} /> : <div className="flex items-center justify-center text-center text-red-500 font-bold p-1 text-[8px] border border-dashed border-red-500">NO ROLL NO</div>;
        } else if (el.type === 'dynamicText') {
          content = st[el.field] || 'N/A';
        } else {
          content = el.text;
        }

        return (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              fontSize: `${el.fontSize}px`,
              color: el.color,
              fontWeight: el.fontWeight,
              textAlign: el.textAlign,
              backgroundColor: el.backgroundColor,
              borderRadius: el.borderRadius,
              display: 'flex',
              alignItems: 'center',
              justifyContent: el.textAlign === 'center' ? 'center' : 'flex-start',
              overflow: 'hidden',
              padding: '0 4px'
            }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
};

export const renderCard = (st, settings, isPrint = false) => {
  const { cardLayout } = settings;
  if (cardLayout === 'custom') return renderCustomCard(st, isPrint, settings);
  if (cardLayout === 'landscape') return renderLandscapeCard(st, isPrint, settings);
  if (cardLayout === 'minimal') return renderMinimalCard(st, isPrint, settings);
  if (cardLayout === 'govt') return renderGovtCard(st, isPrint, settings);
  if (cardLayout === 'elite') return renderEliteCard(st, isPrint, settings);
  if (cardLayout === 'madrassa') return renderMadrassaCard(st, isPrint, settings);
  if (cardLayout === 'college') return renderCollegeCard(st, isPrint, settings);
  if (cardLayout === 'smart') return renderSmartScholarCard(st, isPrint, settings);
  if (cardLayout === 'uni') return renderUniCard(st, isPrint, settings);
  if (cardLayout === 'tech') return renderTechCard(st, isPrint, settings);
  return renderPortraitCard(st, isPrint, settings);
};



