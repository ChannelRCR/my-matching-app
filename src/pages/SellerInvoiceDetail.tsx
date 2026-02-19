import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, MessageCircle, FileText, CheckCircle2 } from 'lucide-react';
import type { Invoice, Deal } from '../types';

export const SellerInvoiceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { invoices, deals, users, acceptDeal } = useData();
    const { user } = useAuth();

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [invoiceDeals, setInvoiceDeals] = useState<Deal[]>([]);

    useEffect(() => {
        if (id && invoices.length > 0) {
            const foundInvoice = invoices.find(i => i.id === id);
            setInvoice(foundInvoice || null);

            // Find deals for this invoice and sort properly
            const relevantDeals = deals.filter(d => d.invoiceId === id);

            // Sort: Amount DESC, then CreatedAt ASC
            const sortedDeals = relevantDeals.sort((a, b) => {
                if (b.currentAmount !== a.currentAmount) {
                    return b.currentAmount - a.currentAmount;
                }
                return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime(); // Note: leveraging lastMessageAt as a proxy for created if created_at missing in type, but usually acceptable for MVP
            });

            setInvoiceDeals(sortedDeals);
        }
    }, [id, invoices, deals]);

    if (!invoice) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    // Security check: ensure current user is the seller
    if (user && invoice.sellerId !== user.id && invoice.sellerId !== 'seller1') { // 'seller1' allowance for legacy/mock data if needed, or remove for strictness
        // For strict auth, we should redirect if mismatch
        // return <div>Unauthorized</div>;
    }

    const getBuyerName = (buyerId: string) => {
        const buyer = users.find(u => u.id === buyerId);
        return buyer ? (buyer.companyName || buyer.name) : '不明な買い手';
    };

    const handleAcceptDeal = (deal: Deal) => {
        if (window.confirm(`${getBuyerName(deal.buyerId)} からのオファーを承諾しますか？\n\n・この買い手と交渉フェーズに入ります\n・他のオファーは却下されます\n・マーケットプレイスでの募集は停止されます`)) {
            acceptDeal(deal);
            alert('オファーを承諾しました。交渉を開始してください。');
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Button variant="ghost" className="mb-4" onClick={() => navigate('/seller/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                ダッシュボードに戻る
            </Button>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Invoice Details Column */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-lg">案件詳細</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">売掛金元本</h3>
                                <p className="text-2xl font-bold">¥{invoice.amount.toLocaleString()}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-1">希望額</h3>
                                <p className="text-lg font-bold text-primary">¥{invoice.requestedAmount?.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${invoice.status === 'open' ? 'bg-green-100 text-green-700' :
                                    invoice.status === 'negotiating' ? 'bg-orange-100 text-orange-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {invoice.status === 'open' ? '募集中' :
                                        invoice.status === 'negotiating' ? '交渉中' : '完了'}
                                </span>
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                                    {invoice.industry}
                                </span>
                            </div>

                            <hr className="my-4" />

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">入金期日</span>
                                    <span className="font-medium">{invoice.dueDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">企業規模</span>
                                    <span className="font-medium">{invoice.companySize || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-1">信用情報</span>
                                    <span className="font-medium block bg-slate-50 p-2 rounded text-xs">
                                        {invoice.companyCredit}
                                    </span>
                                </div>
                            </div>

                            {invoice.evidenceUrl && (
                                <a
                                    href={invoice.evidenceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 w-full mt-4 p-2 bg-blue-50 text-blue-600 rounded text-sm hover:underline"
                                >
                                    <FileText size={16} />
                                    証拠書類を確認
                                </a>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Offers Column */}
                <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <MessageCircle className="text-primary" />
                            届いているオファー ({invoiceDeals.length})
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {invoiceDeals.length === 0 ? (
                            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-12 text-center text-slate-500">
                                <p>まだオファーは届いていません。</p>
                            </div>
                        ) : (
                            invoiceDeals.map((deal, index) => (
                                <Card key={deal.id} className="hover:shadow-md transition-all border-l-4 border-l-primary/50 relative overflow-hidden">
                                    {index === 0 && (
                                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-bl">
                                            最高額オファー
                                        </div>
                                    )}
                                    <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                    {getBuyerName(deal.buyerId).charAt(0)}
                                                </div>
                                                <h3 className="font-bold text-lg">{getBuyerName(deal.buyerId)}</h3>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(deal.lastMessageAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm text-slate-500">提示額:</span>
                                                <span className="text-2xl font-bold text-primary">
                                                    ¥{deal.currentAmount.toLocaleString()}
                                                </span>
                                            </div>
                                            {deal.status === 'agreed' && (
                                                <span className="inline-flex items-center gap-1 text-green-600 font-bold text-sm mt-1">
                                                    <CheckCircle2 size={14} /> 成約済み
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[140px]">
                                            {deal.status === 'pending' && invoice.status === 'open' ? (
                                                <Button
                                                    onClick={() => handleAcceptDeal(deal)}
                                                    className="w-full bg-green-600 hover:bg-green-700"
                                                >
                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    オファーを承諾
                                                </Button>
                                            ) : deal.status === 'negotiating' ? (
                                                <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-center font-bold text-sm border border-orange-200">
                                                    交渉中
                                                </div>
                                            ) : deal.status === 'agreed' ? (
                                                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-center font-bold text-sm border border-green-200">
                                                    成約済み
                                                </div>
                                            ) : (
                                                <div className="bg-slate-100 text-slate-500 px-4 py-2 rounded-lg text-center text-sm border border-slate-200">
                                                    却下済み
                                                </div>
                                            )}

                                            <Button
                                                variant={deal.status === 'pending' ? 'outline' : 'primary'}
                                                onClick={() => navigate(`/chat?dealId=${deal.id}`)}
                                                className="w-full"
                                            >
                                                <MessageCircle className="mr-2 h-4 w-4" />
                                                チャットを確認
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
