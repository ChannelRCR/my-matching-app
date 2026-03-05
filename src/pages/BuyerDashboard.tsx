import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, CreditCard, DollarSign, UserCog, TrendingUp, Search } from 'lucide-react';
import { calculateAnnualYield } from '../utils/calculations';
import { hasUnreadMessages } from '../utils/chat';
import { translateCompanySize } from '../utils/translations';
import { useInvoiceFilter } from '../hooks/useInvoiceFilter';
import { InvoiceFilterPanel } from '../components/InvoiceFilterPanel';

export const BuyerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { invoices, deals, messages, updateUser } = useData();
    const { user } = useAuth();

    const [negotiatingSortOrder, setNegotiatingSortOrder] = useState<'desc' | 'asc'>('desc');

    const activeDeals = React.useMemo(() => {
        if (!user) return [];
        let filtered = deals.filter(d => d.buyerId === user.id);

        filtered.sort((a, b) => {
            const timeA = new Date(a.startedAt).getTime();
            const timeB = new Date(b.startedAt).getTime();
            return negotiatingSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

        return filtered;
    }, [deals, user, negotiatingSortOrder]);

    const hasUnreadNegotiating = React.useMemo(() => {
        return activeDeals.some(deal => hasUnreadMessages(deal.id, messages, user?.id));
    }, [activeDeals, messages, user]);

    // We already have profile in AuthContext, but let's assume we want editable profile data.
    // We can use the user object from AuthContext or find it in users list if needed for updates.
    // For now, let's use the local state initialized from AuthContext profile if available.

    const [profileData, setProfileData] = useState({
        budget: '',
        appealPoint: ''
    });

    const { profile } = useAuth();

    useEffect(() => {
        if (profile) {
            setProfileData({
                budget: profile.budget?.toString() || '',
                appealPoint: profile.appealPoint || ''
            });
        }
    }, [profile]);


    const isBuyer = profile?.role === 'buyer';

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (user) {
            updateUser(user.id, {
                budget: Number(profileData.budget), // Ensure number
                appealPoint: profileData.appealPoint
            });
            alert('プロフィールを更新しました！');
        }
    };

    // 【デバッグ用】取得した案件データをコンソールに出力
    useEffect(() => {
        console.log("=== BuyerDashboard 案件データ検証 ===");
        console.log("1. DataContextから取得した全Invoice:", invoices);
        console.log("2. ログインユーザー情報:", user);
        console.log("3. ステータスが 'open' のInvoice数:", invoices.filter(inv => inv.status === 'open').length);
        console.log("4. RLS等での欠落確認: もし1の数が0なら、フロントエンドより前にDB側(RLS等)で弾かれています。");
    }, [invoices, user]);

    const [activeTab, setActiveTab] = useState<'all' | 'negotiating' | 'sold'>('all');

    const displayInvoices = React.useMemo(() => {
        if (activeTab === 'all') {
            return invoices.filter(inv => inv.status !== 'sold');
        } else if (activeTab === 'sold') {
            return invoices.filter(inv => inv.status === 'sold');
        }
        return [];
    }, [invoices, activeTab]);

    const filterProps = useInvoiceFilter(displayInvoices);
    const {
        filteredAndSortedInvoices,
        resetFilters
    } = filterProps;

    return (
        <div className="space-y-6">
            {/* Profile Settings Section - Only visible if Buyer */}
            {isBuyer && (
                <div className="mb-8 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-800">
                        <UserCog className="h-5 w-5 text-indigo-500" />
                        プロフィール設定
                    </h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">想定買取可能額（予算）</label>
                                <Input
                                    value={profileData.budget}
                                    onChange={(e) => setProfileData({ ...profileData, budget: e.target.value })}
                                    placeholder="例: 〜1,000万円"
                                    className="bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1">アピールポイント</label>
                                <textarea
                                    value={profileData.appealPoint}
                                    onChange={(e) => setProfileData({ ...profileData, appealPoint: e.target.value })}
                                    placeholder="例: 建設業界に強みがあります。即日資金化対応可能。"
                                    className="flex min-h-[42px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700">保存する</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-2">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                    <Building2 className="h-6 w-6 text-primary" />
                    買い手ダッシュボード
                </h1>

                <div className="flex overflow-x-auto no-scrollbar gap-2 max-w-full">
                    <button
                        className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('all')}
                    >
                        プラットフォーム全体の案件
                    </button>
                    <button
                        className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 relative flex items-center gap-1 ${activeTab === 'negotiating' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('negotiating')}
                    >
                        交渉中の案件
                        {hasUnreadNegotiating && (
                            <span className="flex h-2 w-2 relative ml-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    <button
                        className={`shrink-0 pb-2 px-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'sold' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('sold')}
                    >
                        成約済みの案件
                    </button>
                </div>
            </div>

            {/* Tab 2: Negotiating Deals */}
            {activeTab === 'negotiating' && (
                <div className="mb-8 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <CreditCard className="h-5 w-5 text-orange-500" />
                            現在交渉中の案件
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
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-orange-200 col-span-full">
                            <p className="text-slate-500 font-medium">現在交渉中の案件はありません。</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeDeals.map((deal) => {
                                const inv = invoices.find(i => i.id === deal.invoiceId);
                                return (
                                    <Card key={deal.id} className="border-orange-200 bg-white cursor-pointer hover:shadow-md transition-all">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex justify-between">
                                                <span>{inv?.industry || '案件'} #{inv?.id || deal.invoiceId}</span>
                                                <div className="flex gap-2 items-center">
                                                    {hasUnreadMessages(deal.id, messages, user?.id) && (
                                                        <span className="flex h-3 w-3 relative">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                        </span>
                                                    )}
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${(deal.status === 'pending' || deal.status === 'open') ? 'bg-yellow-100 text-yellow-800' :
                                                        deal.status === 'negotiating' ? 'bg-orange-100 text-orange-800' :
                                                            (deal.status === 'agreed' || deal.status === 'concluded') ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {(deal.status === 'pending' || deal.status === 'open') ? '承諾待ち' :
                                                            deal.status === 'negotiating' ? '交渉中' :
                                                                (deal.status === 'agreed' || deal.status === 'concluded') ? '🎉 成約済' : '却下'}
                                                    </span>
                                                </div>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-sm text-slate-600 space-y-2">
                                                <div className="flex justify-between">
                                                    <span>提示額:</span>
                                                    <span className="font-bold text-lg text-slate-900">¥{deal.currentAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-500">
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
                                                    チャットへ戻る
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

            {/* Tab 1 & Tab 3: All or Sold Invoices */}
            {(activeTab === 'all' || activeTab === 'sold') && (
                <>
                    {/* Only show Filter for Tab 1 as requested */}
                    {activeTab === 'all' && (
                        <div className="mb-6">
                            <InvoiceFilterPanel {...filterProps} />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAndSortedInvoices.map((inv) => {
                            const invDeals = deals.filter(d => d.invoiceId === inv.id && ['open', 'pending', 'negotiating'].includes(d.status));
                            const maxOffer = invDeals.length > 0 ? Math.max(...invDeals.map(d => d.currentBuyerPrice || d.initialOfferAmount || 0)) : 0;
                            const isPartial = inv.sellingAmount && inv.sellingAmount < inv.amount;
                            const formattedDate = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '不明';

                            // Dynamic Status Logic
                            const dynamicStatus = inv.status === 'open' || inv.status === 'pending' ? '募集中' : inv.status === 'negotiating' ? '交渉中' : '成約済';
                            const statusColor = inv.status === 'open' || inv.status === 'pending' ? 'text-green-600 bg-green-50' : inv.status === 'negotiating' ? 'text-orange-600 bg-orange-50' : 'text-white bg-slate-500 uppercase tracking-widest';

                            return (
                                <Card key={inv.id} className={`flex flex-col h-full hover:shadow-lg transition-shadow border-slate-200 cursor-pointer ${inv.status === 'sold' ? 'opacity-[0.85] grayscale-[20%]' : ''}`} onClick={() => { if (inv.status !== 'sold') navigate(`/market/invoices/${inv.id}`) }}>
                                    <CardContent className="p-5 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{inv.industry}</span>
                                                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{translateCompanySize(inv.companySize)}</span>
                                                <span className={`text-xs px-2 py-1 rounded font-bold ${isPartial ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {isPartial ? '一部売却' : '全部売却'}
                                                </span>
                                            </div>
                                            <div className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${statusColor}`}>
                                                {dynamicStatus}
                                            </div>
                                        </div>

                                        <div className="text-sm font-bold text-slate-800 mb-1 flex items-center justify-between">
                                            <span>{inv.isClientNamePublic ? (inv.debtorName || '企業名未設定') : '企業名非公開'} <span className="text-xs text-slate-400 font-normal ml-1">ID: {inv.id}</span></span>
                                            <span className="text-xs text-slate-500 font-normal flex items-center gap-1"><Calendar className="w-3 h-3" />登録: {formattedDate}</span>
                                        </div>

                                        <div className="mt-4 space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 flex items-center"><CreditCard className="w-4 h-4 mr-1" />全体債権額</span>
                                                <span className={isPartial ? 'line-through text-slate-400' : 'font-bold text-slate-700'}>¥{inv.amount.toLocaleString()}</span>
                                            </div>
                                            {isPartial && (
                                                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2">
                                                    <span className="text-amber-700 font-bold flex items-center"><DollarSign className="w-4 h-4 mr-1" />取引対象債権額</span>
                                                    <span className="font-bold text-amber-600 text-base">¥{inv.sellingAmount?.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2">
                                                <span className="text-primary font-bold">希望売却額</span>
                                                <span className="font-bold text-primary text-lg">¥{inv.requestedAmount?.toLocaleString() || '未設定'}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                                <div className="text-slate-500 text-xs mb-1 flex items-center"><UserCog className="w-3 h-3 mr-1" />オファー数</div>
                                                <div className="font-bold text-blue-700">{invDeals.length}件</div>
                                            </div>
                                            <div className="bg-green-50 p-2 rounded border border-green-100">
                                                <div className="text-slate-500 text-xs mb-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1" />最高買取希望額</div>
                                                <div className="font-bold text-green-700">¥{maxOffer > 0 ? maxOffer.toLocaleString() : '---'}</div>
                                            </div>
                                        </div>

                                        <div className="bg-green-50 p-3 rounded-md mt-4 border border-green-100">
                                            <div className="flex items-center justify-between text-green-800">
                                                <span className="font-bold text-sm">想定利回り (年率)</span>
                                                <span className="font-bold text-lg">
                                                    {inv.requestedAmount && (inv.sellingAmount || inv.amount) ?
                                                        calculateAnnualYield(inv.sellingAmount || inv.amount, inv.requestedAmount, inv.dueDate).toFixed(1)
                                                        : '0.0'}%
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-green-600 mt-1">
                                                {inv.sellingAmount && inv.sellingAmount < inv.amount ? '※売却対象額に対する年率 / ' : ''}期日までの日割り計算
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 text-sm text-slate-600">
                                            <span className="font-bold text-slate-700 mr-1">信用情報:</span>
                                            {inv.companyCredit.length > 15 ? inv.companyCredit.substring(0, 15) + '...' : inv.companyCredit}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0 pb-4">
                                        {inv.status === 'sold' ? (
                                            <Button
                                                className="w-full bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                                                disabled
                                            >
                                                取引終了
                                            </Button>
                                        ) : (
                                            <Button
                                                className={`w-full ${!isBuyer ? 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed opacity-70' : ''}`}
                                            >
                                                詳細を見る
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                    {
                        (activeTab === 'all' || activeTab === 'sold') && filteredAndSortedInvoices.length === 0 && (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                <Search className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">
                                    {activeTab === 'all' ? '条件に一致する案件は見つかりませんでした。' : '成約済みの案件はありません。'}
                                </p>
                                {activeTab === 'all' && (
                                    <Button variant="ghost" onClick={resetFilters} className="text-primary mt-2">
                                        検索条件をクリアする
                                    </Button>
                                )}
                            </div>
                        )
                    }
                    {/* End of display lists block wrapper */}
                </>
            )}

        </div>
    );
};
