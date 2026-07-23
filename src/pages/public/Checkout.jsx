import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { BookOpen, CheckCircle, ArrowLeft, UploadCloud, CreditCard, Building, Smartphone, QrCode, Loader2, Image as ImageIcon } from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { uploadToCloudinary } from '../../services/cloudinary';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('plan') || 'basic';

  const [gateways, setGateways] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: '',
    adminName: '',
    email: '',
    phone: '',
    tid: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Plans details for display (these could be fetched from DB, but we keep a local map for quick public view)
  const plansData = {
    basic: { name: 'Basic (Starter)', price: '3,500' },
    pro: { name: 'Premium (Pro)', price: '10,000' },
    enterprise: { name: 'Enterprise (VIP Suite)', price: '18,000' },
  };
  const currentPlan = plansData[planId] || plansData['basic'];

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'gateways'));
        if (snap.exists()) {
          const data = snap.data();
          setGateways(data);
          
          // Set default payment method if available
          if (data.manualPayments?.jazzcash?.accountNumber) setPaymentMethod('jazzcash');
          else if (data.manualPayments?.easypaisa?.accountNumber) setPaymentMethod('easypaisa');
          else if (data.manualPayments?.bank?.accountNumber) setPaymentMethod('bank');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.adminName || !formData.phone || !formData.tid || !paymentMethod) {
      alert("Please fill all required fields and enter the Transaction ID / Reference No.");
      return;
    }
    if (!screenshotFile) {
      alert("Please upload the payment screenshot proof to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload screenshot first
      const fileUrl = await uploadToCloudinary(screenshotFile);
      if (!fileUrl) {
        throw new Error("Failed to upload screenshot. Please try again.");
      }
      await addDoc(collection(db, 'saas_recharge_requests'), {
        schoolName: formData.schoolName,
        schoolId: formData.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random()*1000),
        adminName: formData.adminName,
        email: formData.email,
        phone: formData.phone,
        requestedPlan: planId,
        planName: currentPlan.name,
        amount: currentPlan.price.replace(/,/g, ''),
        billingCycle: 'monthly',
        payMethod: paymentMethod === 'bank' ? 'BANK_TRANSFER' : paymentMethod.toUpperCase(),
        tid: formData.tid,
        screenshotUrl: fileUrl,
        status: 'pending_verification',
        createdAt: new Date().toISOString()
      });

      const message = `*New Subscription Request!* 🚀
School: ${formData.schoolName}
Admin: ${formData.adminName}
Phone: ${formData.phone}
Plan: ${currentPlan.name}
Amount: PKR ${currentPlan.price}
Payment Method: ${paymentMethod}
*TID / Ref No:* ${formData.tid}

Please verify the payment and approve my account. (I am attaching the payment screenshot below) 👇`;

      if (gateways?.developerWhatsapp?.enabled && gateways.developerWhatsapp.number) {
        const waLink = `https://wa.me/${gateways.developerWhatsapp.number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(waLink, '_blank');
      } else {
        // Only show basic browser alert if redirect popup somehow fails
        console.log("Thank you! Your payment proof has been submitted. Our team will verify and activate your account shortly.");
      }
      
      // Redirect directly to the web app domain (Firebase) and show the popup there
      window.location.href = "https://taleemidunya-pro-ed44e.web.app/?request_sent=true";
    } catch (e) {
      alert("Error submitting request: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-black text-indigo-600">Loading Checkout...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-500 selection:text-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <button onClick={() => window.location.href = "https://taleemiduniya-pro.vercel.app/"} className="flex items-center gap-2 text-indigo-600 font-bold mb-8 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
          <ArrowLeft size={18} /> Back to Website
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-3xl tracking-tight text-indigo-950">Complete Your Purchase</h1>
            <p className="text-gray-500 font-medium">TaleemiDunya Pro - {currentPlan.name}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50">
              <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-4">Order Summary</h3>
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <p className="font-black text-indigo-950 text-lg">{currentPlan.name}</p>
                  <p className="text-xs text-gray-500">Monthly Subscription</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl">PKR {currentPlan.price}</p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Setup Fee</span>
                  <span className="font-bold text-green-600">Free</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Support Access</span>
                  <span className="font-bold">Included</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-indigo-50 rounded-2xl flex items-center gap-3">
                <CheckCircle className="text-indigo-500 shrink-0" size={24} />
                <p className="text-sm font-medium text-indigo-900">Your account will be activated within 1 hour after payment verification.</p>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Customer Details */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs border-b border-gray-100 pb-2">School Details</h3>
                
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">School Name *</label>
                  <input type="text" required value={formData.schoolName} onChange={e => setFormData({...formData, schoolName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium" placeholder="E.g. Ali Public School" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Admin Name *</label>
                    <input type="text" required value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-medium" placeholder="E.g. Mr. Ahmed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Phone / WhatsApp *</label>
                    <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-medium" placeholder="0300..." />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Email Address</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-medium" placeholder="admin@school.com" />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Payment Method</h3>
                           <div className="grid grid-cols-3 gap-3">
                  {gateways?.manualPayments?.jazzcash?.accountNumber && (
                    <button type="button" onClick={() => setPaymentMethod('jazzcash')} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'jazzcash' ? 'border-red-500 bg-red-50 text-red-700 shadow-md shadow-red-100' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <Smartphone size={20} className={paymentMethod === 'jazzcash' ? 'text-red-500' : ''} />
                      <span className="text-[10px] font-black uppercase">JazzCash</span>
                    </button>
                  )}
                  {gateways?.manualPayments?.easypaisa?.accountNumber && (
                    <button type="button" onClick={() => setPaymentMethod('easypaisa')} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'easypaisa' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-100' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <Smartphone size={20} className={paymentMethod === 'easypaisa' ? 'text-emerald-500' : ''} />
                      <span className="text-[10px] font-black uppercase">EasyPaisa</span>
                    </button>
                  )}
                  {gateways?.manualPayments?.bank?.accountNumber && (
                    <button type="button" onClick={() => { setPaymentMethod('bank'); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'bank' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md shadow-amber-100' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <Building size={20} className={paymentMethod === 'bank' ? 'text-amber-500' : ''} />
                      <span className="text-[10px] font-black uppercase">Bank Transfer</span>
                    </button>
                  )}
                </div>

                {/* Dynamic Payment Details */}
                <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-inner mt-4">
                  {paymentMethod === 'jazzcash' && gateways?.manualPayments?.jazzcash && (
                    <div>
                      <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-2">Send PKR {currentPlan.price} via JazzCash to:</p>
                      <p className="text-2xl font-black">{gateways.manualPayments.jazzcash.accountNumber}</p>
                      <p className="text-sm text-gray-400 font-bold mt-1">Title: {gateways.manualPayments.jazzcash.accountTitle}</p>
                    </div>
                  )}
                  
                  {paymentMethod === 'easypaisa' && gateways?.manualPayments?.easypaisa && (
                    <div>
                      <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-2">Send PKR {currentPlan.price} via EasyPaisa to:</p>
                      <p className="text-2xl font-black">{gateways.manualPayments.easypaisa.accountNumber}</p>
                      <p className="text-sm text-gray-400 font-bold mt-1">Title: {gateways.manualPayments.easypaisa.accountTitle}</p>
                    </div>
                  )}

                  {paymentMethod === 'bank' && gateways?.manualPayments?.bank && (
                    <div>
                      <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-2">Transfer PKR {currentPlan.price} to Bank:</p>
                      <p className="text-lg font-black text-white">{gateways.manualPayments.bank.bankName}</p>
                      <p className="text-xl font-black text-amber-400 mt-2">{gateways.manualPayments.bank.accountNumber}</p>
                      <p className="text-sm text-gray-400 font-bold mt-1">Title: {gateways.manualPayments.bank.accountTitle}</p>
                    </div>
                  )}
                </div>

                {/* Screenshot Upload Section */}
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-4">Payment Proof</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Transaction ID / Ref No. *</label>
                      <input type="text" required value={formData.tid} onChange={e => setFormData({...formData, tid: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-medium font-mono" placeholder="e.g. 02938472019" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-2">Upload Screenshot *</label>
                      
                      {screenshotPreview ? (
                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50 inline-block">
                          <img src={screenshotPreview} alt="Payment Proof" className="h-40 w-auto object-contain" />
                          <button 
                            type="button"
                            onClick={() => { setScreenshotPreview(''); setScreenshotFile(null); }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-colors bg-gray-50 group">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                            <p className="text-sm font-semibold text-gray-600 group-hover:text-indigo-600">Click to upload screenshot</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setScreenshotFile(file);
                                setScreenshotPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 text-sm tracking-wide uppercase"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                {submitting ? 'Processing...' : 'Submit Payment Proof'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
