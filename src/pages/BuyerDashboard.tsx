import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, CreditCard, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { hasUnreadMessages } from '../utils/chat';
import { useInvoiceFilter } from '../hooks/useInvoiceFilter';
import { InvoiceFilterPanel } from '../components/InvoiceFilterPanel';
import { InvoiceCard } from '../components/InvoiceCard';

export const BuyerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { invoices, deals, messages, users, invoiceStats, sellerUncompletedCounts, getUserTrackRecord } = useData();
    const { user } = useAuth();

    const [negotiatingSortOrder, setNegotiatingSortOrder] = useState<'desc' | 'asc'>('desc');

    // Tab State with sessionStorage persistence
    const [activeTab, setActiveTabState] = useState<'all' | 'negotiating' | 'processing' | 'completed' | 'withdrawn'>(() => {
        const saved = sessionStorage.getItem('buyerDashboardTab');
        return (saved === 'all' || saved === 'negotiating' || saved === 'processing' || saved === 'completed' || saved === 'withdrawn') ? saved : 'negotiating';
    });

    const setActiveTab = (tab: 'all' | 'negotiating' | 'processing' | 'completed' | 'withdrawn') => {
        setActiveTabState(tab);
        sessionStorage.setItem('buyerDashboardTab', tab);
    };

    const activeDeals = React.useMemo(() => {
        if (!user) return [];
        let filtered = deals.filter(d => d.buyerId === user.id);

        const todayStr = new Date().toISOString().split('T')[0];

        if (activeTab === 'negotiating') {
            filtered = filtered.filter(d => {
                const inv = invoices.find(i => i.id === d.invoiceId);
                const isOverdue = inv?.dueDate ? inv.dueDate < todayStr : false;
                return ['open', 'pending', 'negotiating'].includes(d.status) && inv?.status !== 'withdrawn' && !isOverdue;
            });
        } else if (activeTab === 'processing') {
            filtered = filtered.filter(d => {
                const inv = invoices.find(i => i.id === d.invoiceId);
                return d.status === 'concluded' && d.paymentStatus !== 'fully_settled' && inv?.status !== 'withdrawn';
            });
        } else if (activeTab === 'completed') {
            filtered = filtered.filter(d => {
                const inv = invoices.find(i => i.id === d.invoiceId);
                return d.status === 'concluded' && d.paymentStatus === 'fully_settled' && inv?.status !== 'withdrawn';
            });
        } else if (activeTab === 'withdrawn') {
            filtered = filtered.filter(d => {
                const inv = invoices.find(i => i.id === d.invoiceId);
                const isOverdue = inv?.dueDate ? inv.dueDate < todayStr : false;
                return d.status === 'rejected' || (inv && inv.status === 'withdrawn') || (isOverdue && !['concluded', 'agreed'].includes(d.status));
            });
        } else {
            // If activeTab is 'all', activeDeals shouldn't be used
            filtered = [];
        }

        filtered.sort((a, b) => {
            const timeA = new Date(a.startedAt).getTime();
            const timeB = new Date(b.startedAt).getTime();
            return negotiatingSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

        return filtered;
    }, [deals, user, negotiatingSortOrder, activeTab, invoices]);

    const hasUnreadNegotiating = React.useMemo(() => {
        return activeDeals.some(deal => hasUnreadMessages(deal.id, messages, user?.id));
    }, [activeDeals, messages, user]);

    const { profile } = useAuth();
    const isBuyer = profile?.role === 'buyer';

    // 【デバッグ用】取得した案件データをコンソールに出力
    useEffect(() => {
        console.log("=== BuyerDashboard 案件データ検証 ===");
        console.log("1. DataContextから取得した全Invoice:", invoices);
        console.log("2. ログインユーザー情報:", user);
        console.log("3. ステータスが 'open' のInvoice数:", invoices.filter(inv => inv.status === 'open').length);
        console.log("4. RLS等での欠落確認: もし1の数が0なら、フロントエンドより前にDB側(RLS等)で弾かれています。");
    }, [invoices, user]);

    const displayInvoices = React.useMemo(() => {
        let filtered = invoices;

        // Exclude invoices where the current user is the seller
        if (user) {
            filtered = filtered.filter(inv => inv.sellerId !== user.id);
        }

        if (activeTab === 'all') {
            const todayStr = new Date().toISOString().split('T')[0];
            return filtered.filter(inv => 
                (inv.status === 'open' || inv.status === 'pending' || inv.status === 'negotiating') && 
                (!inv.dueDate || inv.dueDate >= todayStr)
            );
        }
        return [];
    }, [invoices, activeTab, user]);

    const filterProps = useInvoiceFilter(
        displayInvoices, 
        (sellerId) => getUserTrackRecord(sellerId, 'seller'),
        (sellerId) => users.find(u => u.id === sellerId)?.industry
    );
    const {
        filteredAndSortedInvoices,
        resetFilters
    } = filterProps;

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                        <Building2 className="h-6 w-6 text-primary" />
                        買い手ダッシュボード
                    </h1>
                    {user && (
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 w-fit">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Track Record</span>
                            {getUserTrackRecord(user.id, 'buyer') === 0 ? (
                                <span className="text-sm font-bold text-blue-600 flex items-center gap-1">🔰 初回</span>
                            ) : (
                                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">🏆 成約 {getUserTrackRecord(user.id, 'buyer')}件</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex overflow-x-auto no-scrollbar gap-2 max-w-full">
                    <button
                        className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 relative flex items-center gap-1 ${activeTab === 'negotiating' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('negotiating')}
                    >
                        交渉中・進行中の案件
                        {hasUnreadNegotiating && (
                            <span className="flex h-2 w-2 relative ml-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    <button
                        className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'processing' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('processing')}
                    >
                        成約済・手続中の案件
                    </button>
                    <button
                        className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'completed' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('completed')}
                    >
                        取引完了の案件
                    </button>
                    <button
                        className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'withdrawn' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('withdrawn')}
                    >
                        中止・失注案件
                    </button>
                    <button
                        className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('all')}
                    >
                        プラットフォーム全体の案件
                    </button>
                </div>
            </div>

            {/* Tab 2, 3, 4, 5: My Deals */}
            {(activeTab === 'negotiating' || activeTab === 'processing' || activeTab === 'completed' || activeTab === 'withdrawn') && (
                <div className={`mb-8 p-4 rounded-lg border ${activeTab === 'negotiating' ? 'bg-orange-50/50 border-orange-100' : activeTab === 'withdrawn' ? 'bg-slate-50/50 border-slate-200' : 'bg-green-50/50 border-green-100'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${activeTab === 'negotiating' ? 'text-slate-800' : activeTab === 'withdrawn' ? 'text-slate-600' : 'text-green-800'}`}>
                            <CreditCard className={`h-5 w-5 ${activeTab === 'negotiating' ? 'text-orange-500' : activeTab === 'withdrawn' ? 'text-slate-400' : 'text-green-600'}`} />
                            {activeTab === 'negotiating' ? '現在交渉中・進行中の案件' : activeTab === 'processing' ? '成約済・手続中の案件' : activeTab === 'withdrawn' ? '中止・失注した案件' : '取引完了の案件'}
                        </h2>
                        <select
                            className="w-full sm:w-auto h-9 rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-sm text-slate-700"
                            value={negotiatingSortOrder}
                            onChange={(e) => setNegotiatingSortOrder(e.target.value as 'desc' | 'asc')}
                        >
                            <option value="desc">新着順</option>
                            <option value="asc">古い順</option>
                        </select>
                    </div>

                    {activeDeals.length === 0 ? (
                        !deals.some(d => d.buyerId === user?.id) && activeTab === 'negotiating' ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-[var(--color-gold)] shadow-sm col-span-full flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
                                    <Search className="h-10 w-10" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">ご登録ありがとうございます！</h2>
                                <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                                    現在、あなたの交渉・購入履歴はありません。まずは現在募集中の優良な売掛債権を探してみましょう。
                                </p>
                                <Button size="lg" onClick={() => setActiveTab('all')} className="bg-[var(--color-gold)] hover:bg-amber-600 text-white font-bold shadow-md rounded-full px-8">
                                    <Search className="mr-2 h-5 w-5" />
                                    募集中の案件を探す
                                </Button>
                            </div>
                        ) : (
                            <div className={`text-center py-12 bg-white rounded-xl border border-dashed col-span-full ${activeTab === 'negotiating' ? 'border-orange-200' : activeTab === 'withdrawn' ? 'border-slate-300' : 'border-green-200'}`}>
                                <p className="text-slate-500 font-medium">
                                    {activeTab === 'negotiating' ? '現在進行中の案件はありません。' : activeTab === 'processing' ? '成約済・手続中の案件はありません。' : activeTab === 'withdrawn' ? '中止・失注した案件はありません。' : '取引完了の案件はありません。'}
                                </p>
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeDeals.map((deal) => {
                                const inv = invoices.find(i => i.id === deal.invoiceId);
                                const seller = inv ? users.find(u => u.id === inv.sellerId) : null;
                                const invStats = invoiceStats[deal.invoiceId] || { offerCount: 0, maxOffer: 0 };
                                const maxOffer = invStats.maxOffer;

                                const todayStr = new Date().toISOString().split('T')[0];
                                const isOverdue = inv?.dueDate ? inv.dueDate < todayStr : false;
                                const isEffectivelyExpired = isOverdue && !['concluded', 'agreed'].includes(deal.status);

                                return (
                                    <Card key={deal.id} className={`bg-white cursor-pointer hover:shadow-md transition-all ${activeTab === 'completed' ? 'border-slate-200 grayscale-[20%]' : 'border-orange-200'}`} onClick={() => {
                                        if (activeTab === 'processing') navigate(`/chat?dealId=${deal.id}`);
                                        else if (activeTab === 'negotiating') navigate(`/chat?dealId=${deal.id}`);
                                    }}>
                                        <CardHeader className="pb-2">
                                            <div className="mb-2">
                                                {inv && (sellerUncompletedCounts[inv.sellerId] || 0) > 1 ? (
                                                    <div className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200 items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> ⚠ 未決済の債権が存在します
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-green-50 text-green-700 border border-green-200 items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> その他未決済債権なし
                                                    </div>
                                                )}
                                            </div>
                                            <CardTitle className="text-base flex justify-between">
                                                <span>{inv?.industry || '案件'} #{inv?.id || deal.invoiceId}</span>
                                                <div className="flex gap-2 items-center">
                                                    {hasUnreadMessages(deal.id, messages, user?.id) && (
                                                        <span className="flex h-3 w-3 relative">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                        </span>
                                                    )}
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                                        isEffectivelyExpired ? 'bg-slate-100 text-slate-600 border border-slate-300' :
                                                        (deal.status === 'pending' || deal.status === 'open') ? 'bg-yellow-100 text-yellow-800' :
                                                        deal.status === 'negotiating' ? 'bg-orange-100 text-orange-800' :
                                                            (deal.status === 'agreed' || deal.status === 'concluded') ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {isEffectivelyExpired ? '期限切れ' :
                                                            (deal.status === 'pending' || deal.status === 'open') ? '承諾待ち' :
                                                            deal.status === 'negotiating' ? '交渉中' :
                                                                (deal.status === 'agreed' || deal.status === 'concluded') ? '🎉 成約済' : '却下'}
                                                    </span>
                                                </div>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-sm text-slate-600 space-y-2">
                                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                                    <span className="text-slate-500">売り手企業:</span>
                                                    <span className="font-bold text-slate-800">{seller?.companyName || seller?.name || '不明な売り手'}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                                    <span className="text-slate-500">最高買取希望額:</span>
                                                    <span className="font-bold text-green-700">¥{maxOffer > 0 ? maxOffer.toLocaleString() : '---'}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1">
                                                    <span className="text-blue-800 font-bold">あなたの提示額:</span>
                                                    <span className="font-bold text-lg text-blue-900">¥{(deal.currentBuyerPrice || deal.currentAmount).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                                                    <span>最終更新:</span>
                                                    <span>{new Date(deal.lastMessageAt).toLocaleDateString()}</span>
                                                </div>

                                                <Button
                                                    className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/chat?dealId=${deal.id}`);
                                                    }}
                                                >
                                                    {activeTab === 'completed' ? 'チャット履歴を見る' : 'チャットへ戻る'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 1: All Market Invoices - Using shared InvoiceCard */}
            {activeTab === 'all' && (
                <>
                    {/* Only show Filter for Tab 1 as requested */}
                    <div className="mb-6">
                        <InvoiceFilterPanel {...filterProps} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAndSortedInvoices.map((inv) => (
                            <InvoiceCard
                                key={inv.id}
                                invoice={inv}
                                viewerRole="buyer"
                                currentUserId={user?.id}
                                deals={deals}
                                users={users}
                                messages={messages}
                                invoiceStats={invoiceStats[inv.id]}
                                sellerUncompletedCount={sellerUncompletedCounts[inv.sellerId] || 0}
                                getUserTrackRecord={getUserTrackRecord}
                                showFooterButton={true}
                                footerButtonLabel="詳細を見る"
                                isBuyer={isBuyer}
                                onClick={() => { if (inv.status !== 'sold') navigate(`/market/invoices/${inv.id}`) }}
                            />
                        ))}
                    </div>
                    {
                        (activeTab === 'all') && filteredAndSortedInvoices.length === 0 && (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <Search className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">
                                    条件に一致する案件は見つかりませんでした。
                                </p>
                                <Button variant="ghost" onClick={resetFilters} className="text-primary mt-2">
                                    検索条件をクリアする
                                </Button>
                            </div>
                        )
                    }
                    {/* End of display lists block wrapper */}
                </>
            )}

        </div>
    );
};
