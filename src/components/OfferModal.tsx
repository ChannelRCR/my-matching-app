import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Invoice } from '../types';

interface OfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    onOffer: (amount: number, message: string) => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({ isOpen, onClose, invoice, onOffer }) => {
    const [render, setRender] = useState(isOpen);
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [discountRate, setDiscountRate] = useState<number>(0);

    useEffect(() => {
        if (isOpen && invoice) {
            setRender(true);
            setAmount(invoice.requestedAmount?.toString() || invoice.amount.toString());
            setMessage('はじめまして。掲載案件に関心があり、ご連絡いたしました。');
        }
    }, [isOpen, invoice]);

    useEffect(() => {
        if (!invoice || !amount) {
            setDiscountRate(0);
            return;
        }
        const offerVal = Number(amount);
        if (offerVal > 0) {
            const rate = ((invoice.amount - offerVal) / invoice.amount) * 100;
            setDiscountRate(Number(rate.toFixed(2)));
        } else {
            setDiscountRate(0);
        }
    }, [amount, invoice]);

    const handleAnimationEnd = () => {
        if (!isOpen) setRender(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onOffer(Number(amount), message);
    };

    if (!render) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
                onTransitionEnd={handleAnimationEnd}
            >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <Send className="w-5 h-5 text-primary" />
                        オファー条件の提示
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full border border-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">請求書額面</span>
                            <span className="font-bold">¥{invoice?.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">希望買取額</span>
                            <span className="font-bold text-primary">¥{invoice?.requestedAmount?.toLocaleString()}</span>
                        </div>
                    </div>

                    <Input
                        label="買取希望金額 (円)"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                    />

                    <div className="flex justify-between items-center bg-slate-100 p-3 rounded text-sm">
                        <span className="font-medium text-slate-600">手数料 / 割引率</span>
                        <span className={`font-bold ${discountRate < 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {discountRate}%
                        </span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            メッセージ (任意)
                        </label>
                        <textarea
                            className="w-full min-h-[100px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="取引条件についての補足など"
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                            キャンセル
                        </Button>
                        <Button type="submit" className="flex-1">
                            オファーを送信
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
