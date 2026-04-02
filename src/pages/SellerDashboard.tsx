import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, FileText, DollarSign, UserCog, Calendar, TrendingUp, Search, AlertCircle, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RegisterInvoiceModal } from '../components/RegisterInvoiceModal';
import { hasUnreadMessages } from '../utils/chat';
import { translateCompanySize } from '../utils/translations';
import { useInvoiceFilter } from '../hooks/useInvoiceFilter';
import { InvoiceFilterPanel } from '../components/InvoiceFilterPanel';
import { calculateAnnualYield } from '../utils/calculations';

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
        // Only consider invoices that are not sold
        const myInvoiceIds = invoices.filter(inv => inv.sellerId === user.id && inv.status !== 'sold').map(i => i.id);
        // Only consider active/negotiating deals
        const myDeals = deals.filter(d => myInvoiceIds.includes(d.invoiceId) && ['open', 'pending', 'negotiating'].includes(d.status));
        return myDeals.some(deal => hasUnreadMessages(deal.id, messages, user.id));
    }, [invoices, deals, messages, user]);

    const filterProps = useInvoiceFilter(displayInvoices);
    const {
        filteredAndSortedInvoices,
        resetFilters
    } = filterProps;

    const myProfile = user ? users.find(u => u.id === user.id) : null;

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
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 col-span-full">
                        <Search className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">
                            {activeTab === 'completed' ? '取引完了の案件はありません。' : activeTab === 'processing' ? '成約済・手続中の案件はありません。' : activeTab === 'negotiating' ? 'まだ登録された案件はありません。' : activeTab === 'withdrawn' ? '中止した案件はありません。' : '条件に一致する案件は見つかりませんでした。'}
                        </p>
                        {activeTab === 'market' && (
                            <Button variant="ghost" onClick={resetFilters} className="text-primary mt-2">
                                検索条件をクリアする
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredAndSortedInvoices.map((inv) => {
                        const invDeals = deals.filter(d => d.invoiceId === inv.id && ['open', 'pending', 'negotiating'].includes(d.status));
                        const maxOffer = invDeals.length > 0 ? Math.max(...invDeals.map(d => d.currentBuyerPrice || d.initialOfferAmount || 0)) : 0;
                        const isPartial = inv.saleType === 'partial' || (inv.requestedAmount && inv.requestedAmount < inv.amount) || false;
                        const returnAmount = isPartial && inv.requestedAmount ? inv.requestedAmount : inv.amount;
                        const formattedDate = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '不明';

                        const todayStr = new Date().toISOString().split('T')[0];
                        const isOverdue = inv.dueDate ? inv.dueDate < todayStr : false;
                        const isEffectivelyExpired = isOverdue && inv.status !== 'sold';

                        // Dynamic Status Logic
                        let dynamicStatus = inv.status === 'open' || inv.status === 'pending' ? '募集中' : inv.status === 'negotiating' ? '交渉中' : '成約済';
                        let statusColor = inv.status === 'open' || inv.status === 'pending' ? 'text-green-600 bg-green-50 border-green-200' : inv.status === 'negotiating' ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-slate-600 bg-slate-100 border-slate-200 uppercase tracking-widest';

                        if (inv.status === 'withdrawn' || isEffectivelyExpired) {
                            dynamicStatus = inv.status === 'withdrawn' ? '出品中止' : '期限切れ';
                            statusColor = 'text-slate-600 bg-slate-100 border-slate-300';
                        } else if (activeTab === 'negotiating' && inv.status === 'negotiating') {
                            // Find active negotiations where buyer price > 0
                            const activeNegotiation = invDeals.find(d => d.status === 'negotiating' && (d.currentBuyerPrice || 0) > 0);
                            if (activeNegotiation) {
                                if (activeNegotiation.currentBuyerPrice === activeNegotiation.currentSellerPrice) {
                                    dynamicStatus = '金額合致 (最終確認待ち)';
                                    statusColor = 'text-blue-600 bg-blue-50 border-blue-200';
                                } else if ((activeNegotiation.currentBuyerPrice || 0) > 0 && (activeNegotiation.currentSellerPrice || 0) === 0) {
                                    dynamicStatus = 'オファー受信 (回答待ち)';
                                    statusColor = 'text-purple-600 bg-purple-50 border-purple-200';
                                } else if ((activeNegotiation.currentSellerPrice || 0) > 0) {
                                    dynamicStatus = '売主提示済 (買主検討中)';
                                    statusColor = 'text-indigo-600 bg-indigo-50 border-indigo-200';
                                }
                            }
                        }

                        // Determine if it is an "Uncompleted" transaction
                        let isUncompleted = false;
                        if (inv.sellerId === user?.id) {
                            if (inv.status !== 'sold') {
                                isUncompleted = true;
                            } else {
                                const associatedDeal = deals.find(d => d.invoiceId === inv.id && d.status === 'concluded');
                                if (associatedDeal && associatedDeal.paymentStatus !== 'fully_settled') {
                                    isUncompleted = true;
                                }
                            }
                        }

                        return (
                            <Card
                                key={inv.id}
                                className={`flex flex-col h-full hover:shadow-lg transition-shadow border-slate-200 cursor-pointer ${inv.status === 'sold' && !isUncompleted ? 'opacity-[0.85] grayscale-[20%]' : ''}`}
                                onClick={() => {
                                    if (activeTab === 'processing') {
                                        const concludedDeal = deals.find(d => d.invoiceId === inv.id && d.status === 'concluded');
                                        if (concludedDeal) navigate(`/chat?dealId=${concludedDeal.id}`);
                                    } else {
                                        navigate(activeTab !== 'market' ? `/seller/invoices/${inv.id}` : `/market/invoices/${inv.id}`);
                                    }
                                }}
                            >
                                <CardContent className="p-5 flex-1 flex flex-col">
                                    {/* 第1層：バッジ類 */}
                                    <div className="flex flex-col gap-2 mb-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-wrap gap-1.5 items-center">
                                                {inv.createdAt && (new Date().getTime() - new Date(inv.createdAt).getTime() < 24 * 60 * 60 * 1000) && (
                                                    <span className="bg-red-100 text-red-700 text-[11px] px-2 py-0.5 rounded font-bold border border-red-200">NEW</span>
                                                )}
                                                <span className={`text-[11px] px-2 py-0.5 rounded font-bold border ${isPartial ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                    {isPartial ? '一部売却' : '全部売却'}
                                                </span>
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>
                                                    {dynamicStatus}
                                                </span>
                                                {isUncompleted && (
                                                    <div className="text-[10px] ml-1 font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> 未決済・進行中
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0 ml-2"><Calendar className="w-3 h-3" /> {formattedDate}</span>
                                        </div>
                                    </div>

                                    {/* 第2層：自社（Seller）の情報ブロック */}
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                                        <div className="flex items-center gap-1.5 mb-2 text-slate-500 font-bold text-xs">
                                            <User className="w-4 h-4" /> <span>出品企業（自社）</span>
                                        </div>
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <span className="font-bold text-slate-800 text-sm truncate max-w-full" title={myProfile?.companyName || myProfile?.name || '自社'}>
                                                {myProfile?.companyName || myProfile?.name || '自社'}
                                            </span>
                                            {user && (
                                                <div className="text-[10px] font-bold bg-white inline-flex px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                                    {getUserTrackRecord(user.id, 'seller') === 0 ? (
                                                        <span className="text-blue-600">🔰 初回</span>
                                                    ) : (
                                                        <span className="text-emerald-600">🏆 成約 {getUserTrackRecord(user.id, 'seller')}件</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 第3層：売掛先（Debtor）と債権の情報ブロック */}
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/20"></div>
                                        
                                        <div className="flex items-center gap-1.5 mb-3 text-slate-700 font-bold text-sm">
                                            <Building2 className="w-4 h-4 text-indigo-500" /> <span>売掛先（債務者）および債権情報</span>
                                        </div>
                                        
                                        <div className="mb-4 flex flex-wrap gap-1.5">
                                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{inv.debtorName || '企業名未設定'}</span>
                                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{inv.industry}</span>
                                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{translateCompanySize(inv.companySize)}</span>
                                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{inv.claimType || '売掛金'}</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                                <span className="text-slate-500">額面 (全体債権額)</span>
                                                <span className="font-medium text-slate-600">¥{inv.amount.toLocaleString()}</span>
                                            </div>
                                            
                                            {isPartial && inv.requestedAmount && (
                                                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                                    <span className="text-slate-600 font-bold">譲渡対象額</span>
                                                    <span className="font-bold text-slate-800">¥{inv.requestedAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-center p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                                                <span className="text-indigo-800 font-bold flex items-center gap-1"><DollarSign className="w-4 h-4"/>希望売却額</span>
                                                <span className="font-black text-indigo-700 text-lg sm:text-xl tracking-tight">¥{inv.sellingAmount?.toLocaleString() || '未設定'}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <div className="flex flex-col p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3"/> 入金期日</span>
                                                    <span className="font-bold text-slate-700 text-sm">{inv.dueDate}</span>
                                                </div>
                                                <div className="flex flex-col p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                    <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-0.5">想定利回り(年率)</span>
                                                    <span className="font-bold text-emerald-700 text-sm flex items-baseline gap-0.5">
                                                        {inv.sellingAmount ? calculateAnnualYield(returnAmount, inv.sellingAmount, inv.dueDate).toFixed(1) : '0.0'}
                                                        <span className="text-[10px] font-normal">%</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 第4層：オファー状況（最下部） */}
                                    <div className="mt-auto flex flex-col gap-3">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex flex-col justify-center items-center">
                                                <span className="text-slate-500 text-[10px] font-bold mb-0.5 flex items-center"><UserCog className="w-3 h-3 mr-1" />オファー数</span>
                                                <span className="font-bold text-blue-700 text-sm">{invDeals.length} <span className="text-[10px] font-normal">件</span></span>
                                            </div>
                                            <div className="bg-orange-50/50 p-2 rounded-lg border border-orange-100 flex flex-col justify-center items-center">
                                                <span className="text-slate-500 text-[10px] font-bold mb-0.5 flex items-center"><TrendingUp className="w-3 h-3 mr-1" />現在の最高提示額</span>
                                                <span className="font-bold text-orange-700 text-sm">{maxOffer > 0 ? `¥${maxOffer.toLocaleString()}` : '---'}</span>
                                            </div>
                                        </div>

                                        {deals.some(d => d.invoiceId === inv.id && hasUnreadMessages(d.id, messages, user?.id)) && (
                                            <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg border border-red-100 mt-1 shadow-sm">
                                                <span className="flex h-2 w-2 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                </span>
                                                新着メッセージあり
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
};
