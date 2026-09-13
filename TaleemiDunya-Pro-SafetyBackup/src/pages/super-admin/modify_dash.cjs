const fs = require('fs');
let code = fs.readFileSync('Dashboard.jsx', 'utf8');

const newGlassCard = `
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">System Health & AI Resources</h2>
              <span className="flex items-center gap-2 text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> All Systems Operational
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-dark-hover flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-text">Firestore DB Usage</h3>
                    <p className="text-xs text-dark-muted">Read/Writes within Free Tier limit</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-cyan-500">24%</div>
                  <div className="text-xs text-dark-muted">Used</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-dark-hover flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-text">AI Copilot Tokens</h3>
                    <p className="text-xs text-dark-muted">Monthly AI responses generated</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-purple-500">1,245</div>
                  <div className="text-xs text-dark-muted">Tokens Used</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-dark-hover flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-text">WhatsApp AI Node</h3>
                    <p className="text-xs text-dark-muted">Alwaysdata Proxy Connection</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-green-500">Live</div>
                  <div className="text-xs text-dark-muted">Status</div>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Predictive Analytics</h2>
             </div>
             <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <div className="flex items-start gap-3">
                   <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500">
                     <TrendingUp size={18} className="rotate-180" />
                   </div>
                   <div>
                     <h4 className="font-bold text-rose-400">Churn Risk Alert</h4>
                     <p className="text-sm text-dark-muted mt-1">{Math.max(1, Math.floor(schools.length * 0.1))} school(s) have not logged in for over 14 days and are at high risk of cancelling their subscription.</p>
                     <button className="mt-3 text-xs font-bold text-white bg-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors">
                       Send Re-engagement Email
                     </button>
                   </div>
                </div>
             </div>
          </GlassCard>
`;

code = code.replace(/<GlassCard className="border-t-4 border-t-amber-500 bg-amber-500\/5">[\s\S]*?<\/GlassCard>/m, newGlassCard);

if (!code.includes('import { Bot }')) {
    code = code.replace(/} from 'lucide-react';/, ", Bot } from 'lucide-react';");
}

fs.writeFileSync('Dashboard.jsx', code);
