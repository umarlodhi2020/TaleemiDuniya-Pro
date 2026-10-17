import React from 'react';
import QRCode from 'react-qr-code';

export const renderStaffCard = (staff, isPrint, settings) => {
  const { 
    schoolName, 
    cardSubtitle, 
    principalName, 
    stampImage, 
    logoImage,
    showQRCode,
    showStamp,
    showSignature,
    orientation = 'portrait',
    cardType = 'both',
    themeColor = '#1e3a8a',
    bgImage = null
  } = settings;

  // Use provided logoImage, or fallback to a default graduation cap icon if missing
  const logo = logoImage || 'https://cdn-icons-png.flaticon.com/512/167/167707.png';

  const scale = isPrint ? 'scale-[0.95]' : 'scale-100';
  
  const width = orientation === 'portrait' ? (isPrint ? 'w-[210px]' : 'w-[230px]') : (isPrint ? 'w-[325px]' : 'w-[340px]');
  const height = orientation === 'portrait' ? (isPrint ? 'h-[315px]' : 'h-[350px]') : (isPrint ? 'h-[205px]' : 'h-[215px]');

  const renderFront = () => (
    <div className={`relative ${width} ${height} rounded-xl bg-white border border-gray-300 shadow-md overflow-hidden print-card-break select-text text-black flex flex-col font-sans mb-4 mx-auto`}
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {logo && (
        <div 
          className="absolute inset-0 z-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: `url(${logo})`, backgroundSize: '70%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        />
      )}

      <div className="relative pt-3 px-2 flex flex-col items-center justify-center text-center">
        <div 
          className="absolute -top-[150px] left-1/2 -translate-x-1/2 w-[350px] h-[220px] rounded-[100%] opacity-90"
          style={{ backgroundColor: themeColor, zIndex: 0 }}
        />
        
        <div className="relative z-10 flex w-full items-start px-2 mt-1">
          {logo && <img src={logo} alt="School Logo" className="absolute top-0 left-2 w-9 h-9 object-contain bg-white rounded-full p-0.5 shadow-sm" />}
          <div className="flex-1 pl-10 text-left">
            <h3 className="text-[10px] font-black uppercase text-white tracking-wider leading-tight line-clamp-2">
              {schoolName}
            </h3>
            <div className="w-8 h-0.5 bg-yellow-400 mt-1 rounded-full" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-center mt-2 mb-1">
        <div className="w-[85px] h-[95px] rounded-lg border-2 border-white shadow-md bg-gray-100 overflow-hidden relative flex items-center justify-center">
          {(() => {
            const photoSrc = staff.profilePhoto || staff.photoUrl || staff.photo || staff.avatar || staff.imageUrl || staff.picture || staff.image;
            return photoSrc ? (
              <img
                src={photoSrc}
                alt={staff.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const svgEl = e.currentTarget.parentElement?.querySelector('svg');
                  if (svgEl) svgEl.style.display = 'block';
                }}
              />
            ) : null;
          })()}
          <svg className={`w-full h-full text-gray-300 mt-4 ${(staff.profilePhoto || staff.photoUrl || staff.photo || staff.avatar || staff.imageUrl || staff.picture || staff.image) ? 'hidden' : 'block'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 text-center z-10 relative">
        {logo && (
          <div 
            className="absolute inset-0 z-0 opacity-[0.12] pointer-events-none"
            style={{ backgroundImage: `url(${logo})`, backgroundSize: '65%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
          />
        )}
        <div className="relative z-10 flex flex-col items-center w-full">
          <h4 className="text-[14px] font-black text-gray-900 capitalize mt-1 mb-0.5 truncate text-center">
          {staff.name || 'Staff Name'}
        </h4>
        <span className="text-[9px] font-bold text-gray-600 tracking-wider mb-2 border-b border-gray-100 pb-1 w-full text-center" style={{ color: themeColor }}>
          ID: {staff.employeeId || staff.staffId || staff.registrationNo || (staff.id ? staff.id.substring(0, 8).toUpperCase() : 'STF-001')}
        </span>

        <div className="text-[10px] font-bold text-gray-900 space-y-1.5 text-left mt-2 w-full px-2">
          <div className="grid grid-cols-[65px_1fr] gap-1 items-center">
            <span className="text-gray-800 font-bold uppercase flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              Dept
            </span>
            <span className="truncate text-black font-black">: {staff.department || 'Administration'}</span>
          </div>
          <div className="grid grid-cols-[65px_1fr] gap-1 items-center">
            <span className="text-gray-800 font-bold uppercase flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
              CNIC
            </span>
            <span className="truncate text-black font-black">: {staff.cnic || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-[65px_1fr] gap-1 items-center">
            <span className="text-gray-800 font-bold uppercase flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              Contact
            </span>
            <span className="truncate text-black font-black">: {staff.phone || staff.contact || 'N/A'}</span>
          </div>
        </div>
      </div>
      </div>

      <div className="relative h-[45px] mt-auto">
        <svg viewBox="0 0 1440 320" className="absolute bottom-0 w-full h-[60px]" preserveAspectRatio="none">
          <path fill={themeColor} fillOpacity="1" d="M0,256L48,229.3C96,203,192,149,288,154.7C384,160,480,224,576,218.7C672,213,768,139,864,128C960,117,1056,171,1152,197.3C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
        <div className="absolute inset-0 flex justify-between items-end pb-1.5 px-4 z-10">
          <span className="text-[7px] text-white/90 italic tracking-wide">
            {cardSubtitle}
          </span>
          {showSignature && (
            <div className="flex flex-col items-center">
              {stampImage ? (
                <img src={stampImage} alt="Signature" className="h-16 max-w-[150px] object-contain -mb-1 origin-bottom scale-[1.25] mix-blend-multiply" />
              ) : (
                <div className="h-6" /> // spacer
              )}
              <span className="text-[7px] font-bold text-black border-t border-black pt-0.5 min-w-[50px] text-center">
                {principalName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderBack = () => (
    <div className={`relative ${width} ${height} rounded-xl bg-white border border-gray-300 shadow-md overflow-hidden print-card-break select-text text-black flex flex-col font-sans mb-4 mx-auto`}
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="h-[20px]" style={{ backgroundColor: themeColor }} />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center z-10 relative">
        {logo && (
          <div 
            className="absolute inset-0 z-0 opacity-[0.12] pointer-events-none"
            style={{ backgroundImage: `url(${logo})`, backgroundSize: '70%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
          />
        )}
        
        <div className="relative z-10 flex flex-col items-center w-full">
          {logo && <img src={logo} alt="Logo" className="w-14 h-14 object-contain mb-2 opacity-90 drop-shadow-md" />}
        
          <h3 className="text-[12px] font-black uppercase tracking-wide leading-tight w-full mb-1" style={{ color: themeColor }}>
            {schoolName}
          </h3>
          <p className="text-[7.5px] font-medium text-gray-500 mb-6 w-[80%] mx-auto">
            If found, please return this card to the school administration office.
          </p>

          {showQRCode && (
            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
              <QRCode value={String(staff.employeeId || staff.staffId || staff.registrationNo || staff.id || 'STAFF-001')} size={70} fgColor={themeColor} />
              <span className="text-[6px] font-black uppercase tracking-widest mt-1 text-gray-400">SCAN FOR ATTENDANCE</span>
            </div>
          )}
          
          <div className="mt-6 text-[7.5px] text-gray-800 font-bold space-y-1 text-center w-full px-4">
             <div className="flex items-center justify-center gap-1">
               <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
               {settings.schoolAddress || 'School Address Not Provided'}
             </div>
             <div className="flex items-center justify-center gap-2">
                <span className="flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                  {settings.schoolPhone || 'Contact Not Provided'}
                </span>
             </div>
          </div>
        </div>
      </div>
      
      <div className="h-[20px] mt-auto flex items-center justify-center text-[7px] text-white font-bold tracking-widest" style={{ backgroundColor: themeColor }}>
         EDUCATION BUILDS BETTER FUTURE
      </div>
    </div>
  );

  return (
    <div key={staff.id} className={`flex flex-col sm:flex-row print:flex-row gap-4 items-center justify-center ${scale}`}>
      {(cardType === 'both' || cardType === 'front') && renderFront()}
      {(cardType === 'both' || cardType === 'back') && renderBack()}
    </div>
  );
};
