import React, { useMemo, useState } from 'react';
import { Users, Wallet, X, Building, Info, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useData } from '../contexts/DataContext';
import type { User } from '../types';

export const BuyerList: React.FC = () => {
    const { users } = useData();
    const [selectedBuyer, setSelectedBuyer] = useState<User | null>(null);

    // Filter for buyers and map to display format if needed, but User type now has these fields
    const buyers = useMemo(() => {
        return users.filter(u => u.role === 'buyer');
    }, [users]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">買い手情報（投資家一覧）</h1>
                    <p className="text-slate-500 mt-1">
                        現在登録されている投資家の一覧です。
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buyers.map((buyer) => (
                    <Card key={buyer.id} className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                                <Users size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">
                                {buyer.privacySettings?.companyName === false
                                    ? '匿名投資家'
                                    : (buyer.companyName || buyer.name || '未設定')}
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    アピールポイント
                                </h4>
                                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {buyer.appealPoint || '未設定'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Wallet size={12} /> 予算
                                    </h4>
                                    <p className="font-bold text-slate-900">{buyer.budget || '未公開'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                onClick={() => setSelectedBuyer(buyer)}
                            >
                                詳細を見る
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Buyer Detail Modal */}
            {selectedBuyer && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                    onClick={() => setSelectedBuyer(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-indigo-50">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                <Users size={18} className="text-indigo-600" />
                                投資家（買い手）情報
                            </h3>
                            <button
                                onClick={() => setSelectedBuyer(null)}
                                className="p-1 hover:bg-indigo-100 rounded-full text-indigo-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Header Info */}
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full shrink-0">
                                    <Building size={32} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">
                                        {selectedBuyer.privacySettings?.companyName === false
                                            ? '匿名投資家'
                                            : (selectedBuyer.companyName || selectedBuyer.name || '未設定')}
                                    </h2>
                                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                        <Wallet size={14} />
                                        <span>投資予算: </span>
                                        <span className="font-bold text-slate-700">{selectedBuyer.budget || '未公開'}</span>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Details */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <FileText size={14} />
                                        アピールポイント・希望条件
                                    </h4>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedBuyer.appealPoint || '特に設定されていません。'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">登録時期</div>
                                        <div className="text-sm font-medium text-slate-800">
                                            {selectedBuyer.registeredAt ? new Date(selectedBuyer.registeredAt).toLocaleDateString('ja-JP') : '不明'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">ステータス</div>
                                        <div className="text-sm font-medium text-emerald-600 bg-emerald-50 inline-flex px-2 py-0.5 rounded">
                                            本人確認済
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
                                    <Info size={16} className="shrink-0 mt-0.5" />
                                    <p>当プラットフォームでは、この投資家に関する追加の実績審査を行っております。より詳細な情報は、具体的な取引開始等を通じて開示されます。</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <Button variant="outline" onClick={() => setSelectedBuyer(null)} className="h-9">閉じる</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
