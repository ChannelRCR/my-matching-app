import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RegisterInvoiceModal } from '../components/RegisterInvoiceModal';
import { hasUnreadMessages } from '../utils/chat';
import { useInvoiceFilter } from '../hooks/useInvoiceFilter';
import { InvoiceFilterPanel } from '../components/InvoiceFilterPanel';
import { InvoiceCard } from '../components/InvoiceCard';

export const SellerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { invoices, deals, messages, users, getUserTrackRecord } = useData();
    const { user } = useAuth();
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    // Tab State with sessionStorage persistence
    const [activeTab, setActiveTabState] = useState<'market' | 'negotiating' | 'processing' | 'completed' | 'withdrawn'>(() => {
        const saved = sessionStorage.getItem('sellerDashboardTab');
        return (saved === 'market' || saved === 'negotiating' || saved === 'processing' || saved === 'completed' || saved === 'withdrawn') ? saved : 'negotiating';
    });

    const setActiveTab = (tab: 'market' | 'negotiating' | 'processing' | 'completed' | 'withdrawn') => {
        setActiveTabState(tab);
        sessionStorage.setItem('sellerDashboardTab', tab);
    };

    const displayInvoices = React.useMemo(() => {
        if (!user) return [];
        const todayStr = new Date().toISOString().split('T')[0];

        if (activeTab === 'market') {
            return invoices.filter(inv => inv.status !== 'sold' && inv.status !== 'withdrawn' && (!inv.dueDate || inv.dueDate >= todayStr));
        } else if (activeTab === 'negotiating') {
            return invoices.filter(inv => {
                const isOverdue = inv.dueDate ? inv.dueDate < todayStr : false;
                return inv.sellerId === user.id && inv.status !== 'sold' && inv.status !== 'withdrawn' && !isOverdue;
            });
        } else if (activeTab === 'processing') {
            return invoices.filter(inv => {
                if (inv.sellerId !== user.id || inv.status !== 'sold') return false;
                const deal = deals.find(d => d.invoiceId === inv.id && d.status === 'concluded');
                return deal && deal.paymentStatus !== 'fully_settled';
            });
        } else if (activeTab === 'completed') {
            return invoices.filter(inv => {
                if (inv.sellerId !== user.id || inv.status !== 'sold') return false;
                const deal = deals.find(d => d.invoiceId === inv.id && d.status === 'concluded');
                return deal && deal.paymentStatus === 'fully_settled';
            });
        } else if (activeTab === 'withdrawn') {
            return invoices.filter(inv => {
                if (inv.sellerId !== user.id) return false;
                const isOverdue = inv.dueDate ? inv.dueDate < todayStr : false;
                return inv.status === 'withdrawn' || (inv.status !== 'sold' && isOverdue);
            });
        }
        return [];
    }, [invoices, deals, user, activeTab]);

    const hasUnreadMyInvoices = React.useMemo(() => {
        if (!user) return false;
        const myInvoiceIds = invoices.filter(inv => inv.sellerId === user.id && inv.status !== 'sold').map(i => i.id);
        const myDeals = deals.filter(d => myInvoiceIds.includes(d.invoiceId) && ['open', 'pending', 'negotiating'].includes(d.status));
        return myDeals.some(deal => hasUnreadMessages(deal.id, messages, user.id));
    }, [invoices, deals, messages, user]);

    const filterProps = useInvoiceFilter(displayInvoices);
    const {
        filteredAndSortedInvoices,
        resetFilters
    } = filterProps;

    // Helper: compute dynamic status for seller's own negotiating view
    const getSellerDynamicStatus = (inv: typeof invoices[0]) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const isOverdue = inv.dueDate ? inv.dueDate < todayStr : false;
        const isEffectivelyExpired = isOverdue && inv.status !== 'sold';
        const invDeals = deals.filter(d => d.invoiceId === inv.id && ['open', 'pending', 'negotiating'].includes(d.status));

        if (inv.status === 'withdrawn' || isEffectivelyExpired) {
            return {
                label: inv.status === 'withdrawn' ? '出品中止' : '期限切れ',
                color: 'text-slate-600 bg-slate-100 border-slate-300'
            };
        }

        if (activeTab === 'negotiating' && inv.status === 'negotiating') {
            const activeNegotiation = invDeals.find(d => d.status === 'negotiating' && (d.currentBuyerPrice || 0) > 0);
            if (activeNegotiation) {
                if (activeNegotiation.currentBuyerPrice === activeNegotiation.currentSellerPrice) {
                    return { label: '金額合致 (最終確認待ち)', color: 'text-blue-600 bg-blue-50 border-blue-200' };
                } else if ((activeNegotiation.currentBuyerPrice || 0) > 0 && (activeNegotiation.currentSellerPrice || 0) === 0) {
                    return { label: 'オファー受信 (回答待ち)', color: 'text-purple-600 bg-purple-50 border-purple-200' };
                } else if ((activeNegotiation.currentSellerPrice || 0) > 0) {
                    return { label: '売主提示済 (買主検討中)', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
                }
            }
        }

        return undefined; // Use defaults
    };

    // Helper: compute uncompleted status
    const getIsUncompleted = (inv: typeof invoices[0]) => {
        if (inv.sellerId !== user?.id) return false;
        if (['withdrawn', 'cancelled', 'rejected'].includes(inv.status as string)) return false;
        if (inv.status !== 'sold') return false;
        const associatedDeal = deals.find(d => d.invoiceId === inv.id && d.status === 'concluded');
        return !!(associatedDeal && associatedDeal.paymentStatus !== 'fully_settled');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        債権一覧
                    </h1>
                    {user && (
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 w-fit">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Track Record</span>
                            {getUserTrackRecord(user.id, 'seller') === 0 ? (
                                <span className="text-sm font-bold text-blue-600 flex items-center gap-1">🔰 初回</span>
                            ) : (
                                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">🏆 成約 {getUserTrackRecord(user.id, 'seller')}件</span>
                            )}
                        </div>
                    )}
                </div>
                <Button onClick={() => setIsRegisterModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    案件の新規登録
                </Button>
            </div>

            <RegisterInvoiceModal
                isOpen={isRegisterModalOpen}
                onClose={() => setIsRegisterModalOpen(false)}
            />

            {/* Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 max-w-full border-b border-slate-200 mb-6">
                <button
                    className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 relative flex items-center gap-1 ${activeTab === 'negotiating' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('negotiating')}
                >
                    交渉中・進行中の案件
                    {hasUnreadMyInvoices && (
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
                    中止案件
                </button>
                <button
                    className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'market' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('market')}
                >
                    プラットフォーム全体の案件
                </button>
            </div>

            {activeTab === 'market' && (
                <div className="mb-6">
                    <InvoiceFilterPanel {...filterProps} />
                </div>
            )}

            {/* Invoice List */}
            <div className={`grid gap-6 ${activeTab === 'market' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {filteredAndSortedInvoices.length === 0 ? (
                    !invoices.some(inv => inv.sellerId === user?.id) && activeTab === 'negotiating' ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-blue-100 shadow-sm col-span-full flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                                <FileText className="h-10 w-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">ご登録ありがとうございます！</h2>
                            <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
                                まだ登録された案件がありません。まずは現金化したい売掛債権（請求書）を登録して、買主からのオファーを待ちましょう。
                            </p>
                            <Button size="lg" onClick={() => setIsRegisterModalOpen(true)} className="font-bold shadow-md rounded-full px-8">
                                <PlusCircle className="mr-2 h-5 w-5" />
                                新規案件を登録する
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 col-span-full">
                            <Search className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">
                                {activeTab === 'completed' ? '取引完了の案件はありません。' : activeTab === 'processing' ? '成約済・手続中の案件はありません。' : activeTab === 'negotiating' ? '現在進行中の案件はありません。' : activeTab === 'withdrawn' ? '中止した案件はありません。' : '条件に一致する案件は見つかりませんでした。'}
                            </p>
                            {activeTab === 'market' && (
                                <Button variant="ghost" onClick={resetFilters} className="text-primary mt-2">
                                    検索条件をクリアする
                                </Button>
                            )}
                        </div>
                    )
                ) : (
                    filteredAndSortedInvoices.map((inv) => (
                        <InvoiceCard
                            key={inv.id}
                            invoice={inv}
                            viewerRole="seller"
                            currentUserId={user?.id}
                            deals={deals}
                            users={users}
                            messages={messages}
                            getUserTrackRecord={getUserTrackRecord}
                            statusOverride={getSellerDynamicStatus(inv)}
                            isUncompleted={getIsUncompleted(inv)}
                            onClick={() => {
                                if (activeTab === 'processing') {
                                    const concludedDeal = deals.find(d => d.invoiceId === inv.id && d.status === 'concluded');
                                    if (concludedDeal) navigate(`/chat?dealId=${concludedDeal.id}`);
                                } else {
                                    navigate(activeTab !== 'market' ? `/seller/invoices/${inv.id}` : `/market/invoices/${inv.id}`);
                                }
                            }}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
