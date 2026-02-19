import React, { useEffect, useState } from 'react';
import { X, Coins, QrCode, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';

interface DonationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
    const [render, setRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) setRender(true);
    }, [isOpen]);

    const handleAnimationEnd = () => {
        if (!isOpen) setRender(false);
    };

    if (!render) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
                onTransitionEnd={handleAnimationEnd}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-tr from-emerald-500 to-teal-500 p-6 text-white text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/10">
                        <Coins className="w-8 h-8 text-white fill-white animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">システム利用手数料について</h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-4">
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                            本システムの手数料は基本無料ですが、取引成立等によりご満足いただいた場合は、相当とお考えの手数料をお支払いいただけますと幸いです。
                        </p>
                        <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-2 rounded-lg inline-block">
                            多くのご利用者様には、<span className="font-bold">1,000円〜5,000円程度</span> をお支払いいただいております。
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4">
                            <button className="border border-slate-200 rounded-lg py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm">
                                1,000円
                            </button>
                            <button className="border border-slate-200 rounded-lg py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm">
                                3,000円
                            </button>
                            <button className="border border-slate-200 rounded-lg py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm">
                                5,000円
                            </button>
                        </div>
                        <button className="w-full text-xs text-slate-500 underline hover:text-emerald-600">
                            金額を指定する
                        </button>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner flex flex-col items-center justify-center mb-4">
                            <QrCode className="w-20 h-20 text-slate-800 mb-2 opacity-80" />
                            <p className="text-[10px] text-slate-400 font-mono tracking-widest">PAYMENT-QR-CODE</p>
                        </div>

                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold shadow-lg shadow-emerald-100 h-12 rounded-full transform active:scale-95 transition-all text-sm"
                            onClick={() => window.open('https://paypay.ne.jp/', '_blank')}
                        >
                            <span className="flex items-center justify-center gap-2">
                                支払い画面へ進む <ExternalLink size={14} strokeWidth={2.5} />
                            </span>
                        </Button>
                        <button
                            className="w-full text-xs text-slate-400 hover:text-slate-600 font-medium py-2 transition-colors"
                            onClick={onClose}
                        >
                            今はしない
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
