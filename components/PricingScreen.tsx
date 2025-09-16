/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { CreditCardIcon } from './icons';
import { User } from '../App';

// Add Razorpay to the window object for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PricingScreenProps {
  onPurchase: (creditAmount: number, reason: string) => void;
  currentUser: User | null;
}

const PricingScreen: React.FC<PricingScreenProps> = ({ onPurchase, currentUser }) => {
  
  const pricingTiers = [
    { credits: 100, price: 149, popular: false, reason: "100 Credit Pack" },
    { credits: 200, price: 249, popular: true, reason: "200 Credit Pack" },
    { credits: 500, price: 799, popular: false, reason: "500 Credit Pack" },
  ];

  const displayRazorpay = async (amount: number, credits: number, reason: string) => {
    if (!currentUser) {
        alert("You must be logged in to make a purchase.");
        return;
    }

    const options = {
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere', // Replace with your actual key ID
      amount: amount * 100, // Amount in the smallest currency unit (paise for INR)
      currency: "INR",
      name: "ImageGenie AI",
      description: `Purchase ${credits} Credits`,
      handler: function (response: any) {
        console.log('Payment successful:', response);
        // Here you would typically verify the payment signature on your backend
        // For this frontend-only example, we'll assume success and grant credits.
        onPurchase(credits, reason);
        alert(`Payment successful! ${credits} credits have been added to your account.`);
      },
      prefill: {
        name: currentUser.name,
        email: currentUser.email,
      },
      theme: {
        color: "#3B82F6" // Blue color to match the app theme
      }
    };
    
    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  }


  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <CreditCardIcon className="w-16 h-16 text-blue-400" />
        <h2 className="text-4xl font-extrabold text-gray-100">Purchase Credits</h2>
        <p className="text-lg text-gray-400 text-center max-w-2xl">
            Choose a credit package to continue creating with AI. More credits mean more generations, edits, and enhancements.
        </p>
        
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {pricingTiers.map((tier) => (
                <div 
                    key={tier.credits} 
                    className={`relative bg-gray-800/50 border rounded-xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:border-blue-500 hover:scale-105 ${
                        tier.popular ? 'border-blue-500 shadow-2xl shadow-blue-500/20' : 'border-gray-700'
                    }`}
                >
                    {tier.popular && (
                        <div className="absolute -top-3 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                            Most Popular
                        </div>
                    )}
                    <h3 className="text-2xl font-bold text-yellow-400">{tier.credits} Credits</h3>
                    <p className="text-5xl font-extrabold text-white my-4">
                        ₹{tier.price}
                    </p>
                    <p className="text-gray-400 text-sm mb-6">One-time purchase</p>
                    <button
                        onClick={() => displayRazorpay(tier.price, tier.credits, tier.reason)}
                        className={`w-full font-bold py-3 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg hover:-translate-y-px active:scale-95 active:shadow-inner ${
                            tier.popular 
                            ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40' 
                            : 'bg-white/10 text-gray-200 hover:bg-white/20'
                        }`}
                    >
                        Buy Now
                    </button>
                </div>
            ))}
        </div>
        <p className="text-xs text-gray-600 mt-4">Payments are securely processed by Razorpay. This is a test environment; no real money will be charged.</p>
    </div>
  );
};

export default PricingScreen;
