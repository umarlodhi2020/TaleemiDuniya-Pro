import React from 'react';
import { useAuth } from '../../context/AuthContext';

const MarkSheetPrintTemplate = ({ student, schoolData, studentMarks = [] }) => {
  const { userData } = useAuth();
  const schoolName = userData?.schoolName || schoolData?.name || 'TaleemiDunya School';

  const themeColor = schoolData?.primaryColor || '#0ea5e9'; // Fallback to a nice blue
  const themeBgLight = `${themeColor}15`; // 15% opacity
  const bgTemplate = schoolData?.templates?.marksheetBg;

  return (
    <div 
      className={`w-full bg-white text-black p-8 font-sans print:p-0 print:min-h-0 min-h-[297mm] ${!bgTemplate ? 'border-2' : ''}`} 
      style={{ 
        borderColor: themeColor,
        backgroundImage: bgTemplate ? `url(${bgTemplate})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <style>
        {`@media print { @page { size: portrait; } }`}
      </style>
      
      {/* Header */}
      {!bgTemplate ? (
        <div className="flex justify-between items-center border-b-4 pb-4 mb-6" style={{ borderColor: themeColor }}>
        <div className="w-1/4">
          {schoolData?.logo ? (
            <img src={schoolData.logo} alt="Logo" className="h-20 w-auto object-contain" />
          ) : (
            <div className="h-20 w-20 border-2 border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400">LOGO</div>
          )}
        </div>
        <div className="w-2/4 text-center">
          <h1 className="text-3xl font-black uppercase tracking-wider">{schoolName}</h1>
          <p className="text-sm font-bold uppercase tracking-widest mt-1" style={{ color: themeColor }}>Official Academic Record</p>
          <div className="text-white font-bold uppercase py-1 px-4 inline-block mt-2 rounded" style={{ backgroundColor: themeColor }}>Annual Examination Report</div>
        </div>
        <div className="w-1/4 text-right">
          <p className="text-xs font-bold uppercase text-gray-500 mb-1">Affiliated With</p>
          <p className="text-sm font-black uppercase">Board of Education</p>
        </div>
        </div>
      ) : (
        <div className="mt-32"></div> // Spacer for custom header
      )}

      {/* Student Meta Details */}
      <div className="grid grid-cols-2 gap-4 border-2 p-4 mb-6 rounded" style={{ borderColor: themeColor, backgroundColor: themeBgLight }}>
        <div className="space-y-2">
          <p className="flex"><span className="w-32 font-bold text-gray-600 uppercase text-xs">Student Name:</span> <span className="font-black uppercase">{student?.name || 'N/A'}</span></p>
          <p className="flex"><span className="w-32 font-bold text-gray-600 uppercase text-xs">Father Name:</span> <span className="font-bold uppercase">{student?.fatherName || 'N/A'}</span></p>
          <p className="flex"><span className="w-32 font-bold text-gray-600 uppercase text-xs">Date of Birth:</span> <span className="font-bold uppercase">{student?.dob || '01-Jan-2015'}</span></p>
        </div>
        <div className="space-y-2">
          <p className="flex"><span className="w-24 font-bold text-gray-600 uppercase text-xs">Class:</span> <span className="font-black uppercase">{student?.class || 'N/A'}</span></p>
          <p className="flex"><span className="w-24 font-bold text-gray-600 uppercase text-xs">Section:</span> <span className="font-bold uppercase">{student?.section || 'A'}</span></p>
          <p className="flex"><span className="w-24 font-bold text-gray-600 uppercase text-xs">Roll No:</span> <span className="font-bold uppercase">{student?.rollNumber || 'N/A'}</span></p>
        </div>
      </div>

      {/* Marks Table */}
      <table className="w-full border-collapse border-2 mb-6" style={{ borderColor: themeColor }}>
        <thead className="text-white" style={{ backgroundColor: themeColor }}>
          <tr>
            <th className="border p-3 text-left uppercase text-xs font-black w-12 text-center" style={{ borderColor: themeColor }}>Sr.</th>
            <th className="border p-3 text-left uppercase text-xs font-black" style={{ borderColor: themeColor }}>Subject</th>
            <th className="border p-3 text-center uppercase text-xs font-black w-24" style={{ borderColor: themeColor }}>Total Marks</th>
            <th className="border p-3 text-center uppercase text-xs font-black w-24" style={{ borderColor: themeColor }}>Passing Marks</th>
            <th className="border p-3 text-center uppercase text-xs font-black w-24" style={{ borderColor: themeColor }}>Marks Obtained</th>
            <th className="border p-3 text-center uppercase text-xs font-black w-24" style={{ borderColor: themeColor }}>Grade</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {studentMarks.length === 0 ? (
            <tr>
              <td colSpan="6" className="border p-8 text-center text-gray-500 font-bold" style={{ borderColor: themeColor }}>
                No exam results found for this student. Please mark results in the Exam Module.
              </td>
            </tr>
          ) : (
            studentMarks.map((subject, idx) => {
              const obt = Number(subject.obtainedMarks || 0);
              const tot = Number(subject.totalMarks || 100);
              const pass = tot * 0.33;
              const perc = (obt / tot) * 100;
              let grade = 'F';
              if (perc >= 90) grade = 'A+';
              else if (perc >= 80) grade = 'A';
              else if (perc >= 70) grade = 'B+';
              else if (perc >= 60) grade = 'B';
              else if (perc >= 50) grade = 'C';
              else if (perc >= 33) grade = 'D';

              return (
                <tr key={idx}>
                  <td className="border p-2 text-center" style={{ borderColor: themeColor }}>{idx + 1}</td>
                  <td className="border p-2 font-bold uppercase" style={{ borderColor: themeColor }}>{subject.subject}</td>
                  <td className="border p-2 text-center" style={{ borderColor: themeColor }}>{tot}</td>
                  <td className="border p-2 text-center" style={{ borderColor: themeColor }}>{pass.toFixed(0)}</td>
                  <td className="border p-2 text-center font-black" style={{ borderColor: themeColor }}>{obt}</td>
                  <td className="border p-2 text-center font-bold" style={{ borderColor: themeColor }}>{grade}</td>
                </tr>
              );
            })
          )}
        </tbody>
        <tfoot className="font-black" style={{ backgroundColor: themeBgLight }}>
          <tr>
            <td colSpan="2" className="border p-3 text-right uppercase" style={{ borderColor: themeColor }}>Grand Total</td>
            <td className="border p-3 text-center" style={{ borderColor: themeColor }}>
              {studentMarks.reduce((sum, s) => sum + Number(s.totalMarks || 100), 0)}
            </td>
            <td className="border p-3 text-center" style={{ borderColor: themeColor }}>-</td>
            <td className="border p-3 text-center text-lg" style={{ borderColor: themeColor }}>
              {studentMarks.reduce((sum, s) => sum + Number(s.obtainedMarks || 0), 0)}
            </td>
            <td className="border p-3 text-center" style={{ borderColor: themeColor }}></td>
          </tr>
        </tfoot>
      </table>

      {/* Summary Box */}
      <div className="flex gap-4 mb-8">
        <div className="w-2/3 border-2 p-4 rounded" style={{ borderColor: themeColor }}>
          <p className="text-xs uppercase font-bold mb-1" style={{ color: themeColor }}>General Remarks</p>
          <p className="font-bold italic">
            {(() => {
              if (studentMarks.length === 0) return 'No data.';
              const totalObt = studentMarks.reduce((sum, s) => sum + Number(s.obtainedMarks || 0), 0);
              const totalMax = studentMarks.reduce((sum, s) => sum + Number(s.totalMarks || 100), 0);
              const perc = (totalObt / totalMax) * 100;
              if (perc >= 80) return 'Excellent performance. Keep up the hard work!';
              if (perc >= 60) return 'Good performance. Room for improvement.';
              if (perc >= 33) return 'Average performance. Needs more focus.';
              return 'Needs serious attention and hard work.';
            })()}
          </p>
        </div>
        <div className="w-1/3 border-2 p-4 rounded text-center flex flex-col justify-center" style={{ borderColor: themeColor, backgroundColor: themeBgLight }}>
          <p className="text-xs uppercase font-bold mb-1" style={{ color: themeColor }}>Percentage</p>
          <p className="text-3xl font-black" style={{ color: themeColor }}>
            {(() => {
              if (studentMarks.length === 0) return '0%';
              const totalObt = studentMarks.reduce((sum, s) => sum + Number(s.obtainedMarks || 0), 0);
              const totalMax = studentMarks.reduce((sum, s) => sum + Number(s.totalMarks || 100), 0);
              return ((totalObt / totalMax) * 100).toFixed(1) + '%';
            })()}
          </p>
        </div>
      </div>

      {/* Grading Key */}
      <div className="mb-12 border border-gray-300 p-3 bg-gray-50 rounded text-[10px] text-gray-600 flex justify-between font-bold">
        <span>Grading Key:</span>
        <span>A+ (90-100)</span>
        <span>A (80-89)</span>
        <span>B+ (70-79)</span>
        <span>B (60-69)</span>
        <span>C (50-59)</span>
        <span>Fail (Below 33)</span>
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-end mt-12 px-4">
        <div className="text-center">
          <div className="border-b-2 border-black w-40 mb-2"></div>
          <p className="text-xs font-bold uppercase text-gray-600">Class Teacher</p>
        </div>
        <div className="text-center">
          <div className="border-b-2 border-black w-40 mb-2"></div>
          <p className="text-xs font-bold uppercase text-gray-600">Principal</p>
        </div>
      </div>

    </div>
  );
};

export default MarkSheetPrintTemplate;
