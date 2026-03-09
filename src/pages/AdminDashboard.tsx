import React, { useState } from 'react';
import { Users, DollarSign, Activity, AlertTriangle, ShieldAlert, CheckCircle, FileText, Handshake, LayoutDashboard, X } from 'lucide-react';
import { useMarket } from '../contexts/MarketContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { User } from '../types';

type TabId = 'summary' | 'users' | 'invoices' | 'deals';

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('summary');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { stats } = useMarket();
    const { users, deals, invoices, updateUser } = useData();

    const getOngoingDealsCount = (userId: string) => {
        return deals.filter(d =>
            (d.buyerId === userId || d.sellerId === userId) &&
            ['open', 'negotiating', 'agreed'].includes(d.status)
        ).length;
    };

    // Calculate approximate fees (Mock calculation: 1% of total volume for demo)
    const totalFees = Math.floor(stats.totalVolume * 0.01);

    // Filter for recent deals (Transactions)
    const recentDeals = [...deals].sort((a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    const handleSuspendUser = (userId: string, currentStatus: string | undefined) => {
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        if (window.confirm(`ユーザーID: ${userId} のステータスを「${newStatus}」に変更しますか？`)) {
            updateUser(userId, { status: newStatus as 'active' | 'suspended' });
        }
    };

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'summary', label: 'サマリー', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'users', label: 'ユーザー一覧', icon: <Users className="w-4 h-4" /> },
        { id: 'invoices', label: '債権一覧', icon: <FileText className="w-4 h-4" /> },
        { id: 'deals', label: '取引一覧', icon: <Handshake className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 border-l-4 border-amber-500 pl-3">管理者ダッシュボード</h1>
                    <p className="text-slate-500 mt-1">プラットフォームの健全性と取引状況を監視・管理します。</p>
                </div>
                <div className="hidden sm:block bg-slate-100 px-4 py-2 rounded-lg text-sm text-slate-600 font-mono shadow-inner">
                    System Status: <span className="text-emerald-600 font-bold ml-1">OPERATIONAL</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold whitespace-nowrap rounded-t-lg transition-colors ${activeTab === tab.id
                            ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT: SUMMARY */}
            {activeTab === 'summary' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10"></div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent border-b-0">
                                <CardTitle className="text-sm font-medium text-slate-500">総取引額 (GMV)</CardTitle>
                                <DollarSign className="h-5 w-5 text-blue-600 opacity-80" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">¥{stats.totalVolume.toLocaleString()}</div>
                                <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center"><Activity size={12} className="mr-1" /> +12.5% から</p>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-16 h-16 bg-purple-50 rounded-bl-full -z-10"></div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent border-b-0">
                                <CardTitle className="text-sm font-medium text-slate-500">成立件数 / 登録者</CardTitle>
                                <Users className="h-5 w-5 text-purple-600 opacity-80" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.completedDeals}件 <span className="text-lg font-bold text-slate-400">/ {stats.activeUsers}人</span></div>
                                <p className="text-xs text-slate-500 font-medium mt-2">プラットフォーム定着率 48%</p>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-16 h-16 bg-amber-50 rounded-bl-full -z-10"></div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent border-b-0">
                                <CardTitle className="text-sm font-medium text-slate-500">平均割引率</CardTitle>
                                <Activity className="h-5 w-5 text-amber-600 opacity-80" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.averageDiscountRate}%</div>
                                <p className="text-xs text-slate-500 font-medium mt-2">市場適正範囲内</p>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm relative overflow-hidden bg-slate-800 text-white">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-slate-700/50 rounded-bl-full -z-10 blur-xl"></div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent border-b-0">
                                <CardTitle className="text-sm font-medium text-slate-300">累計手数料収益 (寄付)</CardTitle>
                                <DollarSign className="h-5 w-5 text-amber-400" />
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-3xl font-black text-white tracking-tight">¥{totalFees.toLocaleString()}</div>
                                <p className="text-xs text-emerald-400 font-bold mt-2">平均寄付率 1.0%</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: USERS */}
            {activeTab === 'users' && (
                <Card className="overflow-hidden border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                            全ユーザー管理
                        </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">ID / 登録日</th>
                                    <th className="px-4 py-3">氏名 / 会社名</th>
                                    <th className="px-4 py-3">役割</th>
                                    <th className="px-4 py-3">管理者</th>
                                    <th className="px-4 py-3">ステータス</th>
                                    <th className="px-4 py-3 text-right">アクション</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => (
                                    <tr key={u.id} className={`hover:bg-slate-50/50 ${u.status === 'suspended' ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-xs text-slate-500" title={u.id}>{u.id.slice(0, 8)}...</div>
                                            <div className="text-xs text-slate-400">{u.registeredAt || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-900">{u.name}</div>
                                            <div className="text-xs text-slate-500">{u.companyName}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${u.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                                                u.role === 'buyer' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-800'
                                                }`}>
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.isAdmin ? <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 rounded">ADMIN</span> : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.status === 'suspended' ? (
                                                <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs uppercase">
                                                    <AlertTriangle size={12} /> Suspended
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase">
                                                    <CheckCircle size={12} /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-600 focus:ring-0"
                                                    onClick={() => setSelectedUser(u)}
                                                >
                                                    詳細
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={`h-8 text-xs ${u.status === 'suspended' ? 'bg-white border-slate-300 text-slate-600' : 'text-red-600 border-red-200 hover:bg-red-50 hover:border-red-600'}`}
                                                    onClick={() => handleSuspendUser(u.id, u.status)}
                                                    disabled={u.isAdmin}
                                                >
                                                    {u.status === 'suspended' ? '解除 (Activate)' : '停止 (Suspend)'}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* TAB CONTENT: INVOICES */}
            {activeTab === 'invoices' && (
                <Card className="overflow-hidden border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4 text-blue-600" />
                            全債権（Invoice）マスター
                        </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">ID / 登録日</th>
                                    <th className="px-4 py-3">債務者 (匿名化状態)</th>
                                    <th className="px-4 py-3 text-right">額面金額 / 売却対象</th>
                                    <th className="px-4 py-3">支払期日</th>
                                    <th className="px-4 py-3">ステータス</th>
                                    <th className="px-4 py-3">売り手 (SellerID)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 flex-col md:table-row">
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-xs text-slate-500" title={inv.id}>{inv.id.slice(0, 8)}...</div>
                                            <div className="text-xs text-slate-400">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-800">{inv.debtorName || '未登録'}</div>
                                            <div className="text-xs mt-1">
                                                {!inv.isClientNamePublic ? (
                                                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">非公開（匿名）</span>
                                                ) : (
                                                    <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">公開</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-bold text-slate-900">¥{inv.amount.toLocaleString()}</div>
                                            <div className="text-xs text-blue-600 font-bold mt-0.5">
                                                {(inv.sellingAmount === undefined || inv.sellingAmount === inv.amount) ? '全部売却' : `一部 (¥${(inv.sellingAmount || 0).toLocaleString()})`}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{inv.dueDate}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'open' ? 'bg-green-100 text-green-700' :
                                                inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                    inv.status === 'negotiating' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-200 text-slate-600'
                                                }`}>
                                                {inv.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-500" title={inv.sellerId}>
                                            {inv.sellerId.slice(0, 8)}...
                                        </td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                            債権データがありません
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* TAB CONTENT: DEALS */}
            {activeTab === 'deals' && (
                <Card className="overflow-hidden border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Handshake className="h-4 w-4 text-emerald-600" />
                            全取引（Deal）マスター
                        </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">取引ID</th>
                                    <th className="px-4 py-3">Invoice / 売り手 / 買い手</th>
                                    <th className="px-4 py-3 text-right">取引金額</th>
                                    <th className="px-4 py-3">ステータス (Deal)</th>
                                    <th className="px-4 py-3">決済状況 (Payment)</th>
                                    <th className="px-4 py-3">開始日</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentDeals.map((deal) => {
                                    return (
                                        <tr key={deal.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500" title={deal.id}>{deal.id.slice(0, 8)}...</td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs font-mono mb-1"><span className="text-slate-400">INV:</span> {deal.invoiceId.slice(0, 8)}</div>
                                                <div className="text-xs text-slate-600"><span className="text-blue-500 font-bold">S:</span> {deal.sellerId.slice(0, 8)}</div>
                                                <div className="text-xs text-slate-600"><span className="text-indigo-500 font-bold">B:</span> {deal.buyerId.slice(0, 8)}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                ¥{(deal.currentAmount || 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${deal.status === 'concluded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    deal.status === 'agreed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        deal.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {deal.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {['concluded', 'agreed'].includes(deal.status) ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${!deal.paymentStatus || deal.paymentStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                        deal.paymentStatus === 'paid' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-emerald-100 text-emerald-800'
                                                        }`}>
                                                        {(!deal.paymentStatus || deal.paymentStatus === 'pending') ? 'PENDING' : deal.paymentStatus.toUpperCase()}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{deal.startedAt ? new Date(deal.startedAt).toLocaleDateString() : '-'}</td>
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
            )}

            {/* User Detail Modal */}
            {selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => setSelectedUser(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">ユーザー詳細情報</h3>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-y-3 gap-x-4 text-sm">
                                <div className="text-slate-500 font-medium pt-1">ユーザーID</div>
                                <div className="col-span-2 font-mono text-slate-800 bg-slate-50 p-1.5 rounded border border-slate-100 break-all">{selectedUser.id}</div>

                                <div className="text-slate-500 font-medium pt-1">登録日時</div>
                                <div className="col-span-2 text-slate-800 pt-1">
                                    {selectedUser.registeredAt ? new Date(selectedUser.registeredAt).toLocaleString('ja-JP') : '-'}
                                </div>

                                <div className="text-slate-500 font-medium pt-1">氏名</div>
                                <div className="col-span-2 font-bold text-slate-800 pt-1">{selectedUser.name || '-'}</div>

                                <div className="text-slate-500 font-medium pt-1">企業名</div>
                                <div className="col-span-2 text-slate-800 pt-1">{selectedUser.companyName || '-'}</div>

                                <div className="text-slate-500 font-medium pt-1">メールアドレス</div>
                                <div className="col-span-2 text-slate-800 pt-1 break-all">{selectedUser.email || '-'}</div>

                                <div className="text-slate-500 font-medium pt-1">役割</div>
                                <div className="col-span-2 pt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${selectedUser.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                                            selectedUser.role === 'buyer' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-800'
                                        }`}>
                                        {selectedUser.role.toUpperCase()}
                                    </span>
                                </div>

                                <div className="text-slate-500 font-medium pt-1">進行中の取引数</div>
                                <div className="col-span-2 text-slate-800 font-bold pt-1">
                                    <span className="text-lg text-emerald-600 mr-1">{getOngoingDealsCount(selectedUser.id)}</span>件
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedUser(null)}>閉じる</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
