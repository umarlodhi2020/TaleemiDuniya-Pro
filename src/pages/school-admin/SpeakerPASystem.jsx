import React, { useState } from 'react';
import { Volume2, Radio, Bell, Clock, Upload, Plus, Play, Pause, Trash2, CheckCircle } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';

const SpeakerPASystem = () => {
  const [activeTab, setActiveTab] = useState('zones');
  const [zones, setZones] = useState([
    { id: 1, name: 'Main Campus Building A (Ground Floor)', status: 'Active', volume: '80%' },
    { id: 2, name: 'Main Campus Building B (Auditorium)', status: 'Active', volume: '90%' },
    { id: 3, name: 'Playground & Assembly Lawn', status: 'Active', volume: '100%' },
  ]);
  const [announcement, setAnnouncement] = useState('');
  const [playing, setPlaying] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="border-b border-dark-border pb-4">
        <h1 className="text-3xl font-bold text-dark-text tracking-tight flex items-center gap-3">
          <Volume2 className="text-primary-500" /> Speaker & PA System Hub
        </h1>
        <p className="text-xs text-primary-400 font-mono font-bold uppercase tracking-wider mt-1">
          Home / Speaker / {activeTab === 'zones' ? '1 Add speaker Zone' : activeTab === 'announce' ? '2 Announcement' : activeTab === 'audios' ? '3 Upload Audios' : '4 Time table'}
        </p>
      </div>

      {/* 4 Exact Features Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('zones')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'zones' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <Radio size={16} /> 1 Add speaker Zone
        </button>
        <button
          onClick={() => setActiveTab('announce')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'announce' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <Volume2 size={16} /> 2 Announcement
        </button>
        <button
          onClick={() => setActiveTab('audios')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'audios' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <Upload size={16} /> 3 Upload Audios
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'timetable' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'bg-dark-card text-dark-muted hover:text-white border border-dark-border'
          }`}
        >
          <Clock size={16} /> 4 Time table
        </button>
      </div>

      {/* Tab Content */}
      <GlassCard className="p-6">
        {activeTab === 'zones' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <h2 className="text-lg font-bold text-white">Speaker Zones Directory</h2>
              <button onClick={() => {
                const name = prompt('Enter new speaker zone name (e.g., Library Block):');
                if (name) setZones([...zones, { id: Date.now(), name, status: 'Active', volume: '85%' }]);
              }} className="premium-button-primary text-xs">
                <Plus size={16} /> Add Speaker Zone
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {zones.map(z => (
                <div key={z.id} className="p-4 rounded-xl bg-dark-hover/40 border border-dark-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-mono text-[10px] uppercase font-bold">{z.status}</span>
                    <span className="text-xs text-dark-muted font-mono">Volume: {z.volume}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{z.name}</h3>
                  <div className="pt-2 flex gap-2">
                    <button onClick={() => alert(`Testing audio test tone in ${z.name}...`)} className="px-3 py-1 bg-primary-500/15 text-primary-400 text-xs rounded-lg font-bold">Test Audio Tone</button>
                    <button onClick={() => setZones(zones.filter(x => x.id !== z.id))} className="p-1 text-red-400 hover:text-white"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'announce' && (
          <div className="space-y-6 max-w-xl">
            <h2 className="text-lg font-bold text-white border-b border-dark-border pb-3">Live PA Announcement System</h2>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Select Target Zones</label>
              <select className="w-full premium-input text-sm">
                <option>All Zones (Entire School Campus)</option>
                {zones.map(z => <option key={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Announcement Message (Text-to-Speech / Microphone)</label>
              <textarea rows={4} value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="Type announcement here to broadcast across school speakers..." className="w-full premium-input text-sm" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setPlaying(!playing); alert(playing ? 'Stopped Broadcast' : 'Broadcasting Announcement across All Speakers!'); }} className="premium-button-primary py-3 px-6 flex items-center gap-2">
                {playing ? <Pause size={18} /> : <Play size={18} />} {playing ? 'Stop Broadcast' : 'Start Live Broadcast'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'audios' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-dark-border pb-3">Upload Custom School Audios & Bells</h2>
            <div className="border-2 border-dashed border-dark-border rounded-2xl p-10 text-center hover:border-primary-500/50 transition-colors">
              <Upload size={40} className="mx-auto text-primary-400 mb-3" />
              <p className="font-bold text-white text-base">Drag & drop MP3 / WAV audio files here</p>
              <p className="text-xs text-dark-muted mt-1">Upload assembly anthems, bell chimes, or emergency evacuation sirens.</p>
              <input type="file" accept="audio/*" onChange={() => alert('Audio file uploaded and ready for broadcast!')} className="mt-4 text-xs text-dark-muted" />
            </div>
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-dark-border pb-3">Speaker Automated Bell Timetable</h2>
            <p className="text-xs text-dark-muted">Configure automated period bells to ring across selected speaker zones at exact schedules.</p>
            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 bg-dark-hover/30 rounded-xl flex justify-between items-center border border-dark-border">
                <span>08:00 AM — Morning Assembly Bell</span>
                <span className="text-green-400 font-bold">Enabled (All Zones)</span>
              </div>
              <div className="p-3 bg-dark-hover/30 rounded-xl flex justify-between items-center border border-dark-border">
                <span>08:30 AM — 1st Period Bell</span>
                <span className="text-green-400 font-bold">Enabled (Academic Blocks)</span>
              </div>
              <div className="p-3 bg-dark-hover/30 rounded-xl flex justify-between items-center border border-dark-border">
                <span>01:30 PM — School Pack-up & Departure Bell</span>
                <span className="text-green-400 font-bold">Enabled (All Zones)</span>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default SpeakerPASystem;
