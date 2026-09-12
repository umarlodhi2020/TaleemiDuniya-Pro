import React from 'react';
import { useAuth } from '../../context/AuthContext';

const ReceiptPrintTemplate = ({ student, schoolData, type }) => {
  const { userData } = useAuth();
  const schoolName = userData?.schoolName || schoolData?.name || 'TaleemiDunya School';
  const isReminder = type === 'reminder-slip';
  
  const themeColor = schoolData?.primaryColor || '#0ea5e9';
  const themeBgLight = `${themeColor}15`;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white text-black p-6 font-sans border-2 relative" style={{ borderColor: themeColor }}>
      
      {/* Decorative Cut line */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-gray-400 text-xs flex items-center gap-2">
        <span>✂️</span> <span className="border-b border-dashed border-gray-400 w-32"></span> cut here <span className="border-b border-dashed border-gray-400 w-32"></span>
      </div>

      <div className="flex justify-between items-start border-b-4 pb-4 mb-4" style={{ borderColor: themeColor }}>
        <div className="flex items-center gap-3">
          {schoolData?.logo && (
            <img src={schoolData.logo} alt="Logo" className="h-12 w-auto object-contain" />
          )}
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight" style={{ color: themeColor }}>{schoolName}</h1>
            <p className="text-xs font-bold uppercase mt-0.5" style={{ color: themeColor }}>
              {isReminder ? 'Official Reminder Slip' : 'Official Payment Receipt'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500 uppercase">Date</p>
          <p className="text-sm font-black">{new Date().toLocaleDateString('en-GB')}</p>
          {!isReminder && (
            <>
              <p className="text-xs font-bold text-gray-500 uppercase mt-2">Receipt No</p>
              <p className="text-sm font-mono font-black">REC-{Math.floor(1000 + Math.random() * 9000)}</p>
            </>
          )}
        </div>
      </div>

      <div className="p-3 rounded border mb-4 text-sm flex justify-between" style={{ borderColor: themeColor, backgroundColor: themeBgLight }}>
        <div>
          <p><span className="font-bold text-gray-500 uppercase text-xs w-20 inline-block">Student:</span> <span className="font-black uppercase">{student?.name || 'N/A'}</span></p>
          <p><span className="font-bold text-gray-500 uppercase text-xs w-20 inline-block">Father:</span> <span className="font-bold uppercase">{student?.fatherName || 'N/A'}</span></p>
        </div>
        <div className="text-right">
          <p><span className="font-bold text-gray-500 uppercase text-xs w-16 inline-block text-left">Class:</span> <span className="font-black uppercase">{student?.class || 'N/A'}</span></p>
          <p><span className="font-bold text-gray-500 uppercase text-xs w-16 inline-block text-left">Roll No:</span> <span className="font-bold uppercase">{student?.rollNumber || 'N/A'}</span></p>
        </div>
      </div>

      {isReminder ? (
        <div className="py-4 px-2 border-l-4" style={{ borderColor: themeColor }}>
          <h2 className="text-lg font-black uppercase mb-2">Important Notice</h2>
          <p className="text-sm leading-relaxed">
            Dear Parent/Guardian, this is a gentle reminder that the fee for the current month is due. 
            The outstanding balance for <span className="font-bold uppercase">{student?.name}</span> is 
            <span className="font-black text-lg mx-1">Rs. {student?.balance || 3500}</span>. 
            Please clear the dues at your earliest convenience to avoid late fees or disruption of services.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-300 p-2 text-left uppercase text-xs">Description</th>
              <th className="border border-gray-300 p-2 text-right uppercase text-xs w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 font-bold">Monthly Fee Payment</td>
              <td className="border border-gray-300 p-2 text-right">Rs. {student?.monthlyFee || 3500}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-bold">Arrears / Fines</td>
              <td className="border border-gray-300 p-2 text-right">Rs. 0</td>
            </tr>
          </tbody>
          <tfoot className="bg-gray-100 font-black text-base">
            <tr>
              <td className="border border-gray-300 p-2 text-right uppercase">Total Amount Paid</td>
              <td className="border border-gray-300 p-2 text-right">Rs. {student?.monthlyFee || 3500}</td>
            </tr>
          </tfoot>
        </table>
      )}

      <div className="mt-8 flex justify-between items-end text-xs font-bold text-gray-500">
        <p className="italic">* This is a computer generated document.</p>
        <div className="text-center">
          <div className="border-t border-black w-32 pt-1">Authorized Sign</div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPrintTemplate;
