import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, MessageCircle, FileText, Calendar, CreditCard, DollarSign } from 'lucide-react';
import { OfferModal } from '../components/OfferModal';
import type { Invoice, Deal } from '../types';
import { calculateAnnualYield } from '../utils/calculations';
import { translateCompanySize } from '../utils/translations';

export const BuyerInvoiceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { invoices, deals, createDeal, createChatRoom } = useData();
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
        const newDeal = await createDeal(invoice.id, user.id, amount, message);
        setIsOfferModalOpen(false);
        // Navigate directly to chat
        if (newDeal) {
            navigate(`/chat?dealId=${newDeal.id}`);
        }
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
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-primary uppercase tracking-wider">
                            {invoice.industry}
                        </div>
                        {invoice.sellingAmount && invoice.sellingAmount < invoice.amount && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-sm">
                                一部売却
                            </span>
                        )}
                    </div>
                    <div>
                        <CardTitle className="text-xl">案件 #{invoice.id}</CardTitle>
                    </div>
                    {invoice.status === 'open' && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                            募集中
                        </span>
                    )}
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* Partial Sale Alert Area (Only shows if partial) */}
                    {invoice.sellingAmount && invoice.sellingAmount < invoice.amount && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
                            <h3 className="text-amber-800 font-bold mb-1">この案件は「一部売却」です</h3>
                            <p className="text-amber-700 text-sm">
                                請求書総額 <strong>¥{invoice.amount.toLocaleString()}</strong> のうち、
                                <strong className="text-lg underline underline-offset-2 mx-1">¥{invoice.sellingAmount.toLocaleString()}</strong>分のみが売却対象となります。
                            </p>
                        </div>
                    )}

                    {/* Key Figures */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col justify-center">
                            <h3 className="flex items-center text-slate-500 font-medium mb-3">
                                <CreditCard className="w-4 h-4 mr-2" />
                                {invoice.sellingAmount && invoice.sellingAmount < invoice.amount ? '額面（総額）' : '請求書額面'}
                            </h3>
                            <p className={`text-3xl font-bold ${invoice.sellingAmount && invoice.sellingAmount < invoice.amount ? 'text-slate-400 line-through text-2xl' : 'text-slate-900'}`}>
                                ¥{invoice.amount.toLocaleString()}
                            </p>
                            {invoice.sellingAmount && invoice.sellingAmount < invoice.amount && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <h3 className="flex items-center text-amber-700 font-bold text-sm mb-1">
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        売却対象額
                                    </h3>
                                    <p className="text-3xl font-bold text-amber-600">
                                        ¥{invoice.sellingAmount.toLocaleString()}
                                    </p>
                                </div>
                            )}
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
                                        {invoice.requestedAmount && (invoice.sellingAmount || invoice.amount) ?
                                            calculateAnnualYield(invoice.sellingAmount || invoice.amount, invoice.requestedAmount, invoice.dueDate).toFixed(1)
                                            : '0.0'}%
                                    </span>
                                </div>
                                <p className="text-xs text-indigo-400 text-right mt-1">
                                    {invoice.sellingAmount && invoice.sellingAmount < invoice.amount ? '※売却対象額に対する年率 / ' : ''}期日までの日割り計算
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center md:col-span-2">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-blue-500" />
                                <span className="font-bold text-slate-700">現在のライバル（オファー数）</span>
                            </div>
                            <span className="text-xl font-bold text-blue-600">
                                {deals ? deals.filter(d => d.invoiceId === invoice.id && ['open', 'pending', 'negotiating'].includes(d.status)).length : 0} 件
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
                                <span className="font-medium">{translateCompanySize(invoice.companySize)}</span>
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
                                        現在の提示額: ¥{existingDeal.currentAmount?.toLocaleString() || 'なし'}
                                    </p>
                                </div>
                                <Button onClick={() => navigate(`/chat?dealId=${existingDeal.id}`)}>
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    チャットへ戻る
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center flex flex-col items-center gap-4">
                                <div className="flex flex-col md:flex-row gap-4 justify-center items-center w-full">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full md:w-auto px-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                        onClick={async () => {
                                            if (user && invoice.status === 'open') {
                                                const newDeal = await createChatRoom(invoice.id, user.id);
                                                if (newDeal) {
                                                    navigate(`/chat?dealId=${newDeal.id}`);
                                                }
                                            }
                                        }}
                                        disabled={invoice.status !== 'open'}
                                    >
                                        <MessageCircle className="mr-2 h-5 w-5" />
                                        この案件について質問・交渉する（チャット）
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="w-full md:w-auto px-12 bg-indigo-600 hover:bg-indigo-700"
                                        onClick={() => setIsOfferModalOpen(true)}
                                        // Disable if not open
                                        disabled={invoice.status !== 'open'}
                                    >
                                        {invoice.status === 'open' ? '直ちにオファーを提示する' : 'この案件は終了しました'}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-400">
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
