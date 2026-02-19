import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle, FileText, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RegisterInvoiceModal } from '../components/RegisterInvoiceModal';

export const SellerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { invoices } = useData();
    const { user } = useAuth();
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    // Filter for current seller (strict check)
    // If user is null (loading), we might show empty or loading, but ProtectedRoute handles that.
    // Fallback to empty array if user not found to be safe.
    const myInvoices = user ? invoices.filter(inv => inv.sellerId === user.id) : [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    売掛金（請求書）管理
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

            {/* Invoice List */}
            <div className="grid gap-4">
                {myInvoices.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">登録された案件はありません。</p>
                ) : (
                    myInvoices.map((inv) => (
                        <Card
                            key={inv.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(`/seller/invoices/${inv.id}`)}
                        >
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">{inv.industry}</span>
                                            {inv.companySize && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">{inv.companySize}</span>}
                                            <span className="text-sm text-slate-500">期日: {inv.dueDate}</span>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900">
                                            ¥{inv.amount.toLocaleString()}
                                            <span className="text-sm font-normal text-slate-500 ml-2">
                                                (希望: ¥{inv.requestedAmount?.toLocaleString()})
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{inv.companyCredit}</p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500">ステータス</div>
                                            <div className={`font-bold ${inv.status === 'open' ? 'text-green-600' :
                                                inv.status === 'negotiating' ? 'text-orange-500' : 'text-slate-500'
                                                }`}>
                                                {inv.status === 'open' ? '募集中' :
                                                    inv.status === 'negotiating' ? '交渉中' : '売却済'}
                                            </div>
                                        </div>
                                        {inv.status === 'open' && (
                                            <div className="bg-green-100 p-2 rounded-full text-green-600">
                                                <CheckCircle2 size={20} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
