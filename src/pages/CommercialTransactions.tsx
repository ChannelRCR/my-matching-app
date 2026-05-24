import React from 'react';
import { Card, CardContent } from '../components/ui/Card';

export const CommercialTransactions: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in duration-500">
            <Card className="bg-white shadow-lg border border-slate-200 overflow-hidden rounded-2xl">
                <div className="bg-slate-50 border-b border-slate-200 px-8 py-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight">
                        特定商取引法に基づく表記
                    </h1>
                </div>
                <CardContent className="p-8 sm:p-12">
                    <div className="space-y-6 text-slate-700 text-sm sm:text-base">
                        <table className="w-full border-collapse border border-slate-200 text-left">
                            <tbody>
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800 w-1/3">販売事業者名（商号）</th>
                                    <td className="py-4 px-4">株式会社日本RCR</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800">所在地</th>
                                    <td className="py-4 px-4">〒102-0073<br />東京都千代田区九段北一丁目１０－３ animo kudan ６０１号</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800">代表者名（運営責任者）</th>
                                    <td className="py-4 px-4">和田直樹</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800">連絡先メールアドレス</th>
                                    <td className="py-4 px-4">factormaching@gmail.com</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800">電話番号</th>
                                    <td className="py-4 px-4">電話番号については、上記メールアドレスよりご請求いただければ、遅滞なく開示いたします。</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800">販売価格・手数料</th>
                                    <td className="py-4 px-4">各サービスおよび取引ごとにプラットフォーム上で提示する金額とします。</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800">代金の支払時期および方法</th>
                                    <td className="py-4 px-4">クレジットカード決済（Stripe）等、当サービスが定める支払い方法によるものとします。支払時期は各カード会社の規定によります。</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800">サービスの提供時期</th>
                                    <td className="py-4 px-4">決済完了後、直ちにご利用いただけます。</td>
                                </tr>
                                <tr>
                                    <th className="py-4 px-4 bg-slate-50 font-semibold text-slate-800">キャンセル・返金について</th>
                                    <td className="py-4 px-4">サービスの性質上、決済完了後のキャンセルおよび返金はお受けしておりません。</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
