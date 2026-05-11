import React, { useState, useEffect } from 'react';
import { ShieldCheck, Scale, Handshake, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

export const WelcomeTutorialModal: React.FC = () => {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        if (!user || !profile) return;
        
        const hasSeen = localStorage.getItem('has_seen_tutorial');
        if (!hasSeen) {
            setIsOpen(true);
        }
    }, [user, profile]);

    if (!isOpen) return null;

    const handleComplete = () => {
        localStorage.setItem('has_seen_tutorial', 'true');
        setIsOpen(false);
    };

    const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, 3));
    const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

    const slides = [
        {
            title: "「自由・公正・公平」な市場のために",
            icon: <Handshake className="w-16 h-16 text-blue-500 mb-4 mx-auto" />,
            content: (
                <p className="text-slate-600 leading-relaxed text-center">
                    当プラットフォームへようこそ。私たちは、誰もが安心して取引できるクリーンな市場を目指しています。ご参加にあたり、以下の「5つのお約束」をご確認ください。
                </p>
            )
        },
        {
            title: "お約束 1 & 2",
            icon: <ShieldCheck className="w-16 h-16 text-emerald-500 mb-4 mx-auto" />,
            content: (
                <div className="space-y-4 text-left w-full">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <h4 className="font-bold text-emerald-800 mb-1">①【嘘をつかない】</h4>
                        <p className="text-slate-700 text-sm font-medium">出品情報や交渉において、常に正確で偽りのない情報を提供します。</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <h4 className="font-bold text-emerald-800 mb-1">②【他人の妨害をしない】</h4>
                        <p className="text-slate-700 text-sm font-medium">他者の取引を不当に邪魔したり、システムを悪用したりしません。</p>
                    </div>
                </div>
            )
        },
        {
            title: "お約束 3 & 4",
            icon: <Scale className="w-16 h-16 text-amber-500 mb-4 mx-auto" />,
            content: (
                <div className="space-y-4 text-left w-full">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <h4 className="font-bold text-amber-800 mb-1">③【欲張らない】</h4>
                        <p className="text-slate-700 text-sm font-medium">市場の相場を尊重し、極端に理不尽な条件を押し付けません。</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <h4 className="font-bold text-amber-800 mb-1">④【不正をしない】</h4>
                        <p className="text-slate-700 text-sm font-medium">法律やプラットフォームの規約を守り、クリーンな取引を行います。</p>
                    </div>
                </div>
            )
        },
        {
            title: "お約束 5",
            icon: <CheckCircle className="w-16 h-16 text-primary mb-4 mx-auto" />,
            content: (
                <div className="space-y-6 text-left w-full">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-1">⑤【自己責任を自覚する】</h4>
                        <p className="text-slate-700 text-sm font-medium">最終的な取引の判断は自分で行い、その結果に責任を持ちます。</p>
                    </div>
                    <Button 
                        onClick={handleComplete}
                        className="w-full py-6 text-lg font-bold shadow-lg bg-primary hover:bg-blue-700 text-white rounded-xl transition-all"
                    >
                        お約束に同意して、取引を始める
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
                
                {/* Progress Bar */}
                <div className="flex h-1.5 w-full bg-slate-100">
                    {[0, 1, 2, 3].map(step => (
                        <div 
                            key={step} 
                            className={`flex-1 transition-colors duration-300 ${step <= currentSlide ? 'bg-primary' : 'bg-transparent'}`}
                        />
                    ))}
                </div>

                <div className="p-8 pb-6 flex-1 text-center min-h-[380px] flex flex-col justify-center items-center">
                    {slides[currentSlide].icon}
                    <h3 className="text-xl font-bold text-slate-800 mb-6">{slides[currentSlide].title}</h3>
                    <div className="flex-1 w-full flex flex-col justify-center">
                        {slides[currentSlide].content}
                    </div>
                </div>

                {/* Navigation Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <Button 
                        variant="ghost" 
                        onClick={prevSlide}
                        disabled={currentSlide === 0}
                        className={`text-slate-500 font-bold ${currentSlide === 0 ? 'invisible' : ''}`}
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> 戻る
                    </Button>
                    
                    {currentSlide < 3 ? (
                        <Button 
                            onClick={nextSlide}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 rounded-full"
                        >
                            次へ <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                    ) : (
                        <div className="w-[88px]" /> // Spacer to balance the "Prev" button width
                    )}
                </div>
            </div>
        </div>
    );
};
