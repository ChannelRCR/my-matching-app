import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, CreditCard, DollarSign, UserCog } from 'lucide-react';

export const BuyerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { invoices, deals, updateUser } = useData();
    const { user } = useAuth();

    // Filter deals for current buyer
    const activeDeals = user ? deals.filter(d => d.buyerId === user.id) : [];

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

            {/* Active Deals Section */}
            {/* Active Deals Section - Always visible if requested */}
            <div className="mb-8 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-800">
                    <CreditCard className="h-5 w-5 text-orange-500" />
                    交渉中の案件
                </h2>

                {activeDeals.length === 0 ? (
                    <p className="text-slate-500 text-sm">現在交渉中の案件はありません。</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeDeals.map((deal) => {
                            const inv = invoices.find(i => i.id === deal.invoiceId);
                            // Fallback if inv not found, though it should be
                            return (
                                <Card key={deal.id} className="border-orange-200 bg-white cursor-pointer hover:shadow-md transition-all">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex justify-between">
                                            <span>{inv?.industry || '案件'} #{inv?.id || deal.invoiceId}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${deal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                deal.status === 'negotiating' ? 'bg-orange-100 text-orange-800' :
                                                    deal.status === 'agreed' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {deal.status === 'pending' ? '承諾待ち' :
                                                    deal.status === 'negotiating' ? '交渉中' :
                                                        deal.status === 'agreed' ? '成約済' : '却下'}
                                            </span>
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

            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                案件一覧（投資機会）
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invoices.filter(inv => inv.status === 'open').map((inv) => (
                    <Card key={inv.id} className="flex flex-col h-full hover:shadow-lg transition-shadow border-slate-200 cursor-pointer" onClick={() => navigate(`/market/invoices/${inv.id}`)}>
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                                        {inv.industry}
                                    </div>
                                    <CardTitle className="text-lg">
                                        企業名非公開
                                        <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                            ID: {inv.id}
                                        </span>
                                    </CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-slate-600 font-medium">
                                    <CreditCard className="w-4 h-4 mr-2 text-slate-400" />
                                    請求書額面
                                </div>
                                <div className="text-lg font-bold">¥{inv.amount.toLocaleString()}</div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-slate-600 font-medium">
                                    <DollarSign className="w-4 h-4 mr-2 text-slate-400" />
                                    希望買取額
                                </div>
                                <div className="text-lg font-bold text-primary">¥{inv.requestedAmount?.toLocaleString()}</div>
                            </div>

                            <div className="bg-green-50 p-3 rounded-md">
                                <div className="flex items-center justify-between text-green-800">
                                    <span className="font-bold text-sm">想定利回り (年率)</span>
                                    <span className="font-bold text-lg">
                                        {inv.requestedAmount && inv.amount ?
                                            (((inv.amount - inv.requestedAmount) / inv.requestedAmount) * 12 * 100).toFixed(1)
                                            : '0.0'}%
                                    </span>
                                </div>
                                <p className="text-[10px] text-green-600 text-right mt-1">※1か月後の入金を前提</p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-slate-600 font-medium">
                                    <UserCog className="w-4 h-4 mr-2 text-slate-400" />
                                    現在のオファー数
                                </div>
                                <div className="font-bold text-blue-600">
                                    {deals ? deals.filter(d => d.invoiceId === inv.id && d.status === 'pending').length : 0}件
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center text-slate-600 font-medium">
                                    <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                    入金期日
                                </div>
                                <div>{inv.dueDate}</div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-600 leading-relaxed">
                                <span className="font-bold block mb-1 text-slate-700">信用情報:</span>
                                {inv.companyCredit}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 border-t border-slate-100">
                            <Button
                                className={`w-full ${!isBuyer ? 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed opacity-70' : ''}`}
                            >
                                詳細を見る
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {
                invoices.filter(inv => inv.status === 'open').length === 0 && (
                    <p className="text-center text-slate-500 py-12">現在募集中案件はありません。</p>
                )
            }


        </div >
    );
};
