import sys

with open('src/pages/super-admin/Subscriptions.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add developerWhatsapp and banksList to initial state
target_state = """  const [gatewaysConfig, setGatewaysConfig] = useState({
    stripe: {"""
replacement_state = """  const [gatewaysConfig, setGatewaysConfig] = useState({
    developerWhatsapp: {
      enabled: true,
      number: '+923001234567',
    },
    banksList: [
      {
        id: '1',
        bankName: 'Meezan Bank Limited',
        accountTitle: 'TaleemiDunya SaaS Pvt Ltd',
        iban: 'PK42MEZN0001002938475610'
      }
    ],
    stripe: {"""
content = content.replace(target_state, replacement_state)

# Replace bankQr UI with BanksList UI
target_bank_ui = """            {/* ----------------- BANK QR / RAAST CONFIG ----------------- */}
            <GlassCard className="p-7 border border-amber-500/30 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <QrCode size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Raast & Direct Bank IBFT</h3>
                    <p className="text-[11px] text-dark-muted">Instant Bank Transfer & Dynamic QR</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    🏛️ Active Deposit
                  </span>
                  <button
                    onClick={() => setGatewaysConfig(g => ({ ...g, bankQr: { ...g.bankQr, enabled: !g.bankQr.enabled } }))}
                    className="focus:outline-none"
                  >
                    {gatewaysConfig.bankQr?.enabled ? <ToggleRight size={36} className="text-green-500" /> : <ToggleLeft size={36} className="text-dark-muted" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-dark-muted block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={gatewaysConfig.bankQr?.bankName || ''}
                      onChange={e => setGatewaysConfig(g => ({ ...g, bankQr: { ...g.bankQr, bankName: e.target.value } }))}
                      className="w-full premium-input text-xs"
                      placeholder="Meezan Bank Ltd"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-dark-muted block mb-1">Account Title</label>
                    <input
                      type="text"
                      value={gatewaysConfig.bankQr?.accountTitle || ''}
                      onChange={e => setGatewaysConfig(g => ({ ...g, bankQr: { ...g.bankQr, accountTitle: e.target.value } }))}
                      className="w-full premium-input text-xs font-bold text-amber-300"
                      placeholder="TaleemiDunya SaaS Pvt Ltd"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-dark-muted block mb-1">Account Number / IBAN</label>
                  <input
                    type="text"
                    value={gatewaysConfig.bankQr?.iban || ''}
                    onChange={e => setGatewaysConfig(g => ({ ...g, bankQr: { ...g.bankQr, iban: e.target.value } }))}
                    className="w-full premium-input font-mono text-xs font-bold"
                    placeholder="PK42MEZN0001002938475610"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-dark-muted block mb-1">Raast ID / Mobile #</label>
                    <input
                      type="text"
                      value={gatewaysConfig.bankQr?.raastId || ''}
                      onChange={e => setGatewaysConfig(g => ({ ...g, bankQr: { ...g.bankQr, raastId: e.target.value } }))}
                      className="w-full premium-input font-mono text-xs text-yellow-400 font-bold"
                      placeholder="0300-1234567"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-dark-muted block mb-1">Branch Details</label>
                    <input
                      type="text"
                      value={gatewaysConfig.bankQr?.branchCode || ''}
                      onChange={e => setGatewaysConfig(g => ({ ...g, bankQr: { ...g.bankQr, branchCode: e.target.value } }))}
                      className="w-full premium-input text-xs text-dark-muted"
                      placeholder="0102 (Gulberg Lahore)"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-dark-muted block mb-1">School Checkout Instructions</label>
                  <textarea
                    rows={2}
                    value={gatewaysConfig.bankQr?.instructions || ''}
                    onChange={e => setGatewaysConfig(g => ({ ...g, bankQr: { ...g.bankQr, instructions: e.target.value } }))}
                    className="w-full premium-input text-xs leading-relaxed"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => handleTestGatewayConnection('bankQr', 'Raast & Bank IBFT Portal')}
                    disabled={testingGateway === 'bankQr'}
                    className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 border border-amber-500/30"
                  >
                    {testingGateway === 'bankQr' ? <RefreshCw className="animate-spin" size={15} /> : <QrCode size={15} />}
                    {testingGateway === 'bankQr' ? 'Checking IBAN Format...' : '⚡ Verify Raast ID & Bank Setup'}
                  </button>
                </div>
              </div>
            </GlassCard>"""

replacement_bank_ui = """            {/* ----------------- MULTI-BANK CONFIG ----------------- */}
            <GlassCard className="p-7 border border-amber-500/30 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <QrCode size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Bank Transfer Accounts</h3>
                    <p className="text-[11px] text-dark-muted">Manage Multiple Banks for Direct IBFT</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newBank = { id: Date.now().toString(), bankName: '', accountTitle: '', iban: '' };
                    setGatewaysConfig(g => ({ ...g, banksList: [...(g.banksList || []), newBank] }));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center gap-2"
                >
                  <Plus size={14} /> Add Bank
                </button>
              </div>

              <div className="space-y-4 text-xs max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {(gatewaysConfig.banksList || []).map((bank, index) => (
                  <div key={bank.id} className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3 relative">
                    <button
                      onClick={() => {
                        const newList = gatewaysConfig.banksList.filter(b => b.id !== bank.id);
                        setGatewaysConfig(g => ({ ...g, banksList: newList }));
                      }}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                    <div className="grid grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="font-bold text-dark-muted block mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={bank.bankName}
                          onChange={e => {
                            const newList = [...gatewaysConfig.banksList];
                            newList[index].bankName = e.target.value;
                            setGatewaysConfig(g => ({ ...g, banksList: newList }));
                          }}
                          className="w-full premium-input text-xs"
                          placeholder="Meezan Bank Ltd"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-dark-muted block mb-1">Account Title</label>
                        <input
                          type="text"
                          value={bank.accountTitle}
                          onChange={e => {
                            const newList = [...gatewaysConfig.banksList];
                            newList[index].accountTitle = e.target.value;
                            setGatewaysConfig(g => ({ ...g, banksList: newList }));
                          }}
                          className="w-full premium-input text-xs font-bold text-amber-300"
                          placeholder="TaleemiDunya SaaS Pvt Ltd"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-dark-muted block mb-1">Account Number / IBAN</label>
                      <input
                        type="text"
                        value={bank.iban}
                        onChange={e => {
                          const newList = [...gatewaysConfig.banksList];
                          newList[index].iban = e.target.value;
                          setGatewaysConfig(g => ({ ...g, banksList: newList }));
                        }}
                        className="w-full premium-input font-mono text-xs font-bold"
                        placeholder="PK42MEZN0001002938475610"
                      />
                    </div>
                  </div>
                ))}
                {(gatewaysConfig.banksList || []).length === 0 && (
                  <p className="text-center text-dark-muted">No banks added yet.</p>
                )}
              </div>
            </GlassCard>"""
content = content.replace(target_bank_ui, replacement_bank_ui)

# Add Developer WhatsApp card above the grid
target_grid = """          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">"""
replacement_grid = """          <GlassCard className="p-6 mb-6 border border-green-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-green-500/20 text-green-400 border border-green-500/30">
                <Smartphone size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Developer Contact (WhatsApp)</h3>
                <p className="text-[11px] text-dark-muted">Show WhatsApp chat button on landing page for potential buyers.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="flex-1">
                <label className="font-bold text-dark-muted block mb-1 text-[10px] uppercase">WhatsApp Number</label>
                <input
                  type="text"
                  value={gatewaysConfig.developerWhatsapp?.number || ''}
                  onChange={e => setGatewaysConfig(g => ({ ...g, developerWhatsapp: { ...g.developerWhatsapp, number: e.target.value } }))}
                  className="w-full premium-input text-xs"
                  placeholder="+923001234567"
                />
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setGatewaysConfig(g => ({ ...g, developerWhatsapp: { ...g.developerWhatsapp, enabled: !(g.developerWhatsapp?.enabled) } }))}
                  className="focus:outline-none"
                >
                  {gatewaysConfig.developerWhatsapp?.enabled ? <ToggleRight size={36} className="text-green-500" /> : <ToggleLeft size={36} className="text-dark-muted" />}
                </button>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">"""
content = content.replace(target_grid, replacement_grid)

with open('src/pages/super-admin/Subscriptions.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
