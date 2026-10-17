import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Printer, Copy, Users, Save, Image as ImageIcon, Eye, Edit3, Palette, User, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { getRecords, updateRecord } from '../../services/db';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { renderStaffCard } from '../../components/id-cards/StaffCardRenderer';

const StaffIdCards = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || schoolData?.id || 'default-school';
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [previewStaffId, setPreviewStaffId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [departments, setDepartments] = useState(['All Departments']);

  const defaultSettings = schoolData?.staffIdCardSettings || {};

  const [settings, setSettings] = useState({
    schoolName: defaultSettings.schoolName || userData?.schoolName || schoolData?.name || 'Your School Name',
    cardSubtitle: defaultSettings.cardSubtitle || 'Staff Identity Card',
    principalName: defaultSettings.principalName || 'Principal Signature',
    themeColor: defaultSettings.themeColor || '#1e3a8a',
    orientation: defaultSettings.orientation || 'portrait',
    cardType: defaultSettings.cardType || 'both',
    showQRCode: defaultSettings.showQRCode !== false,
    showStamp: defaultSettings.showStamp !== false,
    showSignature: defaultSettings.showSignature !== false,
    bgImage: defaultSettings.bgImage || null,
    stampImage: defaultSettings.stampImage || null,
    logoImage: defaultSettings.logoImage || null,
    schoolAddress: schoolData?.address || 'Korangi, Karachi, Pakistan',
    schoolPhone: schoolData?.phone || '0300-1234567'
  });

  const [activeTab, setActiveTab] = useState('template'); // template, design, fields
  const bgInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const staffData = await getRecords('staff', schoolId);
      if (staffData) {
        setStaff(staffData);
        if (staffData.length > 0) {
          setPreviewStaffId(staffData[0].id);
          const depts = new Set(['All Departments']);
          staffData.forEach(s => { if (s.department) depts.add(s.department) });
          setDepartments(Array.from(depts));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = staff;
    if (searchQuery) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (selectedDept !== 'All Departments') {
      filtered = filtered.filter(s => s.department === selectedDept);
    }
    setFilteredStaff(filtered);
    setCurrentPage(1);
  }, [staff, searchQuery, selectedDept]);

  const toggleStaffSelection = (id) => {
    if (selectedStaffIds.includes(id)) {
      setSelectedStaffIds(prev => prev.filter(sid => sid !== id));
    } else {
      setSelectedStaffIds(prev => [...prev, id]);
    }
    setPreviewStaffId(id);
  };

  const selectAllStaff = () => {
    if (selectedStaffIds.length === filteredStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(filteredStaff.map(s => s.id));
    }
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleBgUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleSettingChange('bgImage', event.target.result);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const saveSettings = async () => {
    try {
      await updateRecord('schools', schoolId, { staffIdCardSettings: settings });
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);
  const [printTarget, setPrintTarget] = useState('auto'); // 'auto', 'single', 'selected', 'all'
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const [bulkMode, setBulkMode] = useState('all');

  const previewStaff = staff.find(s => s.id === previewStaffId) || staff[0] || {};
  const selectedStaffData = staff.filter(s => selectedStaffIds.includes(s.id));

  // Determine what staff should be printed dynamically
  const staffToPrint = React.useMemo(() => {
    if (printTarget === 'single') {
      return previewStaff?.id ? [previewStaff] : (staff.length > 0 ? [staff[0]] : []);
    }
    if (printTarget === 'all') {
      return filteredStaff.length > 0 ? filteredStaff : staff;
    }
    if (printTarget === 'selected') {
      const selected = staff.filter(s => selectedStaffIds.includes(s.id));
      if (selected.length > 0) return selected;
      return previewStaff?.id ? [previewStaff] : (staff.length > 0 ? [staff[0]] : []);
    }
    // 'auto' mode (triggered by Ctrl+P or default print)
    if (selectedStaffIds.length > 0) {
      return staff.filter(s => selectedStaffIds.includes(s.id));
    }
    if (previewStaff?.id) {
      return [previewStaff];
    }
    return filteredStaff.length > 0 ? filteredStaff : staff;
  }, [printTarget, selectedStaffIds, staff, filteredStaff, previewStaff]);

  // Guaranteed fallback so print output is NEVER empty
  const finalStaffToPrint = staffToPrint.length > 0 ? staffToPrint : (
    staff.length > 0 ? [staff[0]] : [
      {
        id: 'sample-staff-1',
        name: 'Staff Member',
        department: 'Academics',
        employeeId: 'STF-001',
        cnic: '42101-1234567-1',
        phone: '0300-1234567',
        role: 'Teacher'
      }
    ]
  );

  const handlePrint = (target = 'auto') => {
    setPrintTarget(target);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
      setPrintTarget('auto');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // Pagination for staff list (simple implementation for UI match)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const paginatedStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);

  const colors = [
    { name: 'Blue', value: '#1e3a8a', class: 'bg-[#1e3a8a]' },
    { name: 'Light Blue', value: '#3b82f6', class: 'bg-[#3b82f6]' },
    { name: 'Green', value: '#059669', class: 'bg-[#059669]' },
    { name: 'Purple', value: '#7c3aed', class: 'bg-[#7c3aed]' },
    { name: 'Gray', value: '#4b5563', class: 'bg-[#4b5563]' }
  ];

  const principalRule = schoolData?.signatureSettings?.rules?.find(r => r.type === 'Principal');
  const principalSignatureUrl = schoolData?.signatureSettings?.principalSignatureUrl || principalRule?.signatureUrl || null;

  const currentSettings = {
    ...settings,
    logoImage: schoolData?.branding?.logo || schoolData?.logo || userData?.schoolLogo || settings.logoImage || null,
    stampImage: principalSignatureUrl || settings.stampImage || null
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-gray-800 p-4 md:p-6 font-sans">
      {/* Print Styles */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm 6mm;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
          }

          /* Force exact print colors, backgrounds, and images */
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide app layout chrome, sidebars, headers, floating widgets, buttons, and no-print elements */
          aside,
          header,
          nav,
          .no-print,
          .print-hide,
          .print\\:hidden,
          [class*="print:hidden"],
          button,
          [class*="fixed"],
          [class*="sticky"] {
            display: none !important;
          }

          #root,
          .min-h-screen,
          main,
          main > div {
            overflow: visible !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: #ffffff !important;
          }

          /* Hide everything by default */
          body * {
            visibility: hidden;
          }

          /* Make ONLY staff print area and its contents visible */
          #staff-id-cards-print-area,
          #staff-id-cards-print-area *,
          #print-area,
          #print-area *,
          .printable-report-area,
          .printable-report-area * {
            visibility: visible !important;
          }

          #staff-id-cards-print-area,
          #print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .print-card-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Staff ID Card</h1>
            <p className="text-xs text-gray-500">Create, customize and manage staff ID cards for your school.</p>
          </div>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span>Home</span> &gt; <span className="font-semibold text-gray-700">Staff ID Card</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        
        {/* LEFT PANEL: Staff Selection */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <Users size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-800 text-sm">Select Staff</h2>
          </div>
          <div className="p-4 border-b border-gray-100 space-y-3">
            <p className="text-xs text-gray-500">Choose a staff member to create ID card.</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name, staff ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-blue-500"
              >
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-10 text-xs text-gray-400">Loading staff...</div>
            ) : paginatedStaff.map(st => (
              <div 
                key={st.id}
                onClick={() => toggleStaffSelection(st.id)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  previewStaffId === st.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div 
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedStaffIds.includes(st.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}
                >
                  {selectedStaffIds.includes(st.id) && <Check size={12} className="text-white" />}
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {(() => {
                    const stPhoto = st.profilePhoto || st.photoUrl || st.photo || st.avatar || st.imageUrl || st.picture || st.image;
                    return stPhoto ? (
                      <img
                        src={stPhoto}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <User size={16} className="m-auto h-full text-gray-400" />
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 truncate">{st.name}</h4>
                  <p className="text-[10px] text-gray-500 truncate">
                    {st.employeeId || st.staffId || (st.id ? st.id.substring(0, 8).toUpperCase() : 'STF-001')} • {st.department || st.role || 'Admin'}
                  </p>
                </div>
                <div className="shrink-0 text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
                  Active
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs text-gray-500">Showing {Math.min(1 + (currentPage - 1) * itemsPerPage, filteredStaff.length)} to {Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length}</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center disabled:opacity-50"
              >
                <ChevronLeft size={14} />
              </button>
              <button className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {currentPage}
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center disabled:opacity-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Preview */}
        <div className="lg:col-span-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[700px] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
              <button 
                onClick={() => handleSettingChange('cardType', 'front')}
                className={`px-5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  settings.cardType === 'front' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Front Side
              </button>
              <button 
                onClick={() => handleSettingChange('cardType', 'back')}
                className={`px-5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  settings.cardType === 'back' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Back Side
              </button>
              <button 
                onClick={() => handleSettingChange('cardType', 'both')}
                className={`px-5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  settings.cardType === 'both' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Both Sides
              </button>
            </div>

            <button
              onClick={() => handlePrint('single')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Print this previewed ID Card"
            >
              <Printer size={13} />
              <span>Print This Card</span>
            </button>
          </div>

          <div className="flex-1 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden p-4 flex items-center justify-center">
             {previewStaff.id ? (
               <div className="scale-[0.75] origin-center flex items-center justify-center w-full h-full">
                 {renderStaffCard(previewStaff, false, currentSettings)}
               </div>
             ) : (
                <div className="text-gray-400 text-sm">Select a staff member to preview</div>
             )}
          </div>
        </div>

        {/* RIGHT PANEL: Settings */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <Palette size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-800 text-sm">Card Settings</h2>
          </div>
          
          <div className="flex border-b border-gray-200">
            <button onClick={() => setActiveTab('template')} className={`flex-1 py-3 text-[11px] font-bold text-center border-b-2 transition-colors ${activeTab === 'template' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Template</button>
            <button onClick={() => setActiveTab('fields')} className={`flex-1 py-3 text-[11px] font-bold text-center border-b-2 transition-colors ${activeTab === 'fields' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Fields</button>
            <button onClick={() => setActiveTab('design')} className={`flex-1 py-3 text-[11px] font-bold text-center border-b-2 transition-colors ${activeTab === 'design' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Design</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'template' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">School Name</label>
                  <input type="text" value={settings.schoolName} onChange={(e) => handleSettingChange('schoolName', e.target.value)} className="w-full p-2 text-xs border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Card Subtitle</label>
                  <input type="text" value={settings.cardSubtitle} onChange={(e) => handleSettingChange('cardSubtitle', e.target.value)} className="w-full p-2 text-xs border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Principal Name</label>
                  <input type="text" value={settings.principalName} onChange={(e) => handleSettingChange('principalName', e.target.value)} className="w-full p-2 text-xs border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none" />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Theme Color</label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(color => (
                      <button 
                        key={color.value}
                        onClick={() => handleSettingChange('themeColor', color.value)}
                        className={`w-6 h-6 rounded-full shadow-sm transition-transform ${settings.themeColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 block mb-2">Custom Image (Optional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                    <ImageIcon className="mx-auto text-gray-400 mb-2" size={20} />
                    <button onClick={() => bgInputRef.current?.click()} className="text-xs font-semibold text-blue-600 mb-1">
                      Upload Background Image
                    </button>
                    <p className="text-[9px] text-gray-500">Recommended size: 800x1200px</p>
                    <input type="file" ref={bgInputRef} onChange={handleBgUpload} className="hidden" accept="image/*" />
                    
                    {settings.bgImage && (
                      <div className="mt-2 text-[10px] text-red-500 cursor-pointer font-bold" onClick={() => handleSettingChange('bgImage', null)}>
                        Remove Image
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                  <span className="text-xs font-semibold text-gray-700">Show QR Code</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.showQRCode} onChange={(e) => handleSettingChange('showQRCode', e.target.checked)} />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                  <span className="text-xs font-semibold text-gray-700">Show School Stamp</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.showStamp} onChange={(e) => handleSettingChange('showStamp', e.target.checked)} />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                  <span className="text-xs font-semibold text-gray-700">Show Principal Signature</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={settings.showSignature} onChange={(e) => handleSettingChange('showSignature', e.target.checked)} />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="pt-2">
                   <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">School Address (Back Side)</label>
                   <input 
                     type="text" 
                     value={settings.schoolAddress}
                     onChange={(e) => handleSettingChange('schoolAddress', e.target.value)}
                     className="w-full p-2 text-xs border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none"
                   />
                </div>
              </div>
            )}
            
            {activeTab === 'design' && (
              <div className="space-y-4 text-center py-10 text-xs text-gray-500">
                <Palette size={32} className="mx-auto text-gray-300 mb-2" />
                Additional design settings like custom fonts and overlay opacity can be configured here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 no-print">
        {/* ID Card Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Edit3 size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-sm">Save & Manage</h3>
          </div>
          <p className="text-[10px] text-gray-500 mb-4">Save template for future use.</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button className="py-2.5 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-50">
              <Eye size={14} /> Preview
            </button>
            <button className="py-2.5 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-50">
              <Edit3 size={14} /> Edit Design
            </button>
          </div>
          <button 
            onClick={saveSettings}
            className="w-full py-3 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>

        {/* Bulk Generate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-sm">Bulk Generate ID Cards</h3>
          </div>
          <p className="text-[10px] text-gray-500 mb-4">Generate and print multiple staff ID cards together.</p>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-4 text-xs font-semibold text-gray-700">
              <label 
                className="flex items-center gap-2 cursor-pointer" 
                onClick={() => {
                  setBulkMode('all');
                  if (selectedStaffIds.length !== filteredStaff.length) {
                    selectAllStaff();
                  }
                }}
              >
                <div className={`w-4 h-4 rounded-full border-4 flex items-center justify-center ${bulkMode === 'all' || selectedStaffIds.length === filteredStaff.length ? 'border-blue-600 bg-white' : 'border-gray-300'}`} />
                All Staff ({filteredStaff.length})
              </label>
              <label 
                className="flex items-center gap-2 cursor-pointer" 
                onClick={() => {
                  setBulkMode('selected');
                  if (selectedStaffIds.length === 0 && filteredStaff.length > 0) {
                    setSelectedStaffIds([filteredStaff[0].id]);
                  }
                }}
              >
                <div className={`w-4 h-4 rounded-full border-4 flex items-center justify-center ${bulkMode === 'selected' && selectedStaffIds.length > 0 ? 'border-blue-600 bg-white' : 'border-gray-300'}`} />
                Selected Staff ({selectedStaffIds.length})
              </label>
            </div>
            
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Cards Per Page</label>
              <select 
                value={cardsPerPage}
                onChange={(e) => setCardsPerPage(Number(e.target.value))}
                className="w-full p-2 text-xs border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none bg-gray-50 font-medium"
              >
                <option value={4}>4 Cards per A4 Sheet (Recommended)</option>
                <option value={6}>6 Cards per A4 Sheet</option>
                <option value={8}>8 Cards per A4 Sheet</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => handlePrint(bulkMode === 'selected' && selectedStaffIds.length > 0 ? 'selected' : 'all')}
            disabled={staff.length === 0}
            className="w-full py-3 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 active:scale-[0.99] cursor-pointer"
          >
            <Copy size={16} /> {selectedStaffIds.length > 0 && bulkMode === 'selected' ? `Print Selected Cards (${selectedStaffIds.length})` : `Generate All Cards (${filteredStaff.length})`}
          </button>
        </div>

        {/* Print & Download */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Printer size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-sm">Print & Download</h3>
          </div>
          <p className="text-[10px] text-gray-500 mb-4">Print cards directly or save as high-res PDF.</p>
          <div className="space-y-2.5">
            <button 
              onClick={() => handlePrint('auto')}
              disabled={staff.length === 0}
              className="w-full py-2.5 flex items-center justify-center gap-2 bg-gray-900 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-gray-800 transition-colors disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              <Printer size={14} /> {selectedStaffIds.length > 0 ? `Print Selected (${selectedStaffIds.length} Cards)` : `Print Current Card (${previewStaff.name || 'Staff'})`}
            </button>
            <button 
              onClick={() => handlePrint('all')}
              disabled={filteredStaff.length === 0}
              className="w-full py-2 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-semibold text-xs rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Users size={14} /> Print All Staff ({filteredStaff.length})
            </button>
          </div>
        </div>
      </div>

      {/* Print Area Container */}
      <div 
        id="staff-id-cards-print-area" 
        className="hidden print:block printable-report-area text-black bg-white"
      >
        <div className="bg-white w-full max-w-[800px] mx-auto p-2">
          {currentSettings.cardType === 'both' ? (
            <div className="flex flex-col items-center gap-6 w-full py-2">
              {finalStaffToPrint.map((st) => (
                <div 
                  key={st.id} 
                  className="print-card-break flex flex-row items-center justify-center gap-4 py-2 w-full"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <div className="relative">
                    {renderStaffCard(st, true, { ...currentSettings, cardType: 'front' })}
                  </div>
                  <div className="border-l-2 border-dashed border-gray-400 h-[290px] mx-1 opacity-60 flex items-center justify-center relative">
                    <span className="absolute -top-3 text-[9px] text-gray-400 font-mono">✂</span>
                  </div>
                  <div className="relative">
                    {renderStaffCard(st, true, { ...currentSettings, cardType: 'back' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 justify-items-center w-full py-2">
              {finalStaffToPrint.map((st) => (
                <div 
                  key={st.id} 
                  className="print-card-break inline-block"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  {renderStaffCard(st, true, currentSettings)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffIdCards;
