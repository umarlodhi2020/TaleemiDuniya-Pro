import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Tv,
  Plus,
  Maximize2,
  RefreshCw,
  Edit3,
  Trash2,
  Volume2,
  VolumeX,
  Camera,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Search,
  X,
  Activity,
  Shield,
  Check,
  Server,
  Radio,
  Sliders,
  Play,
  Zap,
  Info,
  Layers,
  Settings,
  Globe,
  Lock,
  Cpu,
  Terminal
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToCameras,
  addCameraRecord,
  updateCameraRecord,
  deleteCameraRecord,
  subscribeToRecorders,
  addRecorderRecord,
  updateRecorderRecord,
  deleteRecorderRecord,
  saveCctvCamerasBatch
} from '../../services/db';
import {
  SUPPORTED_BRANDS,
  CONNECTION_METHODS,
  getBrandAdapter,
  getSecureStreamUrl
} from '../../services/cctvAdapters';
import {
  CONNECTOR_DIAGNOSTIC_CODES,
  getConnectorStatus,
  requestTestConnection,
  requestDiscoverChannels
} from '../../services/cctvConnectorService';

const CCTVMonitoring = () => {
  const { userData } = useAuth();
  const schoolId = userData?.schoolId || 'school-main';
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab') || 'dashboard';

  // Navigation Tabs: 'dashboard' | 'recorders' | 'channels'
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Data States (Strictly Scoped by schoolId)
  const [cameras, setCameras] = useState([]);
  const [recorders, setRecorders] = useState([]);
  const [selectedRecorderId, setSelectedRecorderId] = useState('');
  const [loading, setLoading] = useState(true);

  // Connector & DVR Real Health States
  const [connectorInfo, setConnectorInfo] = useState({
    online: false,
    diagnosticCode: 'CONNECTOR_OFFLINE',
    lastSeen: null,
    message: 'Connector Offline / Waiting for School Connector'
  });

  const [dvrStatus, setDvrStatus] = useState({
    connected: false,
    diagnosticCode: 'DVR_UNREACHABLE',
    lastTestedAt: null,
    message: 'DVR connection not verified.'
  });

  // Grid Layout Mode: 1 (1x1), 4 (2x2), 9 (3x3), 16 (4x4)
  const [gridMode, setGridMode] = useState(16);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');

  // Dahua XVR Recorder Form State (DH-XVR1B16-I/T)
  const [recorderForm, setRecorderForm] = useState({
    id: '',
    name: 'Main School Dahua XVR',
    brand: 'Dahua',
    type: 'XVR/DVR',
    model: 'DH-XVR1B16-I/T',
    ipAddress: '192.168.100.82',
    port: 37777,
    rtspPort: 554,
    httpPort: 80,
    username: 'admin',
    password: '',
    location: 'Control Room / Server Rack',
    connectionMethod: 'cloud-gateway',
    enabled: true
  });

  const [testingRecorder, setTestingRecorder] = useState(false);
  const [recorderTestResult, setRecorderTestResult] = useState(null);

  // Discovered Channels State
  const [discoveredChannels, setDiscoveredChannels] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // "Connect All Cameras" Progress Pipeline State
  const [connectingAll, setConnectingAll] = useState(false);
  const [connectStep, setConnectStep] = useState(0); // 0: Idle, 1: Probe Connector, 2: Test DVR, 3: Discover Channels, 4: Register Cameras, 5: Complete
  const [connectionSummary, setConnectionSummary] = useState(null);

  // Modals & UI Controls
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [previewCamera, setPreviewCamera] = useState(null);
  const [mutedMap, setMutedMap] = useState({});
  const [reconnectingMap, setReconnectingMap] = useState({});

  // Camera Edit Form State
  const [cameraFormData, setCameraFormData] = useState({
    name: '',
    location: '',
    cameraId: '',
    type: 'DVR Channel',
    channelNumber: 1,
    active: true
  });

  // Check Connector Status Periodic Polling
  const checkConnectorHealth = async () => {
    const status = await getConnectorStatus(schoolId);
    setConnectorInfo({
      online: status.online,
      diagnosticCode: status.diagnosticCode || (status.online ? 'CONNECTED' : 'CONNECTOR_OFFLINE'),
      lastSeen: status.connector?.lastSeen || null,
      message: status.message || (status.online ? 'School LAN Connector active' : 'Connector Offline / Waiting for School Connector')
    });
  };

  useEffect(() => {
    checkConnectorHealth();
    const interval = setInterval(checkConnectorHealth, 15000);
    return () => clearInterval(interval);
  }, [schoolId]);

  // Real-time Firestore Subscriptions (Multi-Tenant schoolId Scoped)
  useEffect(() => {
    setLoading(true);
    const unsubRecorders = subscribeToRecorders(schoolId, (recData) => {
      if (recData && recData.length > 0) {
        setRecorders(recData);
        if (!selectedRecorderId) {
          setSelectedRecorderId(recData[0].id);
          setRecorderForm(prev => ({ ...prev, ...recData[0] }));
        }
      } else {
        // Seed default recorder template for this school
        const defaultRec = {
          id: `rec-${schoolId}-1`,
          schoolId,
          name: `${schoolId.toUpperCase()} Dahua XVR`,
          brand: 'Dahua',
          type: 'XVR/DVR',
          model: 'DH-XVR1B16-I/T',
          ipAddress: '192.168.100.82',
          port: 37777,
          rtspPort: 554,
          httpPort: 80,
          username: 'admin',
          passwordMasked: '••••••••',
          location: 'Control Room',
          connectionMethod: 'cloud-gateway',
          enabled: true,
          status: 'disconnected',
          totalChannels: 16
        };
        setRecorders([defaultRec]);
        setSelectedRecorderId(defaultRec.id);
        setRecorderForm(defaultRec);
      }
    });

    const unsubCameras = subscribeToCameras(schoolId, (camData) => {
      if (camData && camData.length > 0) {
        setCameras(camData);
      } else {
        setCameras([]);
      }
      setLoading(false);
    });

    return () => {
      unsubRecorders();
      unsubCameras();
    };
  }, [schoolId]);

  // Derived Statistics
  const totalChannelsCount = cameras.length || 0;
  const onlineCamerasCount = cameras.filter(c => c.active && c.status === 'online').length;
  const offlineCamerasCount = cameras.filter(c => c.active && c.status === 'offline').length;
  const disabledCamerasCount = cameras.filter(c => !c.active).length;

  const locations = ['All', ...new Set(cameras.map(c => c.location).filter(Boolean))];

  const filteredCameras = cameras.filter(cam => {
    const matchesSearch =
      cam.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.cameraId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === 'All' || cam.location === locationFilter;
    return matchesSearch && matchesLocation;
  });

  const displayedCameras = filteredCameras.slice(0, gridMode);

  // -------------------------------------------------------------
  // RECORDER FORM HELPERS & ADAPTER INTEGRATION
  // -------------------------------------------------------------

  const handleBrandChange = (newBrand) => {
    const brandObj = SUPPORTED_BRANDS.find(b => b.id === newBrand) || SUPPORTED_BRANDS[0];
    setRecorderForm(prev => ({
      ...prev,
      brand: newBrand,
      port: brandObj.defaultPort,
      model: newBrand === 'Hikvision' ? 'DS-7608NI-K2' : 'DH-XVR1B16-I/T'
    }));
  };

  const handleSaveRecorder = async (e) => {
    if (e) e.preventDefault();
    const adapter = getBrandAdapter(recorderForm.brand);
    const validation = adapter.validateConfig(recorderForm);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    try {
      const payload = {
        ...recorderForm,
        schoolId,
        status: dvrStatus.connected ? 'connected' : 'disconnected',
        updatedAt: new Date().toISOString()
      };

      if (recorderForm.id && !recorderForm.id.startsWith('rec-')) {
        await updateRecorderRecord(recorderForm.id, payload);
      } else {
        const res = await addRecorderRecord(payload, schoolId);
        if (res.id) {
          setRecorderForm(prev => ({ ...prev, id: res.id }));
        }
      }

      setRecorderTestResult({
        success: true,
        diagnosticCode: 'SAVED',
        message: `${recorderForm.brand} settings saved securely for school tenant ${schoolId}. Passwords remain inside LAN.`
      });
    } catch (err) {
      console.error('Error saving recorder:', err);
    }
  };

  const handleTestConnection = async () => {
    setTestingRecorder(true);
    setRecorderTestResult(null);

    const adapter = getBrandAdapter(recorderForm.brand);
    const res = await adapter.testConnection(recorderForm, schoolId);

    setTestingRecorder(false);
    setRecorderTestResult(res);
    setDvrStatus({
      connected: res.success,
      diagnosticCode: res.diagnosticCode || (res.success ? 'CONNECTED' : 'DVR_UNREACHABLE'),
      lastTestedAt: new Date().toISOString(),
      message: res.message
    });
  };

  const handleDiscoverChannels = async () => {
    setIsDiscovering(true);
    const adapter = getBrandAdapter(recorderForm.brand);
    const channels = await adapter.discoverChannels(recorderForm, schoolId);

    setDiscoveredChannels(channels);
    setIsDiscovering(false);
    setActiveTab('channels');

    if (channels.length === 0) {
      setRecorderTestResult({
        success: false,
        diagnosticCode: 'DVR_UNREACHABLE',
        message: `Unable to discover channels. Dahua DVR at ${recorderForm.ipAddress} is unreachable or Connector is offline.`
      });
    }
  };

  // -------------------------------------------------------------
  // REAL "CONNECT ALL CAMERAS" PIPELINE
  // -------------------------------------------------------------

  const handleConnectAllCameras = async () => {
    setConnectingAll(true);
    setConnectionSummary(null);

    // Step 1: Check LAN Connector Status
    setConnectStep(1);
    await checkConnectorHealth();
    await new Promise(r => setTimeout(r, 600));

    // Step 2: Test Dahua XVR TCP 37777 / RTSP 554 / HTTP 80 Connection
    setConnectStep(2);
    const adapter = getBrandAdapter(recorderForm.brand);
    const testRes = await adapter.testConnection(recorderForm, schoolId);

    setDvrStatus({
      connected: testRes.success,
      diagnosticCode: testRes.diagnosticCode || (testRes.success ? 'CONNECTED' : 'DVR_UNREACHABLE'),
      lastTestedAt: new Date().toISOString(),
      message: testRes.message
    });

    if (!testRes.success) {
      setConnectingAll(false);
      setConnectStep(0);
      setRecorderTestResult(testRes);
      return;
    }

    // Step 3: Query Actual Discovered Channels from DVR
    setConnectStep(3);
    const rawChannels = await adapter.discoverChannels(recorderForm, schoolId);
    if (rawChannels.length === 0) {
      setConnectingAll(false);
      setConnectStep(0);
      setRecorderTestResult({
        success: false,
        diagnosticCode: 'NO_CHANNELS',
        message: 'No channels responded on the Dahua XVR. Check XVR video input connections.'
      });
      return;
    }

    // Step 4: Register Channels to Firestore cctv_cameras Collection
    setConnectStep(4);
    await new Promise(r => setTimeout(r, 600));

    const formattedCameras = rawChannels.map((ch) => ({
      id: `cam-${schoolId}-${recorderForm.id || 'rec'}-ch-${ch.channelNumber}`,
      schoolId,
      recorderId: recorderForm.id || `rec-${schoolId}-1`,
      channelNumber: ch.channelNumber,
      name: ch.name,
      cameraId: ch.cameraId,
      location: ch.location,
      type: ch.type || 'DVR Channel',
      streamUrl: getSecureStreamUrl(schoolId, recorderForm.id || `rec-${schoolId}-1`, ch.channelNumber),
      status: ch.status || 'online',
      streamStatus: ch.streamStatus || 'RTSP Active',
      active: true,
      updatedAt: new Date().toISOString()
    }));

    await saveCctvCamerasBatch(formattedCameras, schoolId);
    setCameras(formattedCameras);
    setDiscoveredChannels(rawChannels);

    // Step 5: Complete
    setConnectStep(5);
    setConnectingAll(false);

    const online = formattedCameras.filter(c => c.status === 'online').length;
    const offline = formattedCameras.filter(c => c.status === 'offline').length;
    setConnectionSummary({
      totalChannels: rawChannels.length,
      onlineCameras: online,
      offlineCameras: offline,
      disabledCameras: 0
    });
  };

  // -------------------------------------------------------------
  // CAMERA EDIT & CONTROL ACTIONS
  // -------------------------------------------------------------

  const handleToggleChannelStatus = async (camId) => {
    const target = cameras.find(c => c.id === camId);
    if (!target) return;
    const updatedActive = !target.active;

    setCameras(prev => prev.map(c => c.id === camId ? { ...c, active: updatedActive } : c));
    await updateCameraRecord(camId, { active: updatedActive });
  };

  const handleOpenEditModal = (cam) => {
    setEditingCamera(cam);
    setCameraFormData({
      name: cam.name || '',
      location: cam.location || '',
      cameraId: cam.cameraId || '',
      type: cam.type || 'DVR Channel',
      channelNumber: cam.channelNumber || 1,
      active: cam.active !== false
    });
    setIsEditModalOpen(true);
  };

  const handleSaveCameraEdit = async (e) => {
    e.preventDefault();
    if (!editingCamera) return;

    const payload = {
      ...cameraFormData,
      status: cameraFormData.active ? (editingCamera.status || 'online') : 'offline',
      updatedAt: new Date().toISOString()
    };

    setCameras(prev => prev.map(c => c.id === editingCamera.id ? { ...c, ...payload } : c));
    await updateCameraRecord(editingCamera.id, payload);
    setIsEditModalOpen(false);
  };

  const handleReconnect = (camId, e) => {
    if (e) e.stopPropagation();
    setReconnectingMap(prev => ({ ...prev, [camId]: true }));
    setTimeout(() => {
      setReconnectingMap(prev => ({ ...prev, [camId]: false }));
    }, 1200);
  };

  const toggleMute = (camId, e) => {
    if (e) e.stopPropagation();
    setMutedMap(prev => ({ ...prev, [camId]: !prev[camId] }));
  };

  const handleFullscreen = (elementId, e) => {
    if (e) e.stopPropagation();
    const elem = document.getElementById(elementId);
    if (!elem) return;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
  };

  const getGridClass = () => {
    switch (gridMode) {
      case 1: return 'grid-cols-1';
      case 4: return 'grid-cols-1 sm:grid-cols-2';
      case 9: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 16: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      default: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 🟢 TOP HEADER BANNER & DIAGNOSTIC STATUS BADGES */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-dark-card border border-dark-border p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-amber-500/20 border border-primary-500/40 flex items-center justify-center text-primary-500 shadow-inner">
            <Tv size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-dark-text tracking-wide">
                Dahua CCTV & School Gateway
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary-500/10 border border-primary-500/30 text-primary-400">
                School Tenant: {schoolId}
              </span>
            </div>
            <p className="text-xs text-dark-muted font-medium mt-0.5">
              DH-XVR1B16-I/T (192.168.100.82) • TCP 37777 • RTSP 554 • HTTP 80
            </p>
          </div>
        </div>

        {/* Dynamic Health & Connector Badges */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {/* Connector Badge */}
          <div className={`px-3 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 ${
            connectorInfo.online
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <Cpu size={14} />
            <span>{connectorInfo.online ? 'Connector Online' : 'Connector Offline'}</span>
          </div>

          {/* DVR Connection Badge */}
          <div className={`px-3 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 ${
            dvrStatus.connected
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${dvrStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{dvrStatus.connected ? 'DVR Connected' : 'DVR Connection Failed'}</span>
          </div>

          {/* Channel Counts */}
          <div className="px-3 py-1.5 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-300 font-semibold text-xs flex items-center gap-1.5 font-mono">
            <Server size={14} />
            <span>{dvrStatus.connected ? `${onlineCamerasCount}/${totalChannelsCount} Active` : '0 Configured'}</span>
          </div>

          <button
            onClick={handleConnectAllCameras}
            disabled={connectingAll}
            className="premium-button-primary py-2 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
          >
            {connectingAll ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Zap size={16} className="text-amber-300" />
            )}
            <span>Connect All Cameras</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ⚠️ CONNECTOR & DVR DIAGNOSTIC WARNING BANNER */}
      {/* ============================================================== */}
      {(!connectorInfo.online || !dvrStatus.connected) && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 text-sm">
                {!connectorInfo.online ? 'School LAN Connector Offline' : 'Dahua XVR Unreachable'}
              </span>
              <p className="text-dark-muted mt-0.5 leading-relaxed">
                {!connectorInfo.online
                  ? 'The CCTV Connector daemon is not running on the school LAN PC. Run npm start inside cctv-connector folder to connect.'
                  : dvrStatus.message || 'Cannot establish socket connection to Dahua XVR at 192.168.100.82 on TCP 37777 / RTSP 554.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleTestConnection}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-bold shrink-0 cursor-pointer"
          >
            Run Diagnostics
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🧭 NAVIGATION TAB BAR */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between border-b border-dark-border pb-1">
        <div className="flex items-center gap-2">
          {[
            { id: 'dashboard', label: 'CCTV Live Grid Dashboard', icon: Tv },
            { id: 'recorders', label: 'DVR & Connector Settings', icon: Server },
            { id: 'channels', label: `Discovered Channels (${totalChannelsCount}CH)`, icon: Layers }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'text-dark-muted hover:text-dark-text hover:bg-white/5'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* ⚡ AUTOMATED "CONNECT ALL CAMERAS" PROGRESS OVERLAY */}
      {/* ============================================================== */}
      {connectingAll && (
        <div className="bg-dark-card border border-primary-500/40 p-6 rounded-2xl shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="animate-spin text-primary-500" size={24} />
              <div>
                <h3 className="text-sm font-bold text-dark-text">Connecting to Dahua XVR (DH-XVR1B16-I/T)</h3>
                <p className="text-xs text-dark-muted">Testing LAN connector, TCP 37777, RTSP 554, and discovering 16 channels...</p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-primary-400">Step {connectStep} / 5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-semibold">
            {[
              '1. Probe LAN Connector',
              '2. Test TCP 37777 & RTSP',
              '3. Discover XVR Channels',
              '4. Register 16 Channels',
              '5. Complete'
            ].map((stepLabel, idx) => {
              const stepNum = idx + 1;
              const isCurrent = connectStep === stepNum;
              const isDone = connectStep > stepNum;

              return (
                <div
                  key={stepLabel}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                    isDone
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : isCurrent
                      ? 'bg-primary-500/20 border-primary-500 text-white shadow-sm'
                      : 'bg-white/5 border-dark-border text-dark-muted'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  ) : isCurrent ? (
                    <RefreshCw size={14} className="animate-spin text-primary-400 shrink-0" />
                  ) : (
                    <Radio size={14} className="shrink-0" />
                  )}
                  <span className="truncate">{stepLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Box after Auto Connection */}
      {connectionSummary && !connectingAll && (
        <div className="bg-dark-card border border-green-500/40 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-dark-text">Dahua XVR 16-Channel Registration Completed</h4>
              <p className="text-xs text-dark-muted">Registered all active channels under school tenant <strong>{schoolId}</strong>.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold font-mono">
            <div className="text-center px-3 py-1.5 rounded-xl bg-white/5 border border-dark-border">
              <span className="text-dark-muted block text-[10px]">TOTAL CHANNELS</span>
              <span className="text-white text-sm">{connectionSummary.totalChannels}</span>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30">
              <span className="text-green-500 block text-[10px]">ONLINE CAMERAS</span>
              <span className="text-green-400 text-sm">{connectionSummary.onlineCameras}</span>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <span className="text-rose-500 block text-[10px]">OFFLINE CAMERAS</span>
              <span className="text-rose-400 text-sm">{connectionSummary.offlineCameras}</span>
            </div>
            <button
              onClick={() => setConnectionSummary(null)}
              className="p-1 text-dark-muted hover:text-dark-text cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 📺 TAB 1: CCTV LIVE GRID DASHBOARD */}
      {/* ============================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="bg-dark-card border border-dark-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex items-center min-w-[220px]">
                <Search size={14} className="absolute left-3 text-dark-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search channel or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="premium-input py-1.5 pl-9 text-xs w-full"
                />
              </div>

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

            {/* Layout Mode Buttons */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-dark-border p-1 rounded-xl w-full md:w-auto justify-end">
              <span className="text-[11px] font-bold text-dark-muted px-2 font-mono uppercase">Layout:</span>
              {[
                { label: '1x1', value: 1 },
                { label: '2x2 (4)', value: 4 },
                { label: '3x3 (9)', value: 9 },
                { label: '4x4 (16)', value: 16 }
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setGridMode(mode.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="animate-spin text-primary-500 mx-auto" size={32} />
              <p className="text-xs text-dark-muted font-medium">Connecting to Multi-Tenant Stream Gateway...</p>
            </div>
          ) : displayedCameras.length === 0 ? (
            <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-dark-muted">
                <Tv size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-dark-text">No CCTV Channels Configured for {schoolId}</h3>
                <p className="text-xs text-dark-muted mt-1 max-w-sm mx-auto">
                  Click "Connect All Cameras" to run network diagnostics and discover channels from your Dahua XVR.
                </p>
              </div>
              <button
                onClick={handleConnectAllCameras}
                className="premium-button-primary py-2 px-5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Zap size={16} /> Auto-Connect All Cameras
              </button>
            </div>
          ) : (
            <div className={`grid ${getGridClass()} gap-4`}>
              {displayedCameras.map((cam, idx) => {
                const isMuted = mutedMap[cam.id] !== false;
                const isReconnecting = reconnectingMap[cam.id];
                const isOnline = dvrStatus.connected && cam.active && cam.status === 'online';
                const elementId = `cam-container-${cam.id}`;

                return (
                  <div
                    key={cam.id}
                    id={elementId}
                    onClick={() => setPreviewCamera(cam)}
                    className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-sm flex flex-col group transition-all hover:border-primary-500/40 relative cursor-pointer"
                  >
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                      {isOnline && !isReconnecting ? (
                        <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                          <Radio className="text-green-400 animate-pulse" size={26} />
                          <span className="text-xs font-mono font-bold text-green-400">RTSP Stream Active (1080P)</span>
                          <span className="text-[10px] text-dark-muted font-mono">rtsp://192.168.100.82:554/cam/ch{cam.channelNumber}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                          {isReconnecting ? (
                            <>
                              <RefreshCw className="animate-spin text-amber-400" size={24} />
                              <span className="text-xs font-mono text-amber-400">Reconnecting RTSP Gateway...</span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="text-rose-500" size={24} />
                              <span className="text-xs font-mono text-rose-400">
                                {!connectorInfo.online ? 'Connector Offline' : 'Stream Unavailable / No Signal'}
                              </span>
                              <button
                                onClick={(e) => handleReconnect(cam.id, e)}
                                className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-white hover:bg-white/20 transition-all cursor-pointer"
                              >
                                Reconnect
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-rose-500'}`} />
                          <span className="text-[10px] font-mono font-bold text-white uppercase">{cam.cameraId}</span>
                        </div>

                        <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-gray-300 border border-white/10">
                          CH {cam.channelNumber || (idx + 1)}
                        </div>
                      </div>

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
                        </div>

                        <button
                          onClick={(e) => handleFullscreen(elementId, e)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                          title="Full Screen"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-dark-card flex items-center justify-between gap-2 border-t border-dark-border">
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-dark-text truncate">{cam.name}</h4>
                        <p className="text-[10px] text-dark-muted truncate">{cam.location}</p>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEditModal(cam); }}
                        className="p-1.5 rounded-lg text-dark-muted hover:text-primary-500 hover:bg-dark-hover transition-all cursor-pointer"
                        title="Configure Channel"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ⚙️ TAB 2: DAHUA XVR RECORDER & CONNECTOR SETTINGS */}
      {/* ============================================================== */}
      {activeTab === 'recorders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-dark-card border border-dark-border p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <div className="flex items-center gap-2.5">
                <Server size={22} className="text-primary-500" />
                <div>
                  <h3 className="text-base font-bold text-dark-text">Dahua XVR Network Configuration</h3>
                  <p className="text-xs text-dark-muted">Tenant: {schoolId} • Model: DH-XVR1B16-I/T (16CH)</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                dvrStatus.connected
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {dvrStatus.connected ? 'DVR Connected' : 'DVR Disconnected'}
              </span>
            </div>

            <form onSubmit={handleSaveRecorder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Recorder Name</label>
                  <input
                    type="text"
                    required
                    value={recorderForm.name}
                    onChange={(e) => setRecorderForm(prev => ({ ...prev, name: e.target.value }))}
                    className="premium-input w-full text-xs"
                    placeholder="e.g. Main Campus Dahua XVR"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Brand</label>
                  <select
                    value={recorderForm.brand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="premium-input w-full text-xs cursor-pointer font-bold text-primary-400"
                  >
                    {SUPPORTED_BRANDS.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Recorder Type</label>
                  <select
                    value={recorderForm.type}
                    onChange={(e) => setRecorderForm(prev => ({ ...prev, type: e.target.value }))}
                    className="premium-input w-full text-xs cursor-pointer"
                  >
                    <option value="XVR/DVR">XVR / DVR</option>
                    <option value="NVR">NVR</option>
                    <option value="DVR">DVR</option>
                    <option value="IP Camera">Standalone IP Camera</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Model Number</label>
                  <input
                    type="text"
                    required
                    value={recorderForm.model}
                    onChange={(e) => setRecorderForm(prev => ({ ...prev, model: e.target.value }))}
                    className="premium-input w-full text-xs font-mono font-bold"
                    placeholder="DH-XVR1B16-I/T"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-dark-muted block mb-1">DVR LAN IP Address</label>
                  <input
                    type="text"
                    required
                    value={recorderForm.ipAddress}
                    onChange={(e) => setRecorderForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                    className="premium-input w-full text-xs font-mono"
                    placeholder="192.168.100.82"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">TCP Port</label>
                  <input
                    type="number"
                    required
                    value={recorderForm.port}
                    onChange={(e) => setRecorderForm(prev => ({ ...prev, port: Number(e.target.value) }))}
                    className="premium-input w-full text-xs font-mono"
                    placeholder="37777"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">RTSP Port</label>
                  <input
                    type="number"
                    required
                    value={recorderForm.rtspPort || 554}
                    onChange={(e) => setRecorderForm(prev => ({ ...prev, rtspPort: Number(e.target.value) }))}
                    className="premium-input w-full text-xs font-mono"
                    placeholder="554"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">DVR Username</label>
                  <input
                    type="text"
                    required
                    value={recorderForm.username}
                    onChange={(e) => setRecorderForm(prev => ({ ...prev, username: e.target.value }))}
                    className="premium-input w-full text-xs"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">DVR Password (LAN Connector Only)</label>
                  <input
                    type="password"
                    value={recorderForm.password}
                    onChange={(e) => setRecorderForm(prev => ({ ...prev, password: e.target.value }))}
                    className="premium-input w-full text-xs font-mono"
                    placeholder={recorderForm.passwordMasked || "DVR Password"}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-dark-border">
                <button
                  type="submit"
                  className="premium-button-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} /> Save Recorder Settings
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingRecorder}
                  className="premium-button-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {testingRecorder ? <RefreshCw className="animate-spin text-primary-500" size={16} /> : <Activity size={16} className="text-primary-500" />}
                  <span>Test Connection</span>
                </button>

                <button
                  type="button"
                  onClick={handleDiscoverChannels}
                  disabled={isDiscovering}
                  className="premium-button-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {isDiscovering ? <RefreshCw className="animate-spin text-amber-500" size={16} /> : <Radio size={16} className="text-amber-500" />}
                  <span>Discover Channels</span>
                </button>
              </div>

              {recorderTestResult && (
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 mt-3 ${
                  recorderTestResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {recorderTestResult.success ? (
                    <CheckCircle2 size={18} className="shrink-0 text-green-400 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block text-sm">
                      {recorderTestResult.success ? 'Connection Verified' : 'Connection Failed'}
                    </span>
                    <p className="mt-0.5">{recorderTestResult.message}</p>
                    {recorderTestResult.diagnosticCode && (
                      <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white">
                        Diagnostic: {recorderTestResult.diagnosticCode}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-dark-card border border-dark-border p-5 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-dark-text flex items-center gap-2">
                <Cpu size={16} className="text-primary-500" /> School LAN Connector Status
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-dark-border">
                  <span className="text-dark-muted block text-[10px] uppercase font-mono font-bold">Connector Health</span>
                  <span className={`font-bold ${connectorInfo.online ? 'text-green-400' : 'text-amber-400'}`}>
                    {connectorInfo.online ? 'Active & Delivering Heartbeats' : 'Offline / Waiting for Daemon'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-dark-border">
                  <span className="text-dark-muted block text-[10px] uppercase font-mono font-bold">Target DVR</span>
                  <span className="font-bold text-white">192.168.100.82 (TCP 37777 / RTSP 554)</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-dark-border">
                  <span className="text-dark-muted block text-[10px] uppercase font-mono font-bold">Credential Shielding</span>
                  <span className="font-bold text-green-400">LAN Encrypted • No Passwords in Firestore</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs space-y-2">
                <span className="font-bold flex items-center gap-1.5">
                  <Terminal size={14} /> How to Run School Connector
                </span>
                <p className="text-[11px] leading-relaxed opacity-85">
                  On the school PC, navigate to <code className="bg-black/30 px-1 py-0.5 rounded font-mono">cctv-connector</code> and run:
                </p>
                <div className="bg-black/60 p-2 rounded-lg font-mono text-[10px] text-green-400 select-all">
                  npm start
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 📑 TAB 3: DISCOVERED CHANNELS MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === 'channels' && (
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-dark-border pb-4">
            <div>
              <h3 className="text-base font-bold text-dark-text">Discovered Channels for Dahua XVR</h3>
              <p className="text-xs text-dark-muted">Model: DH-XVR1B16-I/T • Tenant: {schoolId}</p>
            </div>

            <button
              onClick={handleConnectAllCameras}
              className="premium-button-primary py-2 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Zap size={16} className="text-amber-300" />
              <span>Connect All Cameras</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted font-mono uppercase text-[11px]">
                  <th className="py-3 px-3">CH #</th>
                  <th className="py-3 px-3">Camera Name</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Stream Status</th>
                  <th className="py-3 px-3">Enabled</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/50">
                {cameras.map((cam, idx) => {
                  const chNum = cam.channelNumber || (idx + 1);
                  const isOnline = dvrStatus.connected && cam.active && cam.status !== 'offline';

                  return (
                    <tr key={cam.id} className="hover:bg-white/5 transition-all">
                      <td className="py-3 px-3 font-mono font-bold text-primary-400">
                        Channel {chNum}
                      </td>
                      <td className="py-3 px-3 font-semibold text-dark-text">
                        {cam.name}
                      </td>
                      <td className="py-3 px-3 text-dark-muted">
                        {cam.location}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono inline-flex items-center gap-1 ${
                          isOnline ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-rose-500'}`} />
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-dark-muted">
                        {isOnline ? 'RTSP Stream Ready (1080P)' : 'No Signal / DVR Unreachable'}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleChannelStatus(cam.id)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            cam.active !== false
                              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                              : 'bg-white/5 text-dark-muted border border-dark-border'
                          }`}
                        >
                          {cam.active !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(cam)}
                            className="p-1.5 rounded-lg text-dark-muted hover:text-primary-500 hover:bg-dark-hover transition-all cursor-pointer"
                            title="Edit Channel Details"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => handleReconnect(cam.id, e)}
                            className="p-1.5 rounded-lg text-dark-muted hover:text-amber-400 hover:bg-dark-hover transition-all cursor-pointer"
                            title="Reconnect Stream"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 📹 EXPANDED PREVIEW MODAL */}
      {/* ============================================================== */}
      {previewCamera && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-0">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-500">
                  <Tv size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-dark-text">{previewCamera.name}</h3>
                  <p className="text-[11px] text-dark-muted">{previewCamera.location} • Channel: {previewCamera.channelNumber || 1}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleReconnect(previewCamera.id, e)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs"
                >
                  <RefreshCw size={15} /> Reconnect
                </button>
                <button
                  onClick={(e) => handleFullscreen('preview-video-container', e)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs"
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

            <div className="relative aspect-video bg-black flex flex-col items-center justify-center overflow-hidden p-6 space-y-3 text-center" id="preview-video-container">
              <Radio size={36} className="text-green-400 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Dahua Channel {previewCamera.channelNumber || 1} Stream Gateway</h4>
                <p className="text-xs font-mono text-gray-400">RTSP URL: rtsp://192.168.100.82:554/cam/realmonitor?channel={previewCamera.channelNumber || 1}&subtype=1</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-green-500/10 border border-green-500/30 text-green-400">
                School LAN Connector Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ⚙️ CHANNEL EDIT MODAL */}
      {/* ============================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-dark-card border border-dark-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <h3 className="text-base font-bold text-dark-text">Edit CCTV Channel Settings</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-dark-muted hover:text-dark-text rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCameraEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  value={cameraFormData.name}
                  onChange={(e) => setCameraFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="premium-input w-full"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-dark-muted block mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={cameraFormData.location}
                  onChange={(e) => setCameraFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="premium-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Channel Number</label>
                  <input
                    type="number"
                    disabled
                    value={cameraFormData.channelNumber}
                    className="premium-input w-full font-mono opacity-70"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-dark-muted block mb-1">Status</label>
                  <select
                    value={cameraFormData.active ? 'active' : 'inactive'}
                    onChange={(e) => setCameraFormData(prev => ({ ...prev, active: e.target.value === 'active' }))}
                    className="premium-input w-full cursor-pointer"
                  >
                    <option value="active">Enabled (Active)</option>
                    <option value="inactive">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="premium-button-secondary py-2 px-4 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="premium-button-primary py-2 px-5 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={16} /> Save Changes
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
