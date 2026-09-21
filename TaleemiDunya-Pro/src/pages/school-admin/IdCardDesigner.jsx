import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Save, Plus, Type, Image as ImageIcon, QrCode, Layout, Settings, Trash2 } from 'lucide-react';
import { getSingleRecord, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import QRCode from 'react-qr-code';
import Swal from 'sweetalert2';

const DEFAULT_CARD = {
  width: 210, // mm to px approx (standard card)
  height: 315,
  backgroundColor: '#ffffff',
  backgroundImage: '',
  backgroundOpacity: 100,
  elements: []
};

const IdCardDesigner = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || 'default-school';

  const [template, setTemplate] = useState(DEFAULT_CARD);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplate();
  }, [schoolId]);

  const fetchTemplate = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      const schoolDoc = await getSingleRecord('schools', schoolId);
      if (schoolDoc?.customIdCardTemplate) {
        setTemplate(schoolDoc.customIdCardTemplate);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const saveTemplate = async () => {
    if (!schoolId) return;
    try {
      Swal.fire({ title: 'Saving...', didOpen: () => Swal.showLoading() });
      await updateRecord('schools', schoolId, { customIdCardTemplate: template });
      Swal.fire('Saved!', 'Custom ID Card Template saved successfully.', 'success');
    } catch (e) {
      Swal.fire('Error', 'Failed to save template', 'error');
    }
  };

  const addElement = (type, field = '') => {
    const newElement = {
      id: Date.now().toString(),
      type,
      field,
      x: 20,
      y: 20,
      width: type === 'profilePhoto' || type === 'qrCode' ? 80 : 100,
      height: type === 'profilePhoto' || type === 'qrCode' ? 80 : 30,
      text: type === 'staticText' ? 'Double Click to Edit' : `{{${field}}}`,
      fontSize: 14,
      color: type === 'qrCode' ? '#000000' : '#000000',
      fontWeight: 'normal',
      textAlign: 'left',
      backgroundColor: type === 'qrCode' ? '#ffffff' : 'transparent',
      borderRadius: type === 'profilePhoto' ? '50%' : '0px'
    };
    setTemplate({ ...template, elements: [...template.elements, newElement] });
    setSelectedElementId(newElement.id);
  };

  const toggleOrientation = (mode) => {
    if (mode === 'portrait') {
      setTemplate({ ...template, width: 210, height: 315 });
    } else {
      setTemplate({ ...template, width: 315, height: 210 });
    }
  };

  const updateElement = (id, updates) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el)
    }));
  };

  const deleteElement = (id) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id)
    }));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleDragStop = (id, e, d) => {
    updateElement(id, { x: d.x, y: d.y });
  };

  const handleResizeStop = (id, e, direction, ref, delta, position) => {
    updateElement(id, {
      width: parseInt(ref.style.width, 10),
      height: parseInt(ref.style.height, 10),
      ...position
    });
  };

  const selectedElement = template.elements.find(e => e.id === selectedElementId);

  if (loading) return <div className="p-8 text-center">Loading Designer...</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
      {/* LEFT SIDEBAR: Tools */}
      <div className="w-64 bg-white border-r shadow-sm p-4 flex flex-col space-y-2 overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Layout size={20}/> Tools</h2>
        
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase">General</p>
          <button onClick={() => addElement('staticText')} className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition"><Type size={16}/> Static Text</button>
          <button onClick={() => addElement('profilePhoto')} className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition"><ImageIcon size={16}/> Profile Photo</button>
          <button onClick={() => addElement('qrCode')} className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition"><QrCode size={16}/> QR Code</button>
        </div>

        <div className="space-y-1 mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Dynamic Fields</p>
          {['name', 'rollNumber', 'class', 'fatherName', 'phone', 'bloodGroup', 'address'].map(field => (
            <button key={field} onClick={() => addElement('dynamicText', field)} className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-blue-50 rounded border border-transparent hover:border-blue-100 transition">
              <Plus size={16} className="text-blue-500"/> {field}
            </button>
          ))}
        </div>
      </div>

      {/* CENTER: Canvas Workspace */}
      <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center overflow-auto" onClick={() => setSelectedElementId(null)}>
        <div 
          className="relative shadow-2xl bg-white rounded-xl transition-colors border border-gray-300 overflow-hidden"
          style={{ width: template.width, height: template.height, backgroundColor: template.backgroundColor }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Image Watermark */}
          {template.backgroundImage && (
            <div 
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                backgroundImage: `url(${template.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: (template.backgroundOpacity || 100) / 100
              }}
            />
          )}

          {template.elements.map(el => (
            <Rnd
              key={el.id}
              size={{ width: el.width, height: el.height }}
              position={{ x: el.x, y: el.y }}
              onDragStop={(e, d) => handleDragStop(el.id, e, d)}
              onResizeStop={(e, dir, ref, delta, pos) => handleResizeStop(el.id, e, dir, ref, delta, pos)}
              onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
              bounds="parent"
              className={`${selectedElementId === el.id ? 'border-2 border-indigo-500 border-dashed z-50' : 'border border-transparent hover:border-gray-300 z-10'} group`}
            >
              <div 
                style={{
                  width: '100%', height: '100%',
                  fontSize: `${el.fontSize}px`, color: el.color, fontWeight: el.fontWeight,
                  textAlign: el.textAlign, backgroundColor: el.backgroundColor, borderRadius: el.borderRadius,
                  display: 'flex', alignItems: 'center', justifyContent: el.textAlign === 'center' ? 'center' : 'flex-start',
                  overflow: 'hidden'
                }}
              >
                {el.type === 'profilePhoto' ? (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400"><ImageIcon size={32}/></div>
                ) : el.type === 'qrCode' ? (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: el.backgroundColor }}>
                    <QRCode value="123456" size={el.width} fgColor={el.color} bgColor={el.backgroundColor === 'transparent' ? '#ffffff' : el.backgroundColor} style={{ width: '100%', height: '100%' }} />
                  </div>
                ) : (
                  <span className="w-full px-1">{el.text}</span>
                )}
              </div>
            </Rnd>
          ))}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Properties */}
      <div className="w-72 bg-white border-l shadow-sm flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Settings size={20}/> Properties</h2>
          <button onClick={saveTemplate} className="bg-indigo-600 text-white px-4 py-1.5 rounded shadow hover:bg-indigo-700 flex items-center gap-2 text-sm"><Save size={16}/> Save</button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {!selectedElement ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Card Settings</h3>
              
              {/* Orientation */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Orientation</label>
                <div className="flex gap-2">
                  <button onClick={() => toggleOrientation('portrait')} className={`flex-1 py-1 text-xs border rounded ${template.width === 210 ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white'}`}>Portrait</button>
                  <button onClick={() => toggleOrientation('landscape')} className={`flex-1 py-1 text-xs border rounded ${template.width === 315 ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white'}`}>Landscape</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Background Color</label>
                <input type="color" value={template.backgroundColor} onChange={(e) => setTemplate({...template, backgroundColor: e.target.value})} className="w-full h-8 cursor-pointer rounded border" />
              </div>

              {/* Background Image */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Background Image URL</label>
                <div className="flex gap-1 mb-1">
                  <input type="text" value={template.backgroundImage || ''} onChange={(e) => setTemplate({...template, backgroundImage: e.target.value})} placeholder="https://..." className="w-full border rounded p-1.5 text-xs" />
                  <button onClick={() => setTemplate({...template, backgroundImage: schoolData?.logo || ''})} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 rounded text-[10px] whitespace-nowrap border" title="Use School Logo">School Logo</button>
                </div>
              </div>

              {template.backgroundImage && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Image Opacity: {template.backgroundOpacity || 100}%</label>
                  <input type="range" min="5" max="100" value={template.backgroundOpacity || 100} onChange={(e) => setTemplate({...template, backgroundOpacity: Number(e.target.value)})} className="w-full" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-semibold text-gray-700">Element Settings</h3>
                <button onClick={() => deleteElement(selectedElement.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
              </div>

              {(selectedElement.type === 'staticText' || selectedElement.type === 'dynamicText') && (
                <>
                  {selectedElement.type === 'staticText' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Text</label>
                      <input type="text" value={selectedElement.text} onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })} className="w-full border rounded p-1.5 text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Font Size</label>
                    <input type="number" value={selectedElement.fontSize} onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })} className="w-full border rounded p-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Font Weight</label>
                    <select value={selectedElement.fontWeight} onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value })} className="w-full border rounded p-1.5 text-sm">
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="900">Black</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Text Color</label>
                    <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} className="w-full h-8 cursor-pointer rounded border" />
                  </div>
                </>
              )}

              {selectedElement.type === 'qrCode' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">QR Foreground Color</label>
                  <input type="color" value={selectedElement.color} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} className="w-full h-8 cursor-pointer rounded border" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={selectedElement.backgroundColor === 'transparent' ? '#ffffff' : selectedElement.backgroundColor} onChange={(e) => updateElement(selectedElement.id, { backgroundColor: e.target.value })} className="flex-1 h-8 cursor-pointer rounded border" />
                  <button onClick={() => updateElement(selectedElement.id, { backgroundColor: 'transparent' })} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 border rounded text-[10px] text-gray-600">Transparent</button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdCardDesigner;
