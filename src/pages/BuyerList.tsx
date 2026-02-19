import React, { useMemo } from 'react';
import { Users, Wallet } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useData } from '../contexts/DataContext';

export const BuyerList: React.FC = () => {
    const { users } = useData();

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
                            <h3 className="font-bold text-lg text-slate-900">{buyer.companyName || buyer.name}</h3>
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
                                    <p className="font-bold text-slate-900">{buyer.budget || '未設定'}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
