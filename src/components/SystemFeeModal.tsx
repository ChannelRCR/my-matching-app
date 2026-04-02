import React, { useEffect, useState } from 'react';
import { X, Coins, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';

interface SystemFeeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PRESET_AMOUNTS = [1000, 3000, 5000];

export const SystemFeeModal: React.FC<SystemFeeModalProps> = ({ isOpen, onClose }) => {
    const [render, setRender] = useState(isOpen);
    const [amount, setAmount] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setRender(true);
            setAmount('');
            setError(null);
        }
    }, [isOpen]);

    const handleAnimationEnd = () => {
        if (!isOpen) setRender(false);
    };

    const handlePayment = async () => {
        if (!amount || amount < 500) {
            setError('システム利用料は500円以上を指定してください。');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Construct full URLs for success/cancel redirects
            const baseUrl = window.location.origin;
            const successUrl = `${baseUrl}/dashboard?payment=success`;
            const cancelUrl = `${baseUrl}/dashboard?payment=cancel`;

            // Get session token to ensure explicit authorization header
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
            const user_id = session?.user?.id;

            const { data, error: funcError } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    amount: Number(amount),
                    success_url: successUrl,
                    cancel_url: cancelUrl,
                    user_id: user_id || null,
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (funcError) {
                console.error("Supabase Functions Error:", funcError);
                let errorMessage = funcError.message;
                // Safely extract the error body if available
                if (funcError.context && typeof funcError.context.json === 'function') {
                    try {
                        const errData = await funcError.context.json();
                        errorMessage = errData.error || errorMessage;
                    } catch (e) {
                        // Ignored
                    }
                }
                throw new Error(errorMessage);
            }
            if (data?.error) throw new Error(data.error);

            if (data?.url) {
                // Redirect user to Stripe Checkout page
                window.location.href = data.url;
            } else {
                throw new Error('決済用URLの取得に失敗しました。');
            }
        } catch (err: any) {
            console.error('Payment Error:', err);
            const msg = err.message || 'システムエラーが発生しました。時間を置いてから再度お試しください。';
            setError(msg);
            alert(`決済エラー: ${msg}`);
        } finally {
            setIsLoading(false);
        }
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
                        disabled={isLoading}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner border border-white/10">
                        <Coins className="w-8 h-8 text-white fill-white animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">システム利用手数料のお支払い</h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-4">
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                            本プラットフォームのサービス維持向上のため、任意のシステム利用手数料（500円〜）をお支払いいただけますと幸いです。
                        </p>

                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {PRESET_AMOUNTS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setAmount(preset)}
                                    disabled={isLoading}
                                    className={`border rounded-lg py-2 text-sm font-bold transition-all shadow-sm ${
                                        amount === preset 
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-500 hover:text-emerald-600'
                                    } disabled:opacity-50`}
                                >
                                    {preset.toLocaleString()}円
                                </button>
                            ))}
                        </div>
                        
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1 text-left">
                                金額を指定する（円）
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="500"
                                    step="100"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="例: 1000"
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-800 font-bold"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                                    円
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg text-left">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 pt-2">
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold shadow-lg shadow-emerald-100 h-12 rounded-full transform active:scale-95 transition-all text-sm flex items-center justify-center disabled:opacity-70 disabled:active:scale-100"
                            onClick={handlePayment}
                            disabled={isLoading || amount === '' || amount < 500}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    支払う（クレジットカード / PayPay）
                                </span>
                            )}
                        </Button>
                        <button
                            className="w-full text-xs text-slate-400 hover:text-slate-600 font-medium py-2 transition-colors disabled:opacity-50"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            今はしない
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
