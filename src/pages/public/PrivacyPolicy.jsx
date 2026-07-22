import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Database, Eye, Bell } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-500 selection:text-white">
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-lg text-indigo-950">Back to Home</span>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-600" />
              <span className="font-bold text-xl tracking-tight text-indigo-950">Privacy Policy</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-indigo-600 px-8 py-12 text-center">
            <h1 className="text-4xl font-extrabold text-white mb-4">Privacy Policy</h1>
            <p className="text-indigo-100 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="p-8 md:p-12 space-y-12">
            
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">1. Information We Collect</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                TaleemiDunya Pro collects information necessary to provide educational management services. This includes:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>School administrative details (Name, Address, Contact Info).</li>
                <li>Student and Staff data provided by the school administration.</li>
                <li>Financial and fee transaction records managed within the platform.</li>
                <li>Usage data and analytics to improve our system performance.</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">2. How We Use Your Data</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                We use the collected data strictly for providing the software services. Your data is isolated per school (Multi-Tenant architecture) ensuring that one school cannot access another school's data. We use your data to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
                <li>Process admissions, attendance, and fee challans.</li>
                <li>Send automated SMS and WhatsApp notifications to parents.</li>
                <li>Generate AI-assisted reports and notices.</li>
                <li>Provide customer support and system maintenance.</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">3. Data Security & Storage</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Your data is stored securely using enterprise-grade cloud databases (Firebase / Google Cloud). All data transmissions are encrypted using SSL/TLS protocols. We do not sell, rent, or share your personal data with third-party advertisers.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">4. Communications (SMS & WhatsApp)</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                By using our automated communication features, you consent to the sending of transactional messages (fees, attendance, notices) to your registered staff and parents. You are responsible for ensuring that the recipients have agreed to receive these communications from your institution.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
