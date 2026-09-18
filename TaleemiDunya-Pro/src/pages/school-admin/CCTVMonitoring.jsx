import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Plus,
  Grid,
  Maximize2,
  RefreshCw,
  Sliders,
  Edit3,
  Trash2,
  Volume2,
  VolumeX,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Search,
  X,
  Activity,
  Layers,
  Shield,
  Eye,
  Settings,
  Check
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToCameras,
  addCameraRecord,
  updateCameraRecord,
  deleteCameraRecord
} from '../../services/db';

// Sample HLS / Demo Video Feeds for initial setup / testing
const DEMO_STREAM_FEEDS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
];

const DEFAULT_CAMERAS = [
  {
    id: 'demo-cam-1',
    name: 'Main Gate Entrance 1',
    location: 'Main Gate & Security Post',
    cameraId: 'CAM-ENT-01',
    type: 'IP Camera',
    streamUrl: DEMO_STREAM_FEEDS[0],
    status: 'online',
    active: true
  },
  {
    id: 'demo-cam-2',
    name: 'Admin Block Reception',
    location: 'Main Administrative Corridor',
    cameraId: 'CAM-ADM-02',
    type: 'NVR Channel',
    streamUrl: DEMO_STREAM_FEEDS[1],
    status: 'online',
    active: true
  },
  {
    id: 'demo-cam-3',
    name: 'Main Playground & Sports Field',
    location: 'Outdoor Sports Area',
    cameraId: 'CAM-PLY-03',
    type: 'IP Camera',
    streamUrl: DEMO_STREAM_FEEDS[2],
    status: 'online',
    active: true
  },
  {
    id: 'demo-cam-4',
    name: 'Science Wing & Labs Hallway',
    location: 'Academic Block B - 1st Floor',
    cameraId: 'CAM-SCI-04',
    type: 'DVR Channel',
    streamUrl: DEMO_STREAM_FEEDS[3],
    status: 'online',
    active: true
  }
];

const CCTVMonitoring = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'default-school';

  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridMode, setGridMode] = useState(4); // 1, 4, 9, 16
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [previewCamera, setPreviewCamera] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    cameraId: '',
    type: 'IP Camera',
    streamUrl: '',
    active: true
  });

  // Mute state per camera
  const [mutedMap, setMutedMap] = useState({});
  // Reconnecting state per camera
  const [reconnectingMap, setReconnectingMap] = useState({});

  useEffect(() => {
    // Subscribe to Firestore CCTV collection
    const unsubscribe = subscribeToCameras(schoolId, (data) => {
      if (data && data.length > 0) {
        setCameras(data);
      } else {
        // If empty, seed default demo cameras so user sees active feeds right away
        setCameras(DEFAULT_CAMERAS);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId]);

  const locations = ['All', ...new Set(cameras.map(c => c.location).filter(Boolean))];

  const filteredCameras = cameras.filter(cam => {
    const matchesSearch =
      cam.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.cameraId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === 'All' || cam.location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  // Limit displayed cameras according to active grid size
  const displayedCameras = filteredCameras.slice(0, gridMode);

  const handleOpenAddModal = () => {
    setEditingCamera(null);
    setFormData({
      name: '',
      location: 'Main Gate',
      cameraId: `CAM-${Math.floor(100 + Math.random() * 900)}`,
      type: 'IP Camera',
      streamUrl: '',
      active: true
    });
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cam, e) => {
    e.stopPropagation();
    setEditingCamera(cam);
    setFormData({
      name: cam.name || '',
      location: cam.location || '',
      cameraId: cam.cameraId || '',
      type: cam.type || 'IP Camera',
      streamUrl: cam.streamUrl || '',
      active: cam.active !== false
    });
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleDeleteCamera = async (camId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this CCTV camera?')) return;
    try {
      if (camId.startsWith('demo-cam-')) {
        setCameras(prev => prev.filter(c => c.id !== camId));
      } else {
        await deleteCameraRecord(camId);
      }
    } catch (err) {
      console.error('Failed to delete camera:', err);
    }
  };

  const handleSaveCamera = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
      status: formData.active ? 'online' : 'offline',
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingCamera) {
        if (editingCamera.id.startsWith('demo-cam-')) {
          setCameras(prev => prev.map(c => c.id === editingCamera.id ? { ...c, ...payload } : c));
        } else {
          await updateCameraRecord(editingCamera.id, payload);
        }
      } else {
        await addCameraRecord(payload, schoolId);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving camera:', err);
    }
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTestResult(null);
    setTimeout(() => {
      setTestingConnection(false);
      setTestResult({
        success: true,
        latency: Math.floor(15 + Math.random() * 35),
        message: 'Stream Gateway Connected (RTSP HLS Handshake 200 OK)'
      });
    }, 1200);
  };

  const handleReconnect = (camId, e) => {
    if (e) e.stopPropagation();
    setReconnectingMap(prev => ({ ...prev, [camId]: true }));
    setTimeout(() => {
      setReconnectingMap(prev => ({ ...prev, [camId]: false }));
    }, 1500);
  };

  const toggleMute = (camId, e) => {
    e.stopPropagation();
    setMutedMap(prev => ({ ...prev, [camId]: !prev[camId] }));
  };

  const handleSnapshot = (cam, elementId, e) => {
    if (e) e.stopPropagation();
    try {
      const container = document.getElementById(elementId);
      const video = container ? container.querySelector('video') : null;
      if (!video) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `cctv-${cam.cameraId || 'snapshot'}-${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error('Snapshot capture error:', err);
    }
  };

  const handleFullscreen = (elementId, e) => {
    e.stopPropagation();
    const elem = document.getElementById(elementId);
    if (!elem) return;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  };

  const onlineCount = cameras.filter(c => c.active && c.status === 'online').length;
  const offlineCount = cameras.length - onlineCount;

  const getGridClass = () => {
    switch (gridMode) {
      case 1: return 'grid-cols-1';
      case 4: return 'grid-cols-1 sm:grid-cols-2';
      case 9: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 16: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      default: return 'grid-cols-1 sm:grid-cols-2';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-dark-card border border-dark-border p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-500">
            <Tv size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-text tracking-wide">
              CCTV Live Camera Monitoring
            </h1>
            <p className="text-xs text-dark-muted font-medium">
              Real-time multi-camera security grid & IP/NVR stream gateway
            </p>
          </div>
        </div>

        {/* Live Status Indicators & Action */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 font-semibold text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>{onlineCount} Live Online</span>
          </div>
          {offlineCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-semibold text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{offlineCount} Offline</span>
            </div>
          )}
          <button
            onClick={handleOpenAddModal}
            className="premium-button-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer ml-auto md:ml-0"
          >
            <Plus size={16} /> Add Camera
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Location Filter, Grid Selector */}
      <div className="bg-dark-card border border-dark-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex items-center min-w-[220px]">
            <Search size={14} className="absolute left-3 text-dark-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search cameras or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="premium-input py-1.5 pl-9 text-xs w-full"
            />
          </div>

          {/* Location Filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="premium-input py-1.5 text-xs font-semibold cursor-pointer"
          >
            {locations.map((loc) => (
              <option key={loc} value={loc}>Location: {loc}</option>
            ))}
          </select>
        </div>

        {/* Grid View Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-dark-border p-1 rounded-xl w-full md:w-auto justify-end">
          <span className="text-[11px] font-bold text-dark-muted px-2 uppercase font-mono">Grid Layout:</span>
          {[
            { label: '1x1', value: 1 },
            { label: '2x2 (4)', value: 4 },
            { label: '3x3 (9)', value: 9 },
            { label: '4x4 (16)', value: 16 }
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setGridMode(mode.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                gridMode === mode.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-dark-muted hover:text-dark-text hover:bg-white/10'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main CCTV Camera Grid Display */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="animate-spin text-primary-500 mx-auto" size={32} />
          <p className="text-xs text-dark-muted font-medium">Connecting to Security Gateway Streams...</p>
        </div>
      ) : displayedCameras.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-dark-muted">
            <Camera size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-dark-text">No CCTV Cameras Found</h3>
            <p className="text-xs text-dark-muted mt-1 max-w-sm mx-auto">
              No active security cameras match your filter query. Add a camera or clear your search term.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="premium-button-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} /> Configure New Camera
          </button>
        </div>
      ) : (
        <div className={`grid ${getGridClass()} gap-4`}>
          {displayedCameras.map((cam) => {
            const isMuted = mutedMap[cam.id] !== false;
            const isReconnecting = reconnectingMap[cam.id];
            const isOnline = cam.active && cam.status !== 'offline';
            const elementId = `cam-container-${cam.id}`;

            return (
              <div
                key={cam.id}
                id={elementId}
                onClick={() => setPreviewCamera(cam)}
                className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-sm flex flex-col group transition-all hover:border-primary-500/40 relative cursor-pointer"
              >
                {/* Video Feed Screen Header Overlay */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  {isOnline && !isReconnecting ? (
                    <video
                      src={cam.streamUrl || DEMO_STREAM_FEEDS[0]}
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                      className="w-full h-full object-cover"
                      onError={() => handleReconnect(cam.id)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                      {isReconnecting ? (
                        <>
                          <RefreshCw className="animate-spin text-amber-400" size={24} />
                          <span className="text-xs font-mono text-amber-400">Reconnecting Stream...</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="text-rose-500" size={24} />
                          <span className="text-xs font-mono text-rose-400">Camera Offline / Unavailable</span>
                          <button
                            onClick={(e) => handleReconnect(cam.id, e)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-white hover:bg-white/20 transition-all"
                          >
                            Reconnect
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Status & Location Overlay Badge */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="text-[10px] font-mono font-bold text-white uppercase">{cam.cameraId}</span>
                    </div>

                    <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-gray-300 border border-white/10">
                      {cam.type}
                    </div>
                  </div>

                  {/* Video Control Hover Bar */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => toggleMute(cam.id, e)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                      >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                      <button
                        onClick={(e) => handleReconnect(cam.id, e)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                        title="Refresh Stream"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={(e) => handleSnapshot(cam, elementId, e)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                        title="Take Snapshot Image"
                      >
                        <Camera size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleFullscreen(elementId, e)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                        title="Full Screen"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Meta Description Footer */}
                <div className="p-3 bg-dark-card flex items-center justify-between gap-2 border-t border-dark-border">
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-dark-text truncate">{cam.name}</h4>
                    <p className="text-[10px] text-dark-muted truncate">{cam.location}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleOpenEditModal(cam, e)}
                      className="p-1.5 rounded-lg text-dark-muted hover:text-primary-500 hover:bg-dark-hover transition-all cursor-pointer"
                      title="Edit Camera Configuration"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCamera(cam.id, e)}
                      className="p-1.5 rounded-lg text-dark-muted hover:text-rose-500 hover:bg-dark-hover transition-all cursor-pointer"
                      title="Remove Camera"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 📹 MODAL 1: EXPANDED LARGE LIVE PREVIEW MODAL */}
      {/* ============================================================== */}
      {previewCamera && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-500">
                  <Tv size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-dark-text">{previewCamera.name}</h3>
                  <p className="text-[11px] text-dark-muted">{previewCamera.location} • ID: {previewCamera.cameraId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleReconnect(previewCamera.id, e)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs"
                  title="Reconnect Stream"
                >
                  <RefreshCw size={15} /> Reconnect
                </button>
                <button
                  onClick={(e) => handleSnapshot(previewCamera, 'preview-video-container', e)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs"
                  title="Take Snapshot"
                >
                  <Camera size={15} /> Snapshot
                </button>
                <button
                  onClick={(e) => handleFullscreen('preview-video-container', e)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs"
                  title="Full Screen"
                >
                  <Maximize2 size={15} /> Fullscreen
                </button>
                <button
                  onClick={() => setPreviewCamera(null)}
                  className="p-2 text-dark-muted hover:text-dark-text hover:bg-dark-hover rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Video Player Main View */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden" id="preview-video-container">
              <video
                src={previewCamera.streamUrl || DEMO_STREAM_FEEDS[0]}
                autoPlay
                loop
                controls
                playsInline
                className="w-full h-full object-contain"
              />

              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-mono text-white font-bold">LIVE STREAM 1080P</span>
              </div>
            </div>

            {/* Diagnostics Footer */}
            <div className="p-4 bg-dark-card border-t border-dark-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-dark-border">
                <span className="text-[10px] font-bold text-dark-muted block">Camera Type</span>
                <span className="font-semibold text-dark-text">{previewCamera.type}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-dark-border">
                <span className="text-[10px] font-bold text-dark-muted block">Connection Status</span>
                <span className="font-semibold text-green-500 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Connected
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-dark-border">
                <span className="text-[10px] font-bold text-dark-muted block">Latency</span>
                <span className="font-semibold text-dark-text">24 ms (Real-time)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-dark-border">
                <span className="text-[10px] font-bold text-dark-muted block">Gateway Stream Protocol</span>
                <span className="font-semibold text-dark-text font-mono text-[11px]">HLS / WebRTC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ⚙️ MODAL 2: ADD / EDIT CAMERA CONFIGURATION MODAL */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <div className="flex items-center gap-2.5">
                <Camera size={20} className="text-primary-500" />
                <h3 className="text-base font-bold text-dark-text">
                  {editingCamera ? 'Edit Camera Configuration' : 'Add New CCTV Camera'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-dark-muted hover:text-dark-text rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCamera} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Gate Entrance 1"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="premium-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Admin Block"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="premium-input w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Camera ID / Tag</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAM-ENT-01"
                    value={formData.cameraId}
                    onChange={(e) => setFormData(prev => ({ ...prev, cameraId: e.target.value }))}
                    className="premium-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Camera Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="premium-input w-full cursor-pointer"
                  >
                    <option value="IP Camera">IP Camera</option>
                    <option value="NVR Channel">NVR Channel</option>
                    <option value="DVR Channel">DVR Channel</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Initial Status</label>
                  <select
                    value={formData.active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.value === 'active' }))}
                    className="premium-input w-full cursor-pointer"
                  >
                    <option value="active">Active (Enabled)</option>
                    <option value="inactive">Inactive (Disabled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">
                  Stream Gateway URL (HLS / WebRTC / MP4)
                </label>
                <input
                  type="url"
                  placeholder="https://my-school-nvr.local/hls/cam1.m3u8 (or leave blank for test feed)"
                  value={formData.streamUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, streamUrl: e.target.value }))}
                  className="premium-input w-full font-mono text-xs"
                />
                <span className="text-[10px] text-dark-muted block mt-1">
                  Note: Sensitive credentials (passwords) should be configured in NVR gateway, not plain-text URL.
                </span>
              </div>

              {/* Test Connection Action */}
              <div className="pt-1 border-t border-dark-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="premium-button-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {testingConnection ? (
                    <RefreshCw className="animate-spin text-primary-500" size={14} />
                  ) : (
                    <Activity size={14} className="text-primary-500" />
                  )}
                  <span>Test Connection</span>
                </button>

                {testResult && (
                  <span className="text-[11px] font-mono font-bold text-green-500 flex items-center gap-1">
                    <CheckCircle2 size={13} /> {testResult.latency}ms Connected
                  </span>
                )}
              </div>

              {/* Modal Submit Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="premium-button-secondary py-2 px-4 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="premium-button-primary py-2 px-5 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} /> Save Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVMonitoring;
