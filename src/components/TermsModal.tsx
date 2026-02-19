import React, { useEffect, useState } from 'react';
import { X, ScrollText } from 'lucide-react';
import { Button } from './ui/Button';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
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
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
                onTransitionEnd={handleAnimationEnd}
            >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <ScrollText className="w-5 h-5 text-primary" />
                        利用規約 (Terms of Service)
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full border border-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-600 leading-relaxed bg-white">
                    <div className="prose prose-sm max-w-none">
                        <h3 className="font-bold text-slate-900 mb-2">第1条（目的）</h3>
                        <p className="mb-4">
                            本サービスは、売掛債権の売却希望者（売り手）と購入希望者（買い手）間の情報交換およびマッチングの機会を提供するプラットフォームです。
                        </p>

                        <h3 className="font-bold text-slate-900 mb-2">第2条（自己責任の原則）</h3>
                        <p className="mb-4">
                            本サービスを利用して行われる一切の取引（条件交渉、契約締結、債権譲渡通知、決済等）は、すべて当事者間の自己責任において行われるものとします。
                        </p>

                        <h3 className="font-bold text-slate-900 mb-2">第3条（免責事項）</h3>
                        <p className="mb-4">
                            運営者は、取引の成立、売掛金の回収可能性、ユーザーが提供する情報の正確性について一切の保証を行いません。また、ユーザー間で発生したいかなるトラブルや損害についても、運営者は一切の責任を負わないものとします。
                        </p>

                        <h3 className="font-bold text-slate-900 mb-2">第4条（利用手数料）</h3>
                        <p className="mb-4">
                            本システムの利用手数料は基本無料とし、ユーザーが任意で支払う金額（システム利用手数料）によって運営されます。支払われた手数料はいかなる理由があっても返金されません。
                        </p>

                        <p className="text-xs text-slate-400 mt-8 border-t pt-4">
                            2026年2月16日 制定<br />
                            FactorMatch運営事務局
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <Button onClick={onClose} className="px-8">
                        閉じる
                    </Button>
                </div>
            </div>
        </div>
    );
};
