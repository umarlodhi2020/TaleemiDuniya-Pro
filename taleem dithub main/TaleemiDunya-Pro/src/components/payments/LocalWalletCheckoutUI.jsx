import React, { useState } from 'react';
import { Smartphone, Lock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const LocalWalletCheckoutUI = ({ amount, currency = 'PKR', provider = 'JazzCash', onSuccess, onCancel }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [cnic, setCnic] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const isJazzCash = provider.toLowerCase().includes('jazzcash');
  const themeColor = isJazzCash ? '#ef4444' : '#10b981'; // Red for JazzCash, Green for EasyPaisa

  const handleMobileChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.startsWith('92')) value = '0' + value.substring(2);
    if (value.length <= 11) setMobileNumber(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (mobileNumber.length !== 11 || !mobileNumber.startsWith('03')) {
      setError('Enter a valid 11-digit mobile number (e.g. 03001234567)');
      return;
    }

    if (isJazzCash && cnic.length < 6) {
      setError('Last 6 digits of CNIC are required for JazzCash');
      return;
    }

    setIsProcessing(true);

    // Simulate API request to send USSD Prompt
    setTimeout(() => {
      setIsProcessing(false);
      setStep(2);
      
      // Simulate waiting for user to enter MPIN on their phone
      setTimeout(() => {
        // Success
        const transactionId = 'TXN-' + Math.floor(100000000 + Math.random() * 900000000);
        onSuccess(transactionId);
      }, 5000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-in">
        
        {/* Header */}
        <div style={{ backgroundColor: themeColor }} className="p-6 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Smartphone size={24} className="text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold">Pay via {provider}</h3>
          <p className="text-sm opacity-90 mt-1">Amount: {currency} {amount.toLocaleString()}</p>
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-start gap-2 border border-red-100">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{provider} Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">+92</span>
                  <input 
                    type="text" 
                    placeholder="3001234567" 
                    value={mobileNumber.replace(/^0/, '')}
                    onChange={(e) => handleMobileChange({ target: { value: '0' + e.target.value }})}
                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900 text-sm transition-all"
                    style={{ focusRing: themeColor }}
                  />
                </div>
              </div>

              {isJazzCash && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last 6 digits of CNIC</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-gray-900 text-sm transition-all"
                  />
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isProcessing || mobileNumber.length < 11}
                  style={{ backgroundColor: themeColor }}
                  className="w-full text-white hover:brightness-110 font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:hover:brightness-100"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Initiating Request...
                    </>
                  ) : (
                    <>
                      Send Payment Request
                    </>
                  )}
                </button>
              </div>
              
              <div className="text-center mt-3">
                <button 
                  type="button" 
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancel and return
                </button>
              </div>
            </form>
          ) : (
            <div className="py-8 text-center space-y-4">
              <Loader2 size={40} className="animate-spin mx-auto text-gray-400" />
              <h4 className="font-bold text-gray-900 text-lg">Please check your phone</h4>
              <p className="text-sm text-gray-600 max-w-xs mx-auto">
                A prompt has been sent to {mobileNumber}. Please unlock your phone and enter your MPIN to confirm the payment of Rs. {amount.toLocaleString()}.
              </p>
              <div className="pt-4">
                <p className="text-xs text-amber-600 font-medium animate-pulse">Waiting for your confirmation...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
          <Lock size={12} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Secured by State Bank of Pakistan</span>
        </div>
      </div>
    </div>
  );
};

export default LocalWalletCheckoutUI;
