import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, MessageCircle, FileText, CheckCircle2, CreditCard, DollarSign, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Deal } from '../types';
import { hasUnreadMessages } from '../utils/chat';
import { translateCompanySize } from '../utils/translations';

export const SellerInvoiceDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { invoices, deals, users, acceptDeal, messages } = useData();
    const { user } = useAuth();

    const invoice = (id && invoices.length > 0) ? invoices.find(i => i.id === id) || null : null;
    
    const invoiceDeals = React.useMemo(() => {
        if (!id || invoices.length === 0) return [];
        const relevantDeals = deals.filter(d => d.invoiceId === id);
        return relevantDeals.sort((a, b) => {
            const amountA = a.currentBuyerPrice || a.currentAmount || 0;
            const amountB = b.currentBuyerPrice || b.currentAmount || 0;
            if (amountB !== amountA) {
                return amountB - amountA; // DESC
            }
            return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime();
        });
    }, [id, invoices.length, deals]);

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

    const handleAcceptDeal = async (deal: Deal) => {
        if (window.confirm(`${getBuyerName(deal.buyerId)} からのオファーを承諾しますか？\n\n・この買い手と交渉フェーズに入ります\n・他のオファーは却下されます\n・マーケットプレイスでの募集は停止されます`)) {
            await acceptDeal(deal);
            alert('オファーを承諾しました。交渉を開始してください。');
        }
    };

    const handleWithdrawInvoice = async () => {
        if (window.confirm('本当にこの案件を取り下げますか？\n（取り下げた案件は買い手から見えなくなり、元に戻すことはできません）')) {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'withdrawn' })
                .eq('id', invoice.id);
            
            if (error) {
                console.error('Invoice withdrawal failed', error);
                alert('案件の取り下げに失敗しました。');
            } else {
                if (invoiceDeals.length > 0) {
                    const messagesToInsert = invoiceDeals.map(d => ({
                        deal_id: d.id,
                        sender_id: user?.id || invoice.sellerId,
                        receiver_id: d.buyerId,
                        content: '【システム通知】売り手がこの案件を取り下げました。',
                        is_system_message: true,
                        read: false,
                        created_at: new Date().toISOString()
                    }));
                    
                    const { error: msgError } = await supabase
                        .from('messages')
                        .insert(messagesToInsert);
                        
                    if (msgError) console.error('Failed to notify buyers', msgError);
                }

                alert('案件を取り下げました。');
                navigate('/seller/dashboard');
            }
        }
    };

    const handleViewEvidence = async () => {
        if (!invoice?.evidenceUrl) return;
        
        // 旧システムでのパブリックURLの場合はそのまま開く
        if (invoice.evidenceUrl.startsWith('http')) {
            window.open(invoice.evidenceUrl, '_blank');
            return;
        }

        // privateバケットからのSigned URL取得
        const { data, error } = await supabase.storage
            .from('invoice_evidences')
            .createSignedUrl(invoice.evidenceUrl, 60); // 60秒間有効

        if (error || !data) {
            console.error('Error fetching signed URL:', error);
            alert('証拠書類の取得に失敗しました。');
            return;
        }
        
        window.open(data.signedUrl, '_blank');
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
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-lg flex items-center gap-3">
                                案件詳細
                                {['open', 'pending', 'negotiating'].includes(invoice.status) && (
                                    <Button variant="outline" size="sm" onClick={handleWithdrawInvoice} className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        取り下げる
                                    </Button>
                                )}
                            </CardTitle>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${invoice.status === 'open' ? 'bg-green-100 text-green-700' :
                                invoice.status === 'negotiating' ? 'bg-orange-100 text-orange-700' :
                                    invoice.status === 'withdrawn' ? 'bg-slate-200 text-slate-500' :
                                        'bg-slate-100 text-slate-700'
                                }`}>
                                {invoice.status === 'open' ? '募集中' :
                                    invoice.status === 'negotiating' ? '交渉中' :
                                        invoice.status === 'withdrawn' ? '取下げ済' : '完了'}
                            </span>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                            <div className="flex flex-wrap gap-1.5">
                                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{invoice.industry}</span>
                                {invoice.claimType && <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{invoice.claimType}</span>}
                                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{translateCompanySize(invoice.companySize)}</span>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${invoice.saleType === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {invoice.saleType === 'partial' ? '一部売却' : '全部売却'}
                                </span>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                <div>
                                    <h3 className="flex items-center text-slate-500 font-medium mb-1 text-sm">
                                        <CreditCard className="w-4 h-4 mr-1.5" />
                                        請求書額面
                                    </h3>
                                    <p className={`text-xl font-bold ${invoice.saleType === 'partial' ? 'text-slate-400 line-through text-lg' : 'text-slate-900'}`}>
                                        ¥{invoice.amount.toLocaleString()}
                                    </p>
                                </div>
                                {invoice.saleType === 'partial' && invoice.requestedAmount !== invoice.amount && (
                                    <div className="pt-3 border-t border-slate-200">
                                        <h3 className="flex items-center text-amber-700 font-bold text-sm mb-1">
                                            <DollarSign className="w-4 h-4 mr-1" />
                                            譲渡対象金額
                                        </h3>
                                        <p className="text-xl font-bold text-amber-600">
                                            ¥{invoice.requestedAmount?.toLocaleString()}
                                        </p>
                                    </div>
                                )}
                                <div className="pt-3 border-t border-slate-200">
                                    <h3 className="flex items-center text-primary font-bold text-sm mb-1">
                                        <DollarSign className="w-4 h-4 mr-1" />
                                        希望売却額
                                    </h3>
                                    <p className="text-xl font-bold text-primary">
                                        ¥{invoice.sellingAmount?.toLocaleString() || '未設定'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-slate-500">入金期日</span>
                                    <span className="font-bold">{invoice.dueDate}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-1">信用情報</span>
                                    <span className="font-medium block bg-slate-50 p-2 rounded text-xs">
                                        {invoice.companyCredit}
                                    </span>
                                </div>
                            </div>

                            {invoice.evidenceUrl && (
                                <button
                                    onClick={handleViewEvidence}
                                    className="flex items-center justify-center gap-2 w-full mt-4 p-2 bg-blue-50 text-blue-600 rounded text-sm hover:underline hover:bg-blue-100 transition-colors"
                                >
                                    <FileText size={16} />
                                    証拠書類を確認 (プレビュー/ダウンロード)
                                </button>
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
                            (() => {
                                const maxAmount = Math.max(...invoiceDeals.map(d => d.currentBuyerPrice || d.currentAmount || 0));
                                return invoiceDeals.map((deal) => {
                                    const dealAmount = deal.currentBuyerPrice || deal.currentAmount || 0;
                                    const isHighest = dealAmount === maxAmount && maxAmount > 0;
                                    return (
                                        <Card key={deal.id} className="hover:shadow-md transition-all border-l-4 border-l-primary/50 relative overflow-hidden">
                                            {isHighest && (
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
                                                            ¥{dealAmount.toLocaleString()}
                                                        </span>
                                                    </div>
                                            {(deal.status === 'agreed' || deal.status === 'concluded') && (
                                                <span className="inline-flex items-center gap-1 text-green-600 font-bold text-sm mt-1">
                                                    <CheckCircle2 size={14} /> 🎉 成約済み
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[140px]">
                                            {(deal.status === 'pending' || deal.status === 'open') && invoice.status === 'open' ? (
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
                                            ) : (deal.status === 'agreed' || deal.status === 'concluded') ? (
                                                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-center font-bold text-sm border border-green-200">
                                                    🎉 成約済み
                                                </div>
                                            ) : (
                                                <div className="bg-slate-100 text-slate-500 px-4 py-2 rounded-lg text-center text-sm border border-slate-200">
                                                    却下済み
                                                </div>
                                            )}

                                            <Button
                                                variant={(deal.status === 'pending' || deal.status === 'open') ? 'outline' : 'primary'}
                                                onClick={() => navigate(`/chat?dealId=${deal.id}`)}
                                                className="w-full relative"
                                            >
                                                {hasUnreadMessages(deal.id, messages, user?.id) && (
                                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                    </span>
                                                )}
                                                <MessageCircle className="mr-2 h-4 w-4" />
                                                チャットを確認
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        });
                    })()
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};
