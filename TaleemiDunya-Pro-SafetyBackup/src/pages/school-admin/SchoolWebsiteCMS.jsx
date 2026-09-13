import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSchool } from "../../context/SchoolContext";
import { getRecords, upsertRecord } from "../../services/db";
import { uploadToCloudinary } from "../../services/cloudinary";
import SchoolWebsiteView from "../../components/public/SchoolWebsiteView";
import {
  Globe,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  Image as ImageIcon,
  Video,
  AlertCircle,
  CheckCircle,
  Layout,
  Settings,
  Monitor,
  Smartphone,
  BarChart,
  Eye,
  Users
} from "lucide-react";
import GlassCard from "../../components/common/GlassCard";

const SchoolWebsiteCMS = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = userData?.schoolId || "default-school";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState("builder");
  const [deviceView, setDeviceView] = useState("desktop");

  const [formData, setFormData] = useState({
    name: schoolData?.name || "",
    slug: schoolId,
    tagline: "Empowering the Future",
    about: "We provide excellent education.",
    themeColor: "#4f46e5",
    logo: schoolData?.branding?.logo || "",
    banner: "",
    phone: schoolData?.contactInfo?.phone || "",
    email: schoolData?.contactInfo?.email || "",
    address: schoolData?.contactInfo?.address || "",
    events: [],
  });

  useEffect(() => {
    fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const records = await getRecords("school_websites", schoolId);
      if (records && records.length > 0) {
        setFormData(records[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      await upsertRecord("school_websites", schoolId, {
        ...formData,
        schoolId, 
        updatedAt: new Date().toISOString(),
      });

      setMessage({
        text: "Website settings saved successfully!",
        type: "success",
      });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (error) {
      console.error(error);
      setMessage({ text: "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const addEvent = () => {
    setFormData((prev) => ({
      ...prev,
      events: [
        ...(prev.events || []),
        { title: "", date: "", desc: "", type: "photo", url: "" },
      ],
    }));
  };

  const updateEvent = (index, field, value) => {
    const newEvents = [...formData.events];
    newEvents[index][field] = value;
    setFormData((prev) => ({ ...prev, events: newEvents }));
  };

  const removeEvent = (index) => {
    const newEvents = formData.events.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, events: newEvents }));
  };

  const handleMediaUpload = async (index, file) => {
    if (!file) return;
    try {
      const response = await uploadToCloudinary(file);
      if (response && response.success) {
        updateEvent(index, "url", response.url);
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload media.");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const response = await uploadToCloudinary(file);
      if (response && response.success) setFormData((prev) => ({ ...prev, logo: response.url }));
    } catch (error) {
      console.error("Logo upload failed", error);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const response = await uploadToCloudinary(file);
      if (response && response.success) setFormData((prev) => ({ ...prev, banner: response.url }));
    } catch (error) {
      console.error("Banner upload failed", error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-dark-muted animate-pulse">Loading Visual Builder...</div>;
  }

  const publicUrl = `${window.location.origin}/#/school/${formData.slug}`;

  return (
    <div className="h-[calc(100vh-64px)] -mx-6 -my-6 bg-dark-bg flex flex-col font-sans">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-card shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Layout className="text-primary-500" /> Visual Builder
          </h1>
          <div className="flex bg-dark-hover rounded-xl p-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "dashboard" ? "bg-dark-card text-white shadow" : "text-dark-muted hover:text-white"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("builder")}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "builder" ? "bg-dark-card text-white shadow" : "text-dark-muted hover:text-white"
              }`}
            >
              Live Builder
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {message.text && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {message.text}
            </span>
          )}
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="premium-button-secondary flex items-center gap-2 text-sm"
          >
            <ExternalLink size={14} /> Preview
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="premium-button-primary flex items-center gap-2 text-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Publish Website
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === "dashboard" && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center">
                         <Globe size={24} />
                      </div>
                      <div>
                         <p className="text-sm font-bold text-dark-muted">Status</p>
                         <p className="text-lg font-black text-white">Published</p>
                      </div>
                   </div>
                   <a href={publicUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-400 hover:underline flex items-center gap-1">
                      {publicUrl} <ExternalLink size={10} />
                   </a>
                </GlassCard>
                <GlassCard className="p-6">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center">
                         <Users size={24} />
                      </div>
                      <div>
                         <p className="text-sm font-bold text-dark-muted">Total Visitors</p>
                         <p className="text-lg font-black text-white">1,245</p>
                      </div>
                   </div>
                   <p className="text-xs text-green-400">+12% this month</p>
                </GlassCard>
                <GlassCard className="p-6">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center">
                         <Eye size={24} />
                      </div>
                      <div>
                         <p className="text-sm font-bold text-dark-muted">Page Views</p>
                         <p className="text-lg font-black text-white">3,842</p>
                      </div>
                   </div>
                   <p className="text-xs text-green-400">+18% this month</p>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <GlassCard className="p-6">
                    <h3 className="text-lg font-black text-white mb-4">Recent Enquiries</h3>
                    <div className="space-y-4">
                       {[1,2,3].map(i => (
                         <div key={i} className="flex justify-between items-center pb-3 border-b border-dark-border last:border-0">
                            <div>
                               <p className="text-sm font-bold text-white">Ali Khan</p>
                               <p className="text-xs text-dark-muted">admissions@demo.com</p>
                            </div>
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-md">New</span>
                         </div>
                       ))}
                    </div>
                 </GlassCard>
                 <GlassCard className="p-6">
                    <h3 className="text-lg font-black text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setActiveTab('builder')} className="p-4 bg-dark-hover rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-dark-border transition-colors">
                          <Layout className="text-primary-500" />
                          <span className="text-sm font-bold text-white">Edit Layout</span>
                       </button>
                       <button onClick={() => setActiveTab('builder')} className="p-4 bg-dark-hover rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-dark-border transition-colors">
                          <ImageIcon className="text-pink-500" />
                          <span className="text-sm font-bold text-white">Update Gallery</span>
                       </button>
                    </div>
                 </GlassCard>
              </div>
            </div>
          </div>
        )}

        {activeTab === "builder" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Settings */}
            <div className="w-[380px] bg-dark-card border-r border-dark-border flex flex-col overflow-y-auto shrink-0 z-10 custom-scrollbar">
               <div className="p-6 border-b border-dark-border">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider mb-6">Header Settings</h2>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-dark-muted mb-2">School Logo</label>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center overflow-hidden">
                          {formData.logo ? (
                            <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-dark-muted">None</span>
                          )}
                        </div>
                        <div className="flex-1 relative">
                          <button className="w-full premium-button-secondary py-1.5 text-xs">Upload Logo</button>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-dark-muted mb-2">School Name</label>
                      <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full premium-input py-2 text-sm" placeholder="School Name" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-dark-muted mb-2">URL Slug</label>
                      <div className="flex items-center">
                        <span className="bg-dark-hover border border-dark-border border-r-0 px-2 py-2 rounded-l-lg text-dark-muted text-xs font-mono">/school/</span>
                        <input type="text" value={formData.slug} onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} className="w-full premium-input rounded-l-none py-2 text-sm" placeholder="slug" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-dark-muted mb-2">Tagline</label>
                      <input type="text" value={formData.tagline} onChange={(e) => setFormData((p) => ({ ...p, tagline: e.target.value }))} className="w-full premium-input py-2 text-sm" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-dark-muted mb-2">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={formData.themeColor} onChange={(e) => setFormData((p) => ({ ...p, themeColor: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                        <input type="text" value={formData.themeColor} onChange={(e) => setFormData((p) => ({ ...p, themeColor: e.target.value }))} className="flex-1 premium-input py-1.5 font-mono text-xs uppercase" />
                      </div>
                    </div>
                  </div>
               </div>

               <div className="p-6 border-b border-dark-border">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider mb-6">Hero / About Settings</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-dark-muted mb-2">Cover Banner</label>
                      <div className="relative w-full h-20 rounded-lg overflow-hidden border border-dark-border group bg-dark-bg">
                        {formData.banner && <img src={formData.banner} className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-white text-xs font-bold">Change Banner</span>
                        </div>
                        <input type="file" accept="image/*" onChange={handleBannerUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-dark-muted mb-2">About Us Text</label>
                      <textarea rows={4} value={formData.about} onChange={(e) => setFormData((p) => ({ ...p, about: e.target.value }))} className="w-full premium-input py-2 text-sm resize-none" />
                    </div>
                  </div>
               </div>

               <div className="p-6 border-b border-dark-border">
                  <div className="flex items-center justify-between mb-4">
                     <h2 className="text-sm font-black text-white uppercase tracking-wider">Events & Gallery</h2>
                     <button onClick={addEvent} className="bg-primary-500/20 text-primary-400 p-1 rounded hover:bg-primary-500/30"><Plus size={16}/></button>
                  </div>
                  <div className="space-y-4">
                     {formData.events?.map((ev, idx) => (
                        <div key={idx} className="p-3 border border-dark-border rounded-xl bg-dark-hover/30 relative">
                           <button onClick={() => removeEvent(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><Trash2 size={10}/></button>
                           <input type="text" value={ev.title} onChange={e=>updateEvent(idx,'title',e.target.value)} placeholder="Title" className="w-full premium-input py-1 text-xs mb-2"/>
                           <div className="flex gap-2 mb-2">
                             <input type="date" value={ev.date} onChange={e=>updateEvent(idx,'date',e.target.value)} className="flex-1 premium-input py-1 text-xs"/>
                             <div className="w-8 h-8 rounded border border-dashed border-dark-border flex items-center justify-center overflow-hidden relative">
                                {ev.url ? <img src={ev.url} className="w-full h-full object-cover"/> : <ImageIcon size={12} className="text-dark-muted"/>}
                                <input type="file" accept="image/*,video/*" onChange={e => { const f=e.target.files[0]; if(f){ updateEvent(idx,'type',f.type.startsWith('video')?'video':'photo'); handleMediaUpload(idx,f); } }} className="absolute inset-0 opacity-0 cursor-pointer"/>
                             </div>
                           </div>
                           <textarea rows={2} value={ev.desc} onChange={e=>updateEvent(idx,'desc',e.target.value)} placeholder="Desc" className="w-full premium-input py-1 text-xs resize-none"/>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="p-6 border-b border-dark-border">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider mb-6">Contact Info</h2>
                  <div className="space-y-3">
                     <input type="text" value={formData.phone} onChange={e=>setFormData(p=>({...p, phone:e.target.value}))} placeholder="Phone" className="w-full premium-input py-2 text-sm"/>
                     <input type="email" value={formData.email} onChange={e=>setFormData(p=>({...p, email:e.target.value}))} placeholder="Email" className="w-full premium-input py-2 text-sm"/>
                     <textarea rows={2} value={formData.address} onChange={e=>setFormData(p=>({...p, address:e.target.value}))} placeholder="Address" className="w-full premium-input py-2 text-sm resize-none"/>
                  </div>
               </div>
            </div>

            {/* Right Stage - Live Preview */}
            <div className="flex-1 bg-black overflow-hidden flex flex-col relative">
               {/* View Toggles */}
               <div className="absolute top-4 right-4 z-50 flex bg-dark-card p-1 rounded-xl border border-dark-border shadow-2xl">
                  <button onClick={() => setDeviceView('desktop')} className={`p-2 rounded-lg transition-colors ${deviceView === 'desktop' ? 'bg-primary-500 text-white' : 'text-dark-muted hover:text-white'}`}>
                     <Monitor size={18} />
                  </button>
                  <button onClick={() => setDeviceView('mobile')} className={`p-2 rounded-lg transition-colors ${deviceView === 'mobile' ? 'bg-primary-500 text-white' : 'text-dark-muted hover:text-white'}`}>
                     <Smartphone size={18} />
                  </button>
               </div>

               {/* Scaled Preview Stage */}
               <div className="flex-1 overflow-auto custom-scrollbar flex items-center justify-center p-8">
                  <div 
                    className={`bg-white transition-all duration-500 shadow-2xl relative border-8 border-gray-900 rounded-3xl overflow-y-auto custom-scrollbar ${deviceView === 'mobile' ? 'w-[375px] h-[812px]' : 'w-full h-full max-w-7xl rounded-xl border-none'}`}
                  >
                     <SchoolWebsiteView data={formData} />
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolWebsiteCMS;
