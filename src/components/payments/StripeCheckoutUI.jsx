import React, { useState } from 'react';
import { CreditCard, Lock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import GlassCard from '../common/GlassCard';

const StripeCheckoutUI = ({ amount, currency = 'PKR', onSuccess, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Basic formatters
  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    if (formatted.length <= 19) setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    if (value.length <= 5) setExpiry(value);
  };

  const handleCvcChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) setCvc(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (cardNumber.replace(/\s/g, '').length < 15) {
      setError('Please enter a valid card number');
      return;
    }
    if (expiry.length < 5) {
      setError('Please enter a valid expiry date (MM/YY)');
      return;
    }
    if (cvc.length < 3) {
      setError('Please enter a valid security code');
      return;
    }
    if (!name.trim()) {
      setError('Name on card is required');
      return;
    }

    setIsProcessing(true);

    // Simulate network delay for Stripe API (2.5 seconds)
    setTimeout(() => {
      setIsProcessing(false);
      // Simulate 5% random failure rate just for realism, unless it's a test card like 4242...
      if (cardNumber.startsWith('4000') && !cardNumber.includes('4242')) {
        setError('Your card was declined. Please try a different payment method.');
      } else {
        const transactionId = 'pi_' + Math.random().toString(36).substr(2, 24);
        onSuccess(transactionId);
      }
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-in">
        
        {/* Header */}
        <div className="bg-[#635BFF] p-6 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <CreditCard size={24} className="text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold">Secure Payment via Stripe</h3>
          <p className="text-sm opacity-90 mt-1">Pay {currency} {amount.toLocaleString()}</p>
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-start gap-2 border border-red-100">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                placeholder="parent@example.com" 
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#635BFF]/50 focus:border-[#635BFF] text-gray-900 placeholder-gray-400 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Card Information</label>
              <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-[#635BFF]/50 focus-within:border-[#635BFF] transition-all">
                <input 
                  type="text" 
                  placeholder="Card number" 
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className="w-full px-3 py-2 border-b border-gray-300 focus:outline-none text-gray-900 placeholder-gray-400 text-sm"
                />
                <div className="flex">
                  <input 
                    type="text" 
                    placeholder="MM / YY" 
                    value={expiry}
                    onChange={handleExpiryChange}
                    className="w-1/2 px-3 py-2 border-r border-gray-300 focus:outline-none text-gray-900 placeholder-gray-400 text-sm"
                  />
                  <input 
                    type="text" 
                    placeholder="CVC" 
                    value={cvc}
                    onChange={handleCvcChange}
                    className="w-1/2 px-3 py-2 focus:outline-none text-gray-900 placeholder-gray-400 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name on card</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#635BFF]/50 focus:border-[#635BFF] text-gray-900 placeholder-gray-400 text-sm transition-all"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full bg-[#635BFF] hover:bg-[#544ee4] text-white font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Lock size={16} /> Pay {currency} {amount.toLocaleString()}
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
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
          <Lock size={12} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Payments are secure and encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutUI;
