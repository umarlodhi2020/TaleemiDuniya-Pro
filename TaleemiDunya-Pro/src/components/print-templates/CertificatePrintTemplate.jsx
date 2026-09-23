import React from 'react';
import { useAuth } from '../../context/AuthContext';

const CertificatePrintTemplate = ({ student, schoolData }) => {
  const { userData } = useAuth();
  const schoolName = schoolData?.name || userData?.schoolName || 'TaleemiDunya School';

  const themeColor = schoolData?.primaryColor || '#0ea5e9';
  const bgTemplate = schoolData?.templates?.certificateBg;
  const principalRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal');
  const principalSignatureUrl = schoolData?.signatureSettings?.principalSignatureUrl || principalRule?.signatureUrl || null;

  return (
    <div 
      className={`w-full bg-white text-black p-10 font-serif min-h-[800px] flex flex-col relative ${!bgTemplate ? 'border-[12px] border-double' : ''}`} 
      style={{ 
        borderColor: themeColor,
        backgroundImage: bgTemplate ? `url(${bgTemplate})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      
      {/* Decorative corners - Hide if custom template */}
      {!bgTemplate && (
        <>
          <div className="absolute top-2 left-2 w-16 h-16 border-t-4 border-l-4" style={{ borderColor: themeColor }}></div>
          <div className="absolute top-2 right-2 w-16 h-16 border-t-4 border-r-4" style={{ borderColor: themeColor }}></div>
          <div className="absolute bottom-2 left-2 w-16 h-16 border-b-4 border-l-4" style={{ borderColor: themeColor }}></div>
          <div className="absolute bottom-2 right-2 w-16 h-16 border-b-4 border-r-4" style={{ borderColor: themeColor }}></div>
        </>
      )}

      {/* Header - Hide if custom template */}
      {!bgTemplate ? (
        <div className="text-center mb-10 mt-8">
          {schoolData?.logo && (
            <img src={schoolData.logo} alt="School Logo" className="h-24 w-auto mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-4xl font-black uppercase tracking-widest" style={{ color: themeColor }}>{schoolName}</h1>
          <p className="text-sm tracking-widest uppercase mt-2 border-y-2 py-1 inline-block" style={{ borderColor: themeColor, color: themeColor }}>Excellence in Education</p>
        </div>
      ) : (
        <div className="mt-40"></div> // Spacer for custom template header
      )}

      <div className="text-center mb-12">
        {!bgTemplate && <h2 className="text-5xl font-black uppercase italic tracking-wider" style={{ color: themeColor }}>Certificate</h2>}
        {!bgTemplate && <p className="text-lg uppercase tracking-[0.3em] mt-2" style={{ color: themeColor }}>Of Character & Leaving</p>}
      </div>

      {/* Body Content */}
      <div className="text-lg leading-loose text-justify px-8 flex-grow">
        <p>
          This is to certify that 
          <span className="font-bold border-b-2 inline-block px-4 mx-2 min-w-[250px] text-center uppercase" style={{ borderColor: themeColor }}>{student?.name || '____________________'}</span>
          Son/Daughter of 
          <span className="font-bold border-b-2 inline-block px-4 mx-2 min-w-[250px] text-center uppercase" style={{ borderColor: themeColor }}>{student?.fatherName || '____________________'}</span>
        </p>
        <p className="mt-4">
          was a bona fide student of this institution in Class
          <span className="font-bold border-b-2 inline-block px-4 mx-2 min-w-[150px] text-center" style={{ borderColor: themeColor }}>{student?.class || '__________'} ({student?.section || 'A'})</span>
          under Roll Number 
          <span className="font-bold border-b-2 inline-block px-4 mx-2 min-w-[150px] text-center" style={{ borderColor: themeColor }}>{student?.rollNumber || '__________'}</span>.
        </p>
        <p className="mt-4">
          He/She has completed his/her studies up to the required standard. During his/her stay at the school, his/her character and conduct have been found to be
          <span className="font-bold border-b-2 inline-block px-4 mx-2 min-w-[200px] text-center" style={{ borderColor: themeColor }}>Excellent</span>.
        </p>
        <p className="mt-4">
          We wish him/her all the best in his/her future endeavors.
        </p>
      </div>

      {/* Signatures & Dates */}
      <div className="flex justify-between items-end mt-20 px-8 pb-8">
        <div>
          <p className="font-bold" style={{ color: themeColor }}>Issue Date:</p>
          <div className="border-b-2 w-48 mt-8 text-center font-bold" style={{ borderColor: themeColor }}>
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
        
        <div className="text-center flex flex-col items-center justify-end">
          {principalSignatureUrl ? (
            <img src={principalSignatureUrl} alt="Principal Signature" className="h-12 object-contain -mb-2 mix-blend-multiply opacity-90" />
          ) : (
            <div className="h-10" />
          )}
          <div className="border-b-2 w-64 mb-2" style={{ borderColor: themeColor }}></div>
          <p className="font-bold uppercase tracking-widest" style={{ color: themeColor }}>Principal Signature</p>
          <p className="text-xs uppercase mt-1" style={{ color: themeColor }}>{schoolName}</p>
        </div>
      </div>

    </div>
  );
};

export default CertificatePrintTemplate;
