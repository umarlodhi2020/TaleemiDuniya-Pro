import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const TermsOfService = () => {
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
              <FileText className="w-6 h-6 text-indigo-600" />
              <span className="font-bold text-xl tracking-tight text-indigo-950">Terms of Service</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-indigo-600 px-8 py-12 text-center">
            <h1 className="text-4xl font-extrabold text-white mb-4">Terms of Service</h1>
            <p className="text-indigo-100 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="p-8 md:p-12 space-y-12">
            
            <section>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                By accessing and using TaleemiDunya Pro ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">2. Service Provision & Uptime</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                TaleemiDunya Pro is a cloud-based SaaS platform. We strive to provide 99.9% uptime. However, we are not liable for any temporary unavailability due to technical issues, maintenance, or force majeure.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">3. Subscription & Payments</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                The Service is billed on a subscription basis (Basic, Pro, Enterprise). 
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
                <li>Payments are non-refundable after the trial period.</li>
                <li>Your subscription plan restricts the number of active students and features available to your institution.</li>
                <li>Downgrading your plan may result in the loss of features or capacity of your account.</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">4. User Responsibilities</h2>
              </div>
              <p className="text-gray-600 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account and password. The school administration is solely responsible for the accuracy of the data entered into the system. You agree to use the communication tools (WhatsApp/SMS) ethically and in compliance with local regulations.
              </p>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
