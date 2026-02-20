import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, MessageCircle, FileText, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { OfferModal } from '../components/OfferModal';
import type { Invoice, Deal } from '../types';

export const BuyerInvoiceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { invoices, deals, createDeal } = useData();
    const { user } = useAuth();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [existingDeal, setExistingDeal] = useState<Deal | null>(null);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

    useEffect(() => {
        if (id && invoices.length > 0) {
            const foundInvoice = invoices.find(i => i.id === id);
            setInvoice(foundInvoice || null);

            // Check if this buyer already has a deal for this invoice
            if (user) {
                const myDeal = deals.find(d => d.invoiceId === id && d.buyerId === user.id);
                setExistingDeal(myDeal || null);
            }
        }
    }, [id, invoices, deals, user]);

    const handleOfferSubmit = async (amount: number, message: string) => {
        if (!invoice || !user) return;

        // Use the existing createDeal function from context
        const newDeal = createDeal(invoice.id, user.id, amount, message);
        setIsOfferModalOpen(false);
        // Navigate directly to chat
        navigate(`/chat?dealId=${newDeal.id}`);
    };

    if (!invoice) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Button variant="ghost" className="mb-4" onClick={() => navigate('/buyer/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                マーケットプレイスに戻る
            </Button>

            <Card>
                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                            {invoice.industry}
                        </div>
                        <CardTitle className="text-xl">案件 #{invoice.id}</CardTitle>
                    </div>
                    {invoice.status === 'open' && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                            募集中
                        </span>
                    )}
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* Key Figures */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                            <h3 className="flex items-center text-slate-500 font-medium mb-2">
                                <CreditCard className="w-4 h-4 mr-2" />
                                請求書額面
                            </h3>
                            <p className="text-3xl font-bold text-slate-900">¥{invoice.amount.toLocaleString()}</p>
                        </div>
                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                            <h3 className="flex items-center text-indigo-600 font-medium mb-2">
                                <DollarSign className="w-4 h-4 mr-2" />
                                売り手希望額
                            </h3>
                            <p className="text-3xl font-bold text-indigo-700">¥{invoice.requestedAmount?.toLocaleString()}</p>

                            <div className="mt-4 pt-4 border-t border-indigo-200">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold text-indigo-900">想定利回り (年率)</span>
                                    <span className="text-xl font-bold text-green-600">
                                        {invoice.requestedAmount && invoice.amount ?
                                            (((invoice.amount - invoice.requestedAmount) / invoice.requestedAmount) * 12 * 100).toFixed(1)
                                            : '0.0'}%
                                    </span>
                                </div>
                                <p className="text-xs text-indigo-400 text-right">※1か月後の入金を前提</p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center md:col-span-2">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-blue-500" />
                                <span className="font-bold text-slate-700">現在のライバル（オファー数）</span>
                            </div>
                            <span className="text-xl font-bold text-blue-600">
                                {deals ? deals.filter(d => d.invoiceId === invoice.id && d.status === 'pending').length : 0} 件
                            </span>
                        </div>
                    </div>

                    {/* Meta Data */}
                    <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500 flex items-center gap-2"><Calendar size={16} /> 入金期日</span>
                                <span className="font-bold">{invoice.dueDate}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">企業規模</span>
                                <span className="font-medium">{invoice.companySize || '不明'}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-slate-500 font-medium block">信用情報 / 備考</span>
                            <div className="bg-slate-50 p-3 rounded text-slate-700 leading-relaxed">
                                {invoice.companyCredit}
                            </div>
                        </div>
                    </div>

                    {/* Evidence */}
                    {invoice.evidenceUrl && (
                        <div className="border border-dashed border-slate-200 rounded-lg p-4 bg-slate-50/50">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <FileText size={12} /> 証拠書類
                            </h4>
                            <a
                                href={invoice.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                                {invoice.evidenceName || '書類を表示'}
                            </a>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-6 border-t">
                        {existingDeal ? (
                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-orange-800 text-lg mb-1">交渉中の案件です</h3>
                                    <p className="text-sm text-orange-600">
                                        現在の提示額: ¥{existingDeal.currentAmount.toLocaleString()}
                                    </p>
                                </div>
                                <Button onClick={() => navigate(`/chat?dealId=${existingDeal.id}`)}>
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    チャットへ戻る
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <Button
                                    size="lg"
                                    className="w-full md:w-auto px-12 bg-indigo-600 hover:bg-indigo-700"
                                    onClick={() => setIsOfferModalOpen(true)}
                                    // Disable if not open
                                    disabled={invoice.status !== 'open'}
                                >
                                    {invoice.status === 'open' ? 'オファーを提示する' : 'この案件は終了しました'}
                                </Button>
                                <p className="mt-4 text-xs text-slate-400">
                                    ※ オファー提示と同時にチャットルームが開設されます
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <OfferModal
                isOpen={isOfferModalOpen}
                onClose={() => setIsOfferModalOpen(false)}
                invoice={invoice}
                onOffer={handleOfferSubmit}
            />
        </div>
    );
};
