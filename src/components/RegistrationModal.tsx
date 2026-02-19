import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TermsModal } from './TermsModal';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultRole: 'seller' | 'buyer';
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, defaultRole }) => {
    const navigate = useNavigate();
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreedToTerms) {
            alert('利用規約への同意が必要です。');
            return;
        }

        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            onClose();
            // Redirect to appropriate dashboard
            if (defaultRole === 'seller') {
                navigate('/seller/dashboard');
            } else {
                navigate('/buyer/dashboard');
            }
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">
                        {defaultRole === 'seller' ? '売り手アカウント作成' : '買い手アカウント作成'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="氏名"
                            name="name"
                            placeholder="例: 山田 太郎"
                            required
                        />
                        <Input
                            label="メールアドレス"
                            name="email"
                            type="email"
                            placeholder="test@example.com"
                            required
                        />
                        <Input
                            label="会社名"
                            name="company"
                            placeholder={defaultRole === 'seller' ? "例: 株式会社〇〇建設" : "例: 〇〇投資ファンド"}
                            required
                        />
                        <Input
                            label="パスワード"
                            name="password"
                            type="password"
                            required
                        />

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 mt-6">
                            <div className="flex items-start gap-3">
                                <div className="pt-0.5">
                                    <ShieldCheck className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    当プラットフォームは、すべての参加者に法令遵守と誠実な情報開示を求めます。
                                    違反が確認された場合、アカウントの即時停止措置が取られます。
                                </p>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                />
                                <div className="text-sm text-slate-700 select-none">
                                    <button
                                        type="button"
                                        className="text-primary hover:underline font-bold"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIsTermsOpen(true);
                                        }}
                                    >
                                        利用規約（Terms of Service）
                                    </button>
                                    に同意します。
                                </div>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            className={`w-full font-bold h-12 text-lg mt-4 ${defaultRole === 'seller' ? 'bg-primary' : 'bg-[var(--color-gold)] text-white'}`}
                            disabled={!agreedToTerms || isLoading}
                        >
                            {isLoading ? '作成中...' : 'アカウントを作成して始める'}
                        </Button>
                    </form>
                </div>
            </div>

            <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
        </div>
    );
};
