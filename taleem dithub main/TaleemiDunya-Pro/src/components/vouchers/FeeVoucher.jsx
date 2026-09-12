import React, { forwardRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const VoucherCopy = ({ copyType, student, schoolData }) => {
  const { userData } = useAuth();
  const schoolName = userData?.schoolName || schoolData?.name || 'TaleemiDunya School';
  const date = new Date();
  const issueDate = date.toLocaleDateString('en-GB');
  date.setDate(date.getDate() + 10);
  const dueDate = date.toLocaleDateString('en-GB');

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  const themeColor = schoolData?.primaryColor || '#0ea5e9';
  const themeBgLight = `${themeColor}15`;
  const bgTemplate = schoolData?.templates?.feeBg;

  return (
    <div 
      className={`flex-1 p-4 bg-white text-black relative flex flex-col min-h-[500px] ${!bgTemplate ? 'border-2' : ''}`} 
      style={{ 
        borderColor: themeColor,
        backgroundImage: bgTemplate ? `url(${bgTemplate})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Header */}
      {!bgTemplate ? (
        <div className="text-center border-b-4 pb-3 mb-4" style={{ borderColor: themeColor }}>
          {schoolData?.logo && (
            <img src={schoolData.logo} alt="School Logo" className="h-10 w-auto mx-auto mb-2 object-contain" />
          )}
          <h2 className="text-lg font-black uppercase tracking-tight leading-tight" style={{ color: themeColor }}>
            {schoolName}
          </h2>
          <p className="text-[10px] font-bold uppercase border inline-block px-2 py-0.5 mt-1 rounded" style={{ borderColor: themeColor, backgroundColor: themeBgLight, color: themeColor }}>
            {copyType} COPY
          </p>
        </div>
      ) : (
        <div className="mt-20"></div> // Spacer for custom header
      )}

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold mb-4">
        <div>
          <span className="text-gray-500 uppercase">Challan No:</span>
          <br /><span className="text-sm font-mono">{Math.floor(100000 + Math.random() * 900000)}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500 uppercase">Issue Date:</span>
          <br /><span>{issueDate}</span>
        </div>
        <div>
          <span className="text-gray-500 uppercase">Fee Month:</span>
          <br /><span className="text-sm text-black">{currentMonth} {currentYear}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500 uppercase">Due Date:</span>
          <br /><span className="text-red-600">{dueDate}</span>
        </div>
      </div>

      {/* Student Details */}
      <div className="border-2 p-2 text-xs font-bold space-y-1 mb-4 rounded" style={{ borderColor: themeColor, backgroundColor: themeBgLight }}>
        <p><span className="text-gray-500 uppercase inline-block w-16">Name:</span> <span className="uppercase text-sm">{student?.name}</span></p>
        <p><span className="text-gray-500 uppercase inline-block w-16">Father:</span> <span className="uppercase">{student?.fatherName || '-'}</span></p>
        <p><span className="text-gray-500 uppercase inline-block w-16">Class:</span> <span className="uppercase">{student?.class} ({student?.section || 'A'})</span></p>
        <p><span className="text-gray-500 uppercase inline-block w-16">Roll No:</span> <span className="uppercase">{student?.rollNumber || '-'}</span></p>
      </div>

      {/* Fee Particulars */}
      <table className="w-full text-xs mb-4 border-collapse">
        <thead>
          <tr className="border-b-2 uppercase text-[10px] font-bold" style={{ borderColor: themeColor, color: themeColor }}>
            <th className="text-left py-1">Particulars</th>
            <th className="text-right py-1">Amount (Rs)</th>
          </tr>
        </thead>
        <tbody className="font-bold">
          <tr className="border-b border-gray-200">
            <td className="py-2">Monthly Tuition Fee</td>
            <td className="py-2 text-right">{student?.monthlyFee || 3500}</td>
          </tr>
          <tr className="border-b border-gray-200">
            <td className="py-2">Arrears / Balance</td>
            <td className="py-2 text-right">{student?.balance || 0}</td>
          </tr>
          {/* Add more dynamic rows here if needed */}
        </tbody>
        <tfoot>
          <tr className="border-t-2 text-sm font-black" style={{ borderColor: themeColor, color: themeColor }}>
            <td className="py-2">TOTAL PAYABLE</td>
            <td className="py-2 text-right text-lg">
              {(Number(student?.monthlyFee || 3500) + Number(student?.balance || 0)).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-auto space-y-4 pt-4">
        <div className="text-[9px] text-gray-500 text-center leading-tight">
          * Please pay the fee before the due date to avoid late charges.
          <br />* This is a computer generated voucher and requires no signature.
        </div>
        
        <div className="flex justify-between items-end border-t border-gray-300 pt-6">
          <div className="text-center w-24 border-t border-black text-[10px] font-bold pt-1">Cashier</div>
          <div className="text-center w-24 border-t border-black text-[10px] font-bold pt-1">Depositor</div>
        </div>
      </div>
    </div>
  );
};

export const FeeVoucher = ({ student, schoolData }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-100 min-h-screen">
      <VoucherCopy copyType="BANK" student={student} schoolData={schoolData} />
      <VoucherCopy copyType="SCHOOL" student={student} schoolData={schoolData} />
      <VoucherCopy copyType="STUDENT" student={student} schoolData={schoolData} />
    </div>
  );
};

export default FeeVoucher;
