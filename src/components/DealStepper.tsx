import React from 'react';
import { Check } from 'lucide-react';

export type PaymentStatus = 'pending' | 'buyer_paid' | 'seller_received' | 'seller_repaid' | 'fully_settled';

interface DealStepperProps {
    status: string; // deal.status
    paymentStatus?: PaymentStatus | null; // deal.paymentStatus
}

export const DealStepper: React.FC<DealStepperProps> = ({ status, paymentStatus }) => {
    // If the deal is not even concluded yet, maybe we shouldn't show it or show it all grayed out
    if (!['concluded', 'agreed'].includes(status)) {
        return null; // Only show stepper post-agreement
    }

    const steps = [
        { id: 'contracted', label: '契約成立', isCompleted: true, isActive: !paymentStatus || paymentStatus === 'pending' },
        { id: 'buyer_paid', label: '買主振込', isCompleted: ['buyer_paid', 'seller_received', 'seller_repaid', 'fully_settled'].includes(paymentStatus || ''), isActive: paymentStatus === 'buyer_paid' },
        { id: 'seller_received', label: '売主着金確認', isCompleted: ['seller_received', 'seller_repaid', 'fully_settled'].includes(paymentStatus || ''), isActive: paymentStatus === 'seller_received' },
        { id: 'seller_repaid', label: '回収・買主送金', isCompleted: ['seller_repaid', 'fully_settled'].includes(paymentStatus || ''), isActive: paymentStatus === 'seller_repaid' },
        { id: 'fully_settled', label: '取引完了', isCompleted: paymentStatus === 'fully_settled', isActive: paymentStatus === 'fully_settled' }
    ];

    // Find the highest completed index to draw the connecting lines correctly
    let currentIndex = steps.findIndex(s => s.isActive);
    if (currentIndex === -1) currentIndex = 0;
    if (paymentStatus === 'fully_settled') currentIndex = 4; // Complete state

    return (
        <div className="w-full px-2 py-4 sm:px-4">
            <div className="flex items-center justify-between relative">
                {/* Background line */}
                <div className="absolute left-[10%] right-[10%] top-1/2 h-1 bg-slate-200 -translate-y-1/2 z-0 hidden sm:block"></div>
                
                {/* Active progress line */}
                <div 
                    className="absolute left-[10%] top-1/2 h-1 bg-green-500 -translate-y-1/2 z-0 transition-all duration-500 hidden sm:block"
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 80}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isPassed = index < currentIndex || step.isCompleted;
                    const displayActive = step.isActive || (step.id === 'contracted' && !paymentStatus);

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center w-1/5">
                            <div 
                                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                                    ${isPassed ? 'bg-green-500 border-green-500 text-white' : 
                                      displayActive ? 'bg-white border-green-500 text-green-600 shadow-[0_0_0_4px_rgba(34,197,94,0.2)]' : 
                                      'bg-white border-slate-300 text-slate-400'}`}
                            >
                                {isPassed ? (
                                    <Check className="w-3 h-3 sm:w-4 sm:h-4 stroke-[3]" />
                                ) : (
                                    <span className="text-xs sm:text-sm font-bold">{index + 1}</span>
                                )}
                            </div>
                            <span 
                                className={`mt-2 text-[10px] sm:text-xs font-bold text-center leading-tight
                                    ${displayActive || isPassed ? 'text-slate-800' : 'text-slate-400'}`}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
