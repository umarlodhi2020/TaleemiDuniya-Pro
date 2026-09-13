import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Trash2, 
  ArrowRight, 
  Database, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CreditCard,
  FileText,
  RefreshCw
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

const TEMPLATES = {
  students: {
    label: 'Students Bulk Import',
    icon: GraduationCap,
    collection: 'students',
    sampleHeaders: ['rollNumber', 'name', 'class', 'section', 'fatherName', 'phone', 'feeStatus', 'status'],
    sampleRow: ['101', 'Ali Khan', '10', 'A', 'Zafar Khan', '03001234567', 'Paid', 'Active'],
    instructions: 'Upload CSV with student records. Roll Number must be unique.'
  },
  staff: {
    label: 'Staff & Teachers Import',
    icon: Users,
    collection: 'staff',
    sampleHeaders: ['employeeId', 'name', 'designation', 'phone', 'salary', 'email', 'status'],
    sampleRow: ['EMP001', 'Ayesha Malik', 'Senior Teacher', '03331234567', '65000', 'ayesha@school.com', 'Active'],
    instructions: 'Upload CSV with staff & teacher details.'
  },
  fees: {
    label: 'Fee Records & Challans',
    icon: CreditCard,
    collection: 'fees',
    sampleHeaders: ['rollNumber', 'studentName', 'month', 'amount', 'dueDate', 'status'],
    sampleRow: ['101', 'Ali Khan', 'July 2026', '8500', '2026-07-10', 'Pending'],
    instructions: 'Import past pending fee balances or monthly challan data.'
  },
  library: {
    label: 'Library Books Stock',
    icon: BookOpen,
    collection: 'library',
    sampleHeaders: ['bookId', 'title', 'author', 'isbn', 'quantity', 'category'],
    sampleRow: ['LIB101', 'Introduction to Physics', 'Dr. H. C. Verma', '978-8177091878', '15', 'Science'],
    instructions: 'Upload books inventory for library cataloging.'
  }
};

const DataImport = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [activeTab, setActiveTab] = useState('students');
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const currentTemplate = TEMPLATES[activeTab];

  // Simple CSV parser supporting quotes and commas
  const parseCSV = (text) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      alert('Please provide at least a header row and one data row.');
      return;
    }

    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else if (char === '\t' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const parsedHeaders = parseLine(lines[0]);
    setHeaders(parsedHeaders);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      if (vals.length === 0 || (vals.length === 1 && vals[0] === '')) continue;

      const rowObj = { _id: `row_${i}`, _isValid: true, _error: '' };
      parsedHeaders.forEach((header, idx) => {
        rowObj[header] = vals[idx] || '';
      });

      // Basic validation
      if (!rowObj[parsedHeaders[0]] || !rowObj[parsedHeaders[1]]) {
        rowObj._isValid = false;
        rowObj._error = `Missing ${parsedHeaders[0]} or ${parsedHeaders[1]}`;
      }

      rows.push(rowObj);
    }

    setParsedRows(rows);
    setStatusMessage(`Parsed ${rows.length} rows successfully.`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setRawText(content);
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleManualParse = () => {
    if (!rawText.trim()) {
      alert('Please paste CSV or Tab-delimited Excel data first.');
      return;
    }
    parseCSV(rawText);
  };

  const handleDownloadSample = () => {
    const csvContent = [
      currentTemplate.sampleHeaders.join(','),
      currentTemplate.sampleRow.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_sample_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteRow = (id) => {
    setParsedRows(parsedRows.filter(r => r._id !== id));
  };

  const handleStartImport = async () => {
    const validRows = parsedRows.filter(r => r._isValid);
    if (validRows.length === 0) {
      alert('No valid rows found to import.');
      return;
    }

    if (!window.confirm(`Are you sure you want to import ${validRows.length} records into [${currentTemplate.label}]?`)) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setSuccessCount(0);
    setErrorCount(0);
    setStatusMessage('Starting cloud batch import...');

    try {
      const chunkSize = 400; // Firestore batch limit is 500
      let processed = 0;

      for (let i = 0; i < validRows.length; i += chunkSize) {
        const chunk = validRows.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((row) => {
          const docId = row[headers[0]] ? `${schoolId}_${row[headers[0]]}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` : doc(collection(db, currentTemplate.collection)).id;
          const docRef = doc(db, currentTemplate.collection, docId);

          const recordData = { ...row };
          delete recordData._id;
          delete recordData._isValid;
          delete recordData._error;

          recordData.schoolId = schoolId;
          recordData.createdAt = new Date();
          recordData.importedVia = 'Bulk_Excel_CSV_Importer';
          recordData.importedBy = userData?.name || 'Admin';

          batch.set(docRef, recordData);
        });

        await batch.commit();
        processed += chunk.length;
        setUploadProgress(Math.round((processed / validRows.length) * 100));
        setSuccessCount(processed);
        setStatusMessage(`Successfully imported ${processed} of ${validRows.length} records...`);
      }

      setStatusMessage(`🎉 Complete! Imported ${validRows.length} records into ${currentTemplate.label} successfully.`);
      setParsedRows([]);
      setRawText('');
    } catch (error) {
      console.error('Import error:', error);
      setStatusMessage(`❌ Error during batch import: ${error.message}`);
      setErrorCount(validRows.length - successCount);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
            Data Migration Center
          </span>
          <h1 className="text-3xl font-black mt-2 flex items-center gap-3">
            <UploadCloud className="text-primary-500" size={32} />
            Bulk Excel / CSV Data Importer
          </h1>
          <p className="text-dark-muted mt-1 text-sm">
            Easily migrate students, staff, and financial records from Excel sheets directly into Cloud Firestore.
          </p>
        </div>

        <button 
          onClick={handleDownloadSample}
          className="premium-button-secondary flex items-center gap-2 self-start md:self-auto"
        >
          <Download size={18} />
          Download Sample Template (.CSV)
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(TEMPLATES).map(([key, item]) => {
          const Icon = item.icon;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setParsedRows([]);
                setRawText('');
                setStatusMessage('');
              }}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center gap-2 ${
                isActive 
                  ? 'bg-primary-600/20 border-primary-500 text-white shadow-lg shadow-primary-500/10 scale-[1.02]' 
                  : 'bg-dark-card border-dark-border text-dark-muted hover:border-primary-500/50 hover:text-white'
              }`}
            >
              <Icon size={24} className={isActive ? 'text-primary-400' : 'text-dark-muted'} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Upload Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="text-primary-400" size={20} />
              Step 1: Upload or Paste
            </h3>
            <p className="text-xs text-dark-muted mt-1">
              {currentTemplate.instructions}
            </p>

            {/* File Input */}
            <div className="mt-4">
              <label className="block w-full border-2 border-dashed border-dark-border hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-dark-bg/50 group">
                <input 
                  type="file" 
                  accept=".csv,.txt" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <UploadCloud className="mx-auto text-dark-muted group-hover:text-primary-400 transition-colors mb-2" size={32} />
                <p className="text-sm font-bold group-hover:text-white transition-colors">Click to upload CSV / TXT</p>
                <p className="text-[11px] text-dark-muted mt-1">or drag & drop your exported file here</p>
              </label>
            </div>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-dark-border w-full"></div>
              <span className="bg-dark-card px-2 text-[10px] text-dark-muted uppercase font-bold absolute">or paste directly</span>
            </div>

            {/* Textarea Paste */}
            <div>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste CSV or Tabbed Excel rows copied directly from MS Excel..."
                className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
              <button
                onClick={handleManualParse}
                className="w-full mt-2 premium-button-secondary py-2 text-xs font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                Parse Pasted Data
              </button>
            </div>
          </div>

          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 text-xs text-primary-300">
            <p className="font-bold mb-1 flex items-center gap-1">
              <AlertTriangle size={14} className="text-amber-400" />
              Required Headers:
            </p>
            <p className="font-mono text-[11px] text-white">
              {currentTemplate.sampleHeaders.join(', ')}
            </p>
          </div>
        </GlassCard>

        {/* Step 2: Preview & Import Table */}
        <GlassCard className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dark-border">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Database className="text-primary-400" size={20} />
                  Step 2: Preview & Validate Rows ({parsedRows.length})
                </h3>
                {statusMessage && (
                  <p className={`text-xs mt-1 font-semibold ${statusMessage.includes('❌') ? 'text-red-400' : 'text-green-400'}`}>
                    {statusMessage}
                  </p>
                )}
              </div>

              {parsedRows.length > 0 && (
                <button
                  onClick={handleStartImport}
                  disabled={uploading}
                  className="premium-button-primary py-2 px-5 text-sm font-bold flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  {uploading ? `Uploading (${uploadProgress}%)...` : `Import ${parsedRows.filter(r => r._isValid).length} Records`}
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-dark-bg rounded-full h-3 overflow-hidden border border-dark-border">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-purple-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-dark-muted mt-1">
                  <span>Progress: {uploadProgress}%</span>
                  <span>{successCount} Imported | {errorCount} Failed</span>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="mt-4 overflow-x-auto max-h-[380px] border border-dark-border rounded-xl">
              {parsedRows.length === 0 ? (
                <div className="p-12 text-center text-dark-muted">
                  <FileText className="mx-auto mb-2 opacity-40" size={40} />
                  <p className="text-sm font-medium">No records loaded yet.</p>
                  <p className="text-xs mt-1">Upload a CSV file or paste data on the left to preview rows here.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-dark-bg text-dark-muted sticky top-0 uppercase font-bold text-[11px] border-b border-dark-border z-10">
                    <tr>
                      <th className="p-3 w-10">#</th>
                      <th className="p-3 w-16">Status</th>
                      {headers.map((h, i) => (
                        <th key={i} className="p-3 font-mono text-primary-300">{h}</th>
                      ))}
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border font-medium">
                    {parsedRows.map((row, idx) => (
                      <tr key={row._id} className={row._isValid ? 'hover:bg-dark-bg/60' : 'bg-red-500/10 hover:bg-red-500/20 text-red-300'}>
                        <td className="p-3 text-dark-muted">{idx + 1}</td>
                        <td className="p-3">
                          {row._isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold">
                              <CheckCircle2 size={12} /> OK
                            </span>
                          ) : (
                            <span title={row._error} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                              <AlertTriangle size={12} /> {row._error || 'Invalid'}
                            </span>
                          )}
                        </td>
                        {headers.map((h, i) => (
                          <td key={i} className="p-3 max-w-[150px] truncate">{row[h] || '-'}</td>
                        ))}
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteRow(row._id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            title="Remove row from import"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between text-xs text-dark-muted">
            <span>Valid records: <strong className="text-green-400">{parsedRows.filter(r => r._isValid).length}</strong></span>
            <span>Target Collection: <strong className="text-primary-400 uppercase font-mono">/{currentTemplate.collection}</strong></span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default DataImport;
