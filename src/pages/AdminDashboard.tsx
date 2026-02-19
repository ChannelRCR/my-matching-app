import React, { useState } from 'react';
import { Users, DollarSign, Activity, AlertTriangle, ShieldAlert, CheckCircle, Ban } from 'lucide-react';
import { useMarket } from '../contexts/MarketContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const AdminDashboard: React.FC = () => {
    const { stats } = useMarket();
    const { users, deals, invoices, updateUser } = useData();

    // Calculate approximate fees (Mock calculation: 1% of total volume for demo)
    const totalFees = Math.floor(stats.totalVolume * 0.01);

    // Filter for recent deals (Transactions)
    // In a real app, this would be a separate API call sorted by date
    const recentDeals = [...deals].sort((a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ).slice(0, 10);

    const handleSuspendUser = (userId: string, currentStatus: string | undefined) => {
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        if (window.confirm(`ユーザーID: ${userId} のステータスを「${newStatus}」に変更しますか？`)) {
            updateUser(userId, { status: newStatus as 'active' | 'suspended' });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">管理者ダッシュボード</h1>
                    <p className="text-slate-500">プラットフォームの健全性と取引状況を監視・管理します。</p>
                </div>
                <div className="bg-slate-100 px-4 py-2 rounded-lg text-sm text-slate-600 font-mono">
                    System Status: <span className="text-emerald-600 font-bold">OPERATIONAL</span>
                </div>
            </div>

            {/* 1. Platform KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50">
                        <CardTitle className="text-sm font-medium text-slate-500">総取引額 (GMV)</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-slate-900">¥{stats.totalVolume.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">前月比 +12.5%</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50">
                        <CardTitle className="text-sm font-medium text-slate-500">成立件数 / 登録者</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-slate-900">{stats.completedDeals}件 <span className="text-sm font-normal text-slate-400">/ {stats.activeUsers}人</span></div>
                        <p className="text-xs text-slate-500 mt-1">アクティブ率 48%</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50">
                        <CardTitle className="text-sm font-medium text-slate-500">平均割引率</CardTitle>
                        <Activity className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-slate-900">{stats.averageDiscountRate}%</div>
                        <p className="text-xs text-slate-500 mt-1">市場適正範囲内</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50">
                        <CardTitle className="text-sm font-medium text-slate-500">累計手数料収益 (寄付)</CardTitle>
                        <DollarSign className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-slate-900">¥{totalFees.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">平均寄付率 1.0%</p>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Recent Transactions Monitoring */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="h-5 w-5 text-slate-500" />
                        直近の取引モニタリング
                    </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">取引ID</th>
                                <th className="px-6 py-3">売り手 / 買い手</th>
                                <th className="px-6 py-3">額面金額</th>
                                <th className="px-6 py-3">現在の提示額</th>
                                <th className="px-6 py-3">ステータス</th>
                                <th className="px-6 py-3">最終更新</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentDeals.map((deal) => {
                                const invoice = invoices.find(i => i.id === deal.invoiceId);
                                return (
                                    <tr key={deal.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-mono text-slate-500">{deal.id.slice(0, 8)}...</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-500">Seller: {deal.sellerId}</span>
                                                <span className="text-xs text-slate-500">Buyer: {deal.buyerId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">¥{invoice?.amount.toLocaleString() || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">¥{deal.currentAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${deal.status === 'agreed' ? 'bg-green-100 text-green-800' :
                                                    deal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-amber-100 text-amber-800'
                                                }`}>
                                                {deal.status === 'agreed' ? '成立' :
                                                    deal.status === 'rejected' ? '不成立' : '交渉中'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(deal.lastMessageAt).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                            {recentDeals.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        取引データがありません
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* 3. User Management & Penalties */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <ShieldAlert className="h-5 w-5 text-slate-500" />
                        ユーザー管理・ペナルティ設定
                    </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">ユーザーID</th>
                                <th className="px-6 py-3">氏名 / 会社名</th>
                                <th className="px-6 py-3">役割</th>
                                <th className="px-6 py-3">登録日</th>
                                <th className="px-6 py-3">ステータス</th>
                                <th className="px-6 py-3 text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((user) => (
                                <tr key={user.id} className={`hover:bg-slate-50/50 ${user.status === 'suspended' ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-6 py-4 font-mono text-slate-500">{user.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{user.name}</div>
                                        <div className="text-xs text-slate-500">{user.companyName}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${user.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                                                user.role === 'buyer' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-800'
                                            }`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{user.registeredAt || '2026-02-12'}</td>
                                    <td className="px-6 py-4">
                                        {user.status === 'suspended' ? (
                                            <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs uppercase">
                                                <AlertTriangle size={14} />
                                                Suspended
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase">
                                                <CheckCircle size={14} />
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            size="sm"
                                            variant={user.status === 'suspended' ? 'outline' : 'warning'} // Assuming warning variant exists or red style
                                            className={`${user.status === 'suspended' ? 'bg-white border-slate-300 text-slate-600' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200 shadow-none'}`}
                                            onClick={() => handleSuspendUser(user.id, user.status)}
                                        >
                                            {user.status === 'suspended' ? (
                                                <>
                                                    <CheckCircle size={14} className="mr-1" />
                                                    解除 (Activate)
                                                </>
                                            ) : (
                                                <>
                                                    <Ban size={14} className="mr-1" />
                                                    利用停止 (Suspend)
                                                </>
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
