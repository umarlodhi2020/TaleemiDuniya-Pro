import React from 'react';
import { useAuth } from '../../context/AuthContext';

const LedgerPrintTemplate = ({ student, schoolData, ledgerType }) => {
  const { userData } = useAuth();
  const schoolName = userData?.schoolName || schoolData?.name || 'TaleemiDunya School';

  // Determine title based on ledger type
  const title = ledgerType === 'family-ledger' 
    ? 'Complete Family / Siblings Ledger' 
    : 'Student Account Ledger';

  const themeColor = schoolData?.primaryColor || '#0ea5e9';
  const themeBgLight = `${themeColor}15`;

  return (
    <div className="w-full bg-white text-black p-8 font-sans border-2" style={{ borderColor: themeColor }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 pb-4 mb-6" style={{ borderColor: themeColor }}>
        <div className="flex items-center gap-4">
          {schoolData?.logo && (
            <img src={schoolData.logo} alt="School Logo" className="h-16 w-auto object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: themeColor }}>{schoolName}</h1>
            <p className="text-sm font-bold mt-1" style={{ color: themeColor }}>{title}</p>
          </div>
        </div>
        <div className="text-right text-xs font-bold text-gray-600">
          <p>Printed On: {new Date().toLocaleDateString('en-GB')}</p>
          <p>Time: {new Date().toLocaleTimeString('en-GB')}</p>
        </div>
      </div>

      {/* Student Information */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm border-2 p-4 rounded" style={{ borderColor: themeColor, backgroundColor: themeBgLight }}>
        <div>
          <p><span className="font-bold w-24 inline-block text-gray-600 uppercase text-xs">Student Name:</span> <span className="font-black uppercase">{student?.name || 'N/A'}</span></p>
          <p><span className="font-bold w-24 inline-block text-gray-600 uppercase text-xs">Father Name:</span> <span className="font-bold uppercase">{student?.fatherName || 'N/A'}</span></p>
        </div>
        <div className="text-right">
          <p><span className="font-bold w-24 inline-block text-gray-600 uppercase text-xs">Class:</span> <span className="font-black uppercase">{student?.class || 'N/A'} ({student?.section || 'A'})</span></p>
          <p><span className="font-bold w-24 inline-block text-gray-600 uppercase text-xs">Roll No:</span> <span className="font-bold uppercase">{student?.rollNumber || 'N/A'}</span></p>
        </div>
      </div>

      {/* Ledger Table */}
      <table className="w-full text-sm border-collapse border mb-8" style={{ borderColor: themeColor }}>
        <thead className="text-white uppercase text-xs" style={{ backgroundColor: themeColor }}>
          <tr>
            <th className="border p-2 text-left" style={{ borderColor: themeColor }}>Date</th>
            <th className="border p-2 text-left" style={{ borderColor: themeColor }}>Description</th>
            <th className="border p-2 text-right" style={{ borderColor: themeColor }}>Debit (Rs)</th>
            <th className="border p-2 text-right" style={{ borderColor: themeColor }}>Credit (Rs)</th>
            <th className="border p-2 text-right" style={{ borderColor: themeColor }}>Balance (Rs)</th>
          </tr>
        </thead>
        <tbody>
          {(student?.transactions && student.transactions.length > 0) ? (
            student.transactions.map((t, idx) => (
              <tr key={idx}>
                <td className="border p-2" style={{ borderColor: themeColor }}>{t.date || '-'}</td>
                <td className="border p-2" style={{ borderColor: themeColor }}>{t.description || t.title || 'Tuition Fee / Payment'}</td>
                <td className="border p-2 text-right" style={{ borderColor: themeColor }}>{t.debit ? Number(t.debit).toLocaleString() : '-'}</td>
                <td className="border p-2 text-right" style={{ borderColor: themeColor }}>{t.credit ? Number(t.credit).toLocaleString() : '-'}</td>
                <td className="border p-2 text-right font-bold" style={{ borderColor: themeColor }}>{t.balance ? Number(t.balance).toLocaleString() : '0'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="border p-4 text-center text-gray-500 italic" style={{ borderColor: themeColor }}>
                No transaction ledger history recorded for this student account.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="bg-gray-100 font-black">
          <tr>
            <td colSpan="2" className="border border-black p-2 text-right">TOTAL CLOSING BALANCE</td>
            <td colSpan="3" className="border border-black p-2 text-right text-lg">Rs. {Number(student?.balance || 0).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {/* Signatures */}
      <div className="flex justify-between mt-20 text-sm font-bold pt-8">
        <div className="text-center w-48 border-t border-black pt-2">
          Prepared By (Accounts)
        </div>
        <div className="text-center w-48 border-t border-black pt-2">
          Authorized Signature
        </div>
      </div>
    </div>
  );
};

export default LedgerPrintTemplate;
