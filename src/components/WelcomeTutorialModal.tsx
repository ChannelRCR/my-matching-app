import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
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
            setTimeout(() => setIsOpen(true), 0);
        }
    }, [user, profile]);

    if (!isOpen) return null;

    const handleComplete = () => {
        localStorage.setItem('has_seen_tutorial', 'true');
        setIsOpen(false);
    };

    const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, 2));

    const slides = [
        {
            title: "「自由・公正・公平」な市場のために",
            icon: <ShieldCheck className="w-16 h-16 text-blue-500 mb-4 mx-auto" />,
            content: (
                <div className="space-y-4 text-center">
                    <p className="text-slate-600 leading-relaxed">
                        当プラットフォームへようこそ。私たちは、誰もが安心して取引できるクリーンな市場を目指しています。
                    </p>
                    <p className="text-slate-600 leading-relaxed font-medium">
                        嘘をつかない、他者の妨害をしない、欲張らない、不正をしない、そして自己責任を自覚する。これらが私たちの理念です。
                    </p>
                </div>
            ),
            buttonText: "次へ",
            buttonAction: nextSlide,
            buttonIcon: <ChevronRight className="w-5 h-5 ml-1" />
        },
        {
            title: "利用規約と特商法の同意",
            icon: <FileText className="w-16 h-16 text-emerald-500 mb-4 mx-auto" />,
            content: (
                <div className="space-y-4 text-left w-full">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-32 overflow-y-auto text-sm text-slate-600">
                        <p className="font-bold mb-2">利用規約および特定商取引法に基づく表記</p>
                        <p>1. 本サービスの目的と範囲...</p>
                        <p>2. ユーザーの義務と禁止事項について...</p>
                        <p>3. 手数料および決済に関する規定...</p>
                        <p>詳細は公式ドキュメントをご確認ください。</p>
                    </div>
                    <p className="text-center text-sm font-bold text-slate-700">
                        すべての規約を確認し、内容に同意します。
                    </p>
                </div>
            ),
            buttonText: "同意する",
            buttonAction: nextSlide,
            buttonIcon: <CheckCircle className="w-5 h-5 ml-1" />
        },
        {
            title: "準備が完了しました！",
            icon: <CheckCircle className="w-16 h-16 text-primary mb-4 mx-auto" />,
            content: (
                <div className="space-y-4 text-center">
                    <p className="text-slate-600 leading-relaxed">
                        アカウントの初期設定がすべて完了しました。<br />
                        ダッシュボードからさっそく取引を始めてみましょう。
                    </p>
                </div>
            ),
            buttonText: "始める",
            buttonAction: handleComplete,
            buttonIcon: null
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
                
                {/* Progress Bar */}
                <div className="flex h-1.5 w-full bg-slate-100">
                    {[0, 1, 2].map(step => (
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
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                    <Button 
                        onClick={slides[currentSlide].buttonAction}
                        className="bg-primary hover:bg-blue-700 text-white font-bold px-8 py-2 rounded-full w-full sm:w-auto shadow-md"
                    >
                        {slides[currentSlide].buttonText} {slides[currentSlide].buttonIcon}
                    </Button>
                </div>
            </div>
        </div>
    );
};
