import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, FileText, CreditCard, DollarSign, UserCog, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RegisterInvoiceModal } from '../components/RegisterInvoiceModal';
import { hasUnreadMessages } from '../utils/chat';
import { translateCompanySize } from '../utils/translations';
import { useInvoiceFilter } from '../hooks/useInvoiceFilter';
import { InvoiceFilterPanel } from '../components/InvoiceFilterPanel';
import { Search } from 'lucide-react';

export const SellerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { invoices, deals, messages } = useData();
    const { user } = useAuth();
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'my' | 'market'>('my');

    // Filter for current seller (strict check)
    const myInvoices = user ? invoices.filter(inv => inv.sellerId === user.id) : [];
    // Filter for market invoices (not mine, open or pending)
    const marketInvoices = user ? invoices.filter(inv => inv.sellerId !== user.id && (inv.status === 'open' || inv.status === 'pending')) : [];

    const displayInvoices = activeTab === 'my' ? myInvoices : marketInvoices;

    const filterProps = useInvoiceFilter(displayInvoices);
    const {
        filteredAndSortedInvoices,
        resetFilters
    } = filterProps;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    債権一覧
                </h1>
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
            <div className="flex border-b border-slate-200">
                <button
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'my' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('my')}
                >
                    自分の登録案件
                </button>
                <button
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'market' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('market')}
                >
                    プラットフォーム全体の案件
                </button>
            </div>

            <InvoiceFilterPanel {...filterProps} />

            {/* Invoice List */}
            <div className={`grid gap-6 ${activeTab === 'market' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {filteredAndSortedInvoices.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 col-span-full">
                        <Search className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">条件に一致する案件は見つかりませんでした。</p>
                        <Button variant="ghost" onClick={resetFilters} className="text-primary mt-2">
                            検索条件をクリアする
                        </Button>
                    </div>
                ) : (
                    filteredAndSortedInvoices.map((inv) => {
                        const invDeals = deals.filter(d => d.invoiceId === inv.id && ['open', 'pending', 'negotiating'].includes(d.status));
                        const maxOffer = invDeals.length > 0 ? Math.max(...invDeals.map(d => d.currentBuyerPrice || d.initialOfferAmount || 0)) : 0;
                        const isPartial = inv.sellingAmount && inv.sellingAmount < inv.amount;
                        const formattedDate = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '不明';

                        // Dynamic Status Logic
                        let dynamicStatus = inv.status === 'open' || inv.status === 'pending' ? '募集中' : inv.status === 'negotiating' ? '交渉中' : '成約済';
                        let statusColor = inv.status === 'open' || inv.status === 'pending' ? 'text-green-600 bg-green-50' : inv.status === 'negotiating' ? 'text-orange-600 bg-orange-50' : 'text-white bg-slate-500 uppercase tracking-widest';

                        // Determine if there are specific negotiation states for MY invoices
                        if (activeTab === 'my' && inv.status === 'negotiating') {
                            // Find active negotiations where buyer price > 0
                            const activeNegotiation = invDeals.find(d => d.status === 'negotiating' && (d.currentBuyerPrice || 0) > 0);
                            if (activeNegotiation) {
                                if (activeNegotiation.currentBuyerPrice === activeNegotiation.currentSellerPrice) {
                                    dynamicStatus = '金額合致 (最終確認待ち)';
                                    statusColor = 'text-blue-600 bg-blue-50';
                                } else if ((activeNegotiation.currentBuyerPrice || 0) > 0 && (activeNegotiation.currentSellerPrice || 0) === 0) {
                                    dynamicStatus = 'オファー受信 (回答待ち)';
                                    statusColor = 'text-purple-600 bg-purple-50';
                                } else if ((activeNegotiation.currentSellerPrice || 0) > 0) {
                                    dynamicStatus = '売主提示済 (買主検討中)';
                                    statusColor = 'text-indigo-600 bg-indigo-50';
                                }
                            }
                        }

                        return (
                            <Card
                                key={inv.id}
                                className={`flex flex-col h-full hover:shadow-lg transition-shadow border-slate-200 cursor-pointer ${inv.status === 'sold' ? 'opacity-[0.85] grayscale-[20%]' : ''}`}
                                onClick={() => navigate(activeTab === 'my' ? `/seller/invoices/${inv.id}` : `/market/invoices/${inv.id}`)}
                            >
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

                                    <div className="mt-4 pt-3 border-t border-slate-100 text-sm text-slate-600">
                                        <span className="font-bold text-slate-700 mr-1">信用情報:</span>
                                        {inv.companyCredit.length > 15 ? inv.companyCredit.substring(0, 15) + '...' : inv.companyCredit}
                                    </div>

                                    {deals.some(d => d.invoiceId === inv.id && hasUnreadMessages(d.id, messages, user?.id)) && (
                                        <div className="mt-3 flex items-center justify-center gap-2 text-red-500 text-sm font-bold bg-red-50 p-2 rounded">
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                            新着メッセージあり
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
};
