const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'school-admin', 'SMSPanel.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update imports
const oldImport = `import { getRecords, addRecord } from '../../services/db';`;
const newImport = `import { getRecords, addRecord, updateRecord } from '../../services/db';\nimport { Phone, MapPin, ShieldAlert, Save } from 'lucide-react';`;

if (!content.includes('updateRecord')) {
  content = content.replace(oldImport, newImport);
}

// 2. Add state & handlers right before useEffect of Poll Real Baileys Server
const stateMarker = `// Poll Real Baileys Server if running on Alwaysdata Cloud`;
const stateCode = `  // Custom Unregistered Notice / Warning Message State
  const defaultNoticeNote = 'Bacho ki confidential information (Fees, Attendance, Results) ki hifazat ke liye TaleemiDunya AI Assistant sirf verified parent contacts ko direct access deta hai.';
  const [warningHelpline, setWarningHelpline] = useState('');
  const [warningCampus, setWarningCampus] = useState('');
  const [warningCustomNote, setWarningCustomNote] = useState(defaultNoticeNote);
  const [warningTemplate, setWarningTemplate] = useState('');
  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [savingWarning, setSavingWarning] = useState(false);
  const [warningSavedSuccess, setWarningSavedSuccess] = useState(false);

  // Sync warning state with schoolData
  useEffect(() => {
    const unreg = schoolData?.eServices?.whatsApp?.unregisteredNotice;
    if (unreg) {
      if (unreg.helpline) setWarningHelpline(unreg.helpline);
      if (unreg.campus) setWarningCampus(unreg.campus);
      if (unreg.customNote) setWarningCustomNote(unreg.customNote);
      if (unreg.template) {
        setWarningTemplate(unreg.template);
        setUseCustomTemplate(true);
      }
    } else if (schoolData) {
      if (!warningHelpline) setWarningHelpline(schoolData.phone || '0300-1234567');
      if (!warningCampus) setWarningCampus(schoolData.address || 'Main Campus, Pakistan');
    }
  }, [schoolData]);

  // Handler to save Warning Settings
  const handleSaveWarningSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingWarning(true);
    setWarningSavedSuccess(false);

    const schoolId = schoolData?.id || userData?.schoolId || 'NNRuCtHxQNjISc9EPgMs';
    const noticeData = {
      helpline: warningHelpline || schoolData?.phone || '0300-1234567',
      campus: warningCampus || schoolData?.address || 'Main Campus',
      customNote: warningCustomNote || defaultNoticeNote,
      template: useCustomTemplate ? warningTemplate : '',
      updatedAt: new Date().toISOString()
    };

    try {
      // 1. Save directly to Firestore under school document
      await updateRecord('schools', schoolId, {
        'eServices.whatsApp.unregisteredNotice': noticeData
      });

      // 2. Also notify Alwaysdata bot server to invalidate cache immediately
      try {
        await fetch(\`\${WA_SERVER}/api/settings/warning\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId,
            ...noticeData
          })
        });
      } catch (apiErr) {
        console.warn('Backend API notification non-fatal:', apiErr.message);
      }

      setWarningSavedSuccess(true);
      setTimeout(() => setWarningSavedSuccess(false), 4000);
      alert('✅ Unregistered warning message and contact details saved successfully! WhatsApp Bot is updated.');
    } catch (err) {
      console.error('Error saving warning settings:', err);
      alert('Error saving settings: ' + err.message);
    } finally {
      setSavingWarning(false);
    }
  };

  // Preview calculations
  const previewNumber = '+92 326 8973045';
  const previewHelpline = warningHelpline || schoolData?.phone || '0300-1234567';
  const previewCampus = warningCampus || schoolData?.address || 'Main Campus, Lahore, Pakistan';
  const previewSchool = schoolData?.name || 'Smart Angels Grammar School';
  const previewNote = warningCustomNote || defaultNoticeNote;

  let renderedWarningPreview = '';
  if (useCustomTemplate && warningTemplate.trim()) {
    renderedWarningPreview = warningTemplate
      .replace(/\\{phone\\}/g, \` (\${previewNumber})\`)
      .replace(/\\{schoolName\\}/g, previewSchool)
      .replace(/\\{helpline\\}/g, previewHelpline)
      .replace(/\\{campus\\}/g, previewCampus);
  } else {
    renderedWarningPreview = \`Assalam-o-Alaikum! Aap ka WhatsApp account (\${previewNumber}) hamare school record mein registered nahi mila.\\n\\n🛡️ *Student Privacy Protection:*\\n\${previewNote}\\n\\nBarah-e-karam school administration se rabta karein aur apna registered mobile number verify karwa lein:\\n📞 *School Admin Helpline:* \${previewHelpline}\\n📍 *Campus:* \${previewCampus}\\n\\n💡 *Available Public Options:*\\n6️⃣ New Admission Inquiry\\n7️⃣ Contact Administration\`;
  }

  ` + stateMarker;

if (!content.includes('warningHelpline')) {
  content = content.replace(stateMarker, stateCode);
}

// 3. Add the UI Component before `{/* Bottom Interactive Chat Simulator */}`
const uiMarker = `{/* Bottom Interactive Chat Simulator */}`;
const uiCard = `          {/* Custom Unregistered Warning & Privacy Notice Editor */}
          <GlassCard className="p-6 border-t-4 border-amber-500/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-dark-border">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-amber-400" size={20} />
                  <h3 className="text-lg font-black text-white">
                    Unregistered Number Warning & Privacy Notice Customizer
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                    Live Security Filter
                  </span>
                </div>
                <p className="text-xs text-dark-muted mt-1">
                  Jab koi anjaan ya unregistered parent WhatsApp par message kare, toh unhein yeh custom warning message, helpline number aur campus address show hoga.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWarningHelpline(schoolData?.phone || '0300-1234567');
                    setWarningCampus(schoolData?.address || 'Main Campus, Lahore');
                    setWarningCustomNote(defaultNoticeNote);
                    setUseCustomTemplate(false);
                    setWarningTemplate('');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-dark-muted hover:text-white bg-white/5 hover:bg-white/10 border border-dark-border transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Reset to Defaults
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Controls */}
              <form onSubmit={handleSaveWarningSettings} className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={13} /> School Admin Helpline Number:
                    </label>
                    <input
                      type="text"
                      value={warningHelpline}
                      onChange={(e) => setWarningHelpline(e.target.value)}
                      placeholder="e.g. 0300-1234567 / 0321-9876543"
                      className="premium-input text-xs py-2.5 font-mono"
                      required
                    />
                    <span className="text-[10px] text-dark-muted">Unregistered parent ko rabta karne ke liye yeh helpline dikhegi.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={13} /> School Campus / Office Address:
                    </label>
                    <input
                      type="text"
                      value={warningCampus}
                      onChange={(e) => setWarningCampus(e.target.value)}
                      placeholder="e.g. Main Campus, Lahore / Gulshan Campus"
                      className="premium-input text-xs py-2.5"
                      required
                    />
                    <span className="text-[10px] text-dark-muted">Parent ko campus verification ke liye address.</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={13} /> Custom Privacy Short Note:
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseCustomTemplate(!useCustomTemplate)}
                      className="text-[11px] font-bold text-primary-400 hover:text-primary-300 underline"
                    >
                      {useCustomTemplate ? '← Switch to Simple Mode' : '⚙️ Advanced: Edit Full Message Template'}
                    </button>
                  </div>

                  {!useCustomTemplate ? (
                    <>
                      <textarea
                        value={warningCustomNote}
                        onChange={(e) => setWarningCustomNote(e.target.value)}
                        placeholder="Type custom note explaining why verification is required..."
                        className="premium-input text-xs py-2.5 h-20 resize-none w-full"
                      />
                      <span className="text-[10px] text-dark-muted">
                        Yeh note "Student Privacy Protection" ke neeche show hoga.
                      </span>
                    </>
                  ) : (
                    <>
                      <textarea
                        value={warningTemplate}
                        onChange={(e) => setWarningTemplate(e.target.value)}
                        placeholder="Write complete custom message... Use placeholders: {phone}, {schoolName}, {helpline}, {campus}"
                        className="premium-input text-xs py-2.5 h-36 font-mono resize-none w-full"
                      />
                      <div className="flex flex-wrap gap-2 text-[10px] text-dark-muted font-mono mt-1">
                        <span>Placeholders:</span>
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300">&#123;phone&#125;</code>
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300">&#123;schoolName&#125;</code>
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300">&#123;helpline&#125;</code>
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300">&#123;campus&#125;</code>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingWarning}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    <span>{savingWarning ? 'Saving to Database & WhatsApp Bot...' : 'Save & Update Warning Notice'}</span>
                  </button>
                  {warningSavedSuccess && (
                    <div className="mt-2 text-center text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 py-2 rounded-lg animate-fade-in">
                      ✅ Settings saved successfully! WhatsApp Bot is immediately synced.
                    </div>
                  )}
                </div>
              </form>

              {/* Live WhatsApp Preview */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-dark-border bg-[#0b141a] p-4 text-white shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center font-bold text-xs text-white">
                        WA
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-200">Live WhatsApp Preview</div>
                        <div className="text-[10px] text-green-400 font-mono">Unregistered Parent View</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400">Preview</span>
                  </div>

                  {/* WhatsApp Incoming Bubble */}
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="bg-[#005c4b] text-white text-xs p-2.5 rounded-xl rounded-tr-none max-w-[80%] shadow">
                        Hi, fee kitni hai?
                        <div className="text-[9px] text-emerald-200/70 text-right mt-1 font-mono">11:42 PM ✓✓</div>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <div className="bg-[#202c33] text-gray-100 text-xs p-3.5 rounded-xl rounded-tl-none max-w-[95%] shadow-md whitespace-pre-line leading-relaxed font-sans border-l-2 border-amber-500">
                        {renderedWarningPreview}
                        <div className="text-[9px] text-gray-400 text-right mt-2 font-mono">11:42 PM</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

` + uiMarker;

if (!content.includes('Unregistered Number Warning & Privacy Notice Customizer')) {
  content = content.replace(uiMarker, uiCard);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ SMSPanel.jsx updated successfully!');

