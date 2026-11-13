import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Award,
  Briefcase,
  Building,
  Mail,
  Phone,
  Share2,
  Calendar,
  HeartHandshake,
  Sparkles,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  Users,
  Trophy,
  DollarSign
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { getRecords, addRecord } from '../../services/db';

export default function AlumniDirectory() {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const schoolId = schoolData?.id || userData?.schoolId || 'default-school';

  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeStoryModal, setActiveStoryModal] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [alumniList, setAlumniList] = useState([]);

  useEffect(() => {
    const fetchAlumni = async () => {
      setLoading(true);
      try {
        const records = await getRecords('alumni', schoolId);
        if (Array.isArray(records)) {
          setAlumniList(records);
        }
      } catch (err) {
        console.error('Error fetching alumni records:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlumni();
  }, [schoolId]);

  const [newAlumni, setNewAlumni] = useState({
    name: '',
    batch: '2022',
    classPassed: 'F.Sc Pre-Medical',
    currentRole: '',
    organization: '',
    industry: 'Technology',
    location: '',
    phone: '',
    email: '',
    quote: ''
  });

  const batches = ['All', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];
  const industries = ['All', 'Medical', 'Armed Forces', 'Civil Services', 'Technology', 'Business', 'Law & Judiciary'];

  const filteredAlumni = alumniList.filter(alumnus => {
    const matchesBatch = selectedBatch === 'All' || alumnus.batch === selectedBatch;
    const matchesIndustry = selectedIndustry === 'All' || alumnus.industry === selectedIndustry;
    const matchesSearch =
      alumnus.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alumnus.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alumnus.currentRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alumnus.classPassed.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBatch && matchesIndustry && matchesSearch;
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newAlumni.name || !newAlumni.currentRole) return;
    const created = {
      id: `ALM-${newAlumni.batch}-${Math.floor(100 + Math.random() * 900)}`,
      name: newAlumni.name,
      batch: newAlumni.batch,
      classPassed: newAlumni.classPassed,
      currentRole: newAlumni.currentRole,
      organization: newAlumni.organization || 'Independent',
      industry: newAlumni.industry,
      location: newAlumni.location || 'Pakistan',
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 50)}?w=150&auto=format&fit=crop&q=80`,
      quote: newAlumni.quote || `Proud alumnus of ${schoolData?.name || 'our school'}.`,
      badges: ['Mentorship Volunteer'],
      phone: newAlumni.phone || '+92 300 0000000',
      email: newAlumni.email || 'alumni@school.edu.pk',
      linkedin: 'https://linkedin.com',
      donations: 'PKR 0'
    };
    setAlumniList([created, ...alumniList]);
    setShowAddModal(false);
    setNewAlumni({
      name: '',
      batch: '2022',
      classPassed: 'F.Sc Pre-Medical',
      currentRole: '',
      organization: '',
      industry: 'Technology',
      location: '',
      phone: '',
      email: '',
      quote: ''
    });
  };

  const copyShareLink = (alumnus) => {
    const schoolDisplayName = schoolData?.name || userData?.schoolName || 'our school';
    const text = `🌟 Proud Alumni Spotlight from ${schoolDisplayName}!\n\nMeet ${alumnus.name} (Batch ${alumnus.batch})\nCurrent Role: ${alumnus.currentRole} at ${alumnus.organization}.\n\n"${alumnus.quote}"\n\nAdmissions Open at ${schoolDisplayName}! Join the leaders of tomorrow.`;
    navigator.clipboard.writeText(text);
    setCopiedId(alumnus.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/70 border border-emerald-200/90 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200 uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
            Alumni & Old Students Network Directory
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hall of Fame & Alumni Relations
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl font-medium leading-relaxed">
            Track past graduates, doctors, engineers, military officers, and civil servants.
            Organize guest speaker sessions, foster mentorship, and generate viral social media spotlight posters for admissions branding.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register Alumni
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{alumniList.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Registered Alumni</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {alumniList.filter(a => a.badges && a.badges.length > 0).length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Distinguished Achievers</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              PKR {alumniList.reduce((acc, a) => {
                const amt = Number(String(a.donations || 0).replace(/[^0-9]/g, '')) || 0;
                return acc + amt;
              }, 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Scholarship Donations</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {alumniList.filter(a => a.badges?.includes('Mentorship Volunteer')).length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Active Mentorship Volunteers</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search alumni by name, company, medical college, CSS batch or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Batch:</span>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {batches.slice(0, 6).map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBatch(b)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    selectedBatch === b
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Industry Pill Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Field:
          </span>
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setSelectedIndustry(ind)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                selectedIndustry === ind
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Alumni Grid / Empty State */}
      {filteredAlumni.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {loading ? 'Loading Alumni Directory...' : 'No Alumni Records Found'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {loading ? 'Please wait while records are fetched from database.' : 'No distinguished graduates have been registered yet for this filter. Click "Register Alumni" to add your school graduates.'}
          </p>
          {!loading && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Register First Alum
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAlumni.map((alumnus) => (
          <div
            key={alumnus.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-600 transition-all flex flex-col justify-between overflow-hidden group"
          >
            {/* Header / Avatar */}
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={alumnus.avatar}
                      alt={alumnus.name}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/30"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 ring-2 ring-white dark:ring-slate-800">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {alumnus.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Batch {alumnus.batch}
                      </span>
                      <span>•</span>
                      <span>{alumnus.classPassed}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md">
                  {alumnus.industry}
                </span>
              </div>

              {/* Current Role */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl space-y-1 text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                  {alumnus.currentRole}
                </div>
                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {alumnus.organization}
                </div>
              </div>

              {/* Quote / Testimonial */}
              <blockquote className="text-xs italic text-slate-600 dark:text-slate-300 line-clamp-3 border-l-2 border-emerald-500 pl-2.5">
                "{alumnus.quote}"
              </blockquote>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {alumnus.badges.map((b, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                  >
                    ★ {b}
                  </span>
                ))}
                {alumnus.donations && alumnus.donations !== 'PKR 0' && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    Donor: {alumnus.donations}
                  </span>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${alumnus.phone}`}
                  title="Call Alumnus"
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-300 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`mailto:${alumnus.email}`}
                  title="Email Alumnus"
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-300 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setActiveStoryModal(alumnus)}
                  className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-medium"
                >
                  Full Bio
                </button>
              </div>

              <button
                onClick={() => copyShareLink(alumnus)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  copiedId === alumnus.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedId === alumnus.id ? 'Copied Post!' : 'Social Spotlight'}
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-lg">Register Alumni Profile</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Salman Khan"
                    value={newAlumni.name}
                    onChange={(e) => setNewAlumni({ ...newAlumni, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Graduation Batch *
                  </label>
                  <select
                    value={newAlumni.batch}
                    onChange={(e) => setNewAlumni({ ...newAlumni, batch: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  >
                    {batches.filter(b => b !== 'All').map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Class / Discipline Passed
                </label>
                <input
                  type="text"
                  placeholder="e.g. Matric Science / F.Sc Pre-Engineering"
                  value={newAlumni.classPassed}
                  onChange={(e) => setNewAlumni({ ...newAlumni, classPassed: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Current Designation / Role *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Software Architect"
                    value={newAlumni.currentRole}
                    onChange={(e) => setNewAlumni({ ...newAlumni, currentRole: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Systems Limited / Army / Hospital"
                    value={newAlumni.organization}
                    onChange={(e) => setNewAlumni({ ...newAlumni, organization: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Field / Industry
                  </label>
                  <select
                    value={newAlumni.industry}
                    onChange={(e) => setNewAlumni({ ...newAlumni, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  >
                    {industries.filter(i => i !== 'All').map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Current City / Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lahore / Dubai"
                    value={newAlumni.location}
                    onChange={(e) => setNewAlumni({ ...newAlumni, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={newAlumni.phone}
                    onChange={(e) => setNewAlumni({ ...newAlumni, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="alumnus@gmail.com"
                    value={newAlumni.email}
                    onChange={(e) => setNewAlumni({ ...newAlumni, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Testimonial / School Memory Quote
                </label>
                <textarea
                  rows="3"
                  placeholder="Share a short quote about your time at school..."
                  value={newAlumni.quote}
                  onChange={(e) => setNewAlumni({ ...newAlumni, quote: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-md shadow-emerald-600/30"
                >
                  Save Alumni
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story / Bio Modal */}
      {activeStoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="relative h-28 bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 p-4">
              <button
                onClick={() => setActiveStoryModal(null)}
                className="absolute top-3 right-3 text-white/80 hover:text-white font-bold text-lg bg-black/20 rounded-full w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pb-6 pt-0 relative space-y-4">
              <div className="-mt-12 flex items-end gap-4">
                <img
                  src={activeStoryModal.avatar}
                  alt={activeStoryModal.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-800 shadow-lg"
                />
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    {activeStoryModal.name}
                  </h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Batch {activeStoryModal.batch} • {activeStoryModal.classPassed}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl space-y-1 text-xs">
                <div className="font-semibold text-slate-800 dark:text-white">
                  {activeStoryModal.currentRole}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {activeStoryModal.organization} • {activeStoryModal.location}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Words of Inspiration
                </h4>
                <p className="text-sm italic text-slate-700 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  "{activeStoryModal.quote}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
                  <div className="text-slate-400">Total Contribution</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {activeStoryModal.donations || 'PKR 0'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
                  <div className="text-slate-400">Mentorship Status</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Available for Sessions
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => copyShareLink(activeStoryModal)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  {copiedId === activeStoryModal.id ? 'Copied to Clipboard!' : 'Generate Social Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
