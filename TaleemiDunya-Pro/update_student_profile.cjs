const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'school-admin', 'SingleStudent360.jsx');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Target Header button
const targetHeader = `                <button
                  onClick={() => {
                    const phone = (selectedStudent.phone || '').replace(/[^0-9]/g, '');
                    window.open(\`https://wa.me/\${phone}\`, '_blank');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <MessageSquare size={16} /> WhatsApp
                </button>`;

const replacementHeader = `                <button
                  onClick={() => handleSendWhatsAppNotice()}
                  disabled={waSending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  title="Auto-Send WhatsApp notice in background without opening any tab"
                >
                  {waSending ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                  {waSending ? 'Sending...' : 'WhatsApp (Auto)'}
                </button>`;

// 2. Target Message tab
const targetMsgTab = `                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Message</label>
                    <textarea 
                      rows={4}
                      defaultValue={\`Assalam-o-Alaikum, regarding \${selectedStudent.name} (Class \${selectedStudent.class}), please check fee status.\`}
                      className="w-full premium-input text-sm"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const phone = (selectedStudent.phone || selectedStudent.parentPhone || '').replace(/[^0-9]/g, '');
                      window.open(\`https://wa.me/\${phone}\`, '_blank');
                    }}
                    className="premium-button-primary bg-emerald-600 hover:bg-emerald-500"
                  >
                    <MessageSquare size={16} /> Send via WhatsApp
                  </button>
                </div>`;

const replacementMsgTab = `                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Message</label>
                    <textarea 
                      rows={4}
                      value={customMsg || \`Assalam-o-Alaikum, regarding \${selectedStudent.name} (Class \${selectedStudent.class}), please check fee status.\`}
                      onChange={(e) => setCustomMsg(e.target.value)}
                      className="w-full premium-input text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => handleSendWhatsAppNotice(customMsg)}
                      disabled={waSending}
                      className="premium-button-primary bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 disabled:opacity-50"
                    >
                      {waSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      {waSending ? 'Sending in Background...' : 'Auto-Send via WhatsApp Bot'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const rawPhone = selectedStudent.phone || selectedStudent.parentPhone || '';
                        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                        const msg = customMsg || \`Assalam-o-Alaikum, regarding \${selectedStudent.name} (Class \${selectedStudent.class}), please check fee status.\`;
                        window.open(\`https://wa.me/\${cleanPhone}?text=\${encodeURIComponent(msg)}\`, '_blank');
                      }}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-dark-muted hover:text-white transition-all flex items-center gap-1.5"
                    >
                      Open WhatsApp Web
                    </button>
                  </div>
                </div>`;

if (content.includes(targetHeader)) {
  content = content.replace(targetHeader, replacementHeader);
  console.log('✅ Successfully replaced header WhatsApp button');
} else {
  console.log('❌ targetHeader not found');
}

if (content.includes(targetMsgTab)) {
  content = content.replace(targetMsgTab, replacementMsgTab);
  console.log('✅ Successfully replaced Message Tab content');
} else {
  console.log('❌ targetMsgTab not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');

