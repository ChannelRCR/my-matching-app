import React from 'react';
import { Card, CardContent } from '../components/ui/Card';

export const TermsOfService: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="p-8 prose prose-slate max-w-none">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center border-b pb-4">
                        プラットフォーム利用約款および債権譲渡契約条項
                    </h1>

                    <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
                        <section>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">第1条（目的）</h2>
                            <p>
                                本約款は、当プラットフォームを通じて行われる債権譲渡契約の基本事項および条件を定めるものです。ダミーテキストダミーテキスト。後日、正式な文面に差し替えます。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">第2条（契約の成立）</h2>
                            <p>
                                売り手および買い手が、プラットフォームの提供するチャット画面において、提示金額および付随条件に最終的に合意し、「合意する」ボタンを押下した時点で、本約款の内容に従って債権譲渡契約が有効に成立するものとします。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">第3条（債権の譲渡と対抗要件）</h2>
                            <p>
                                売り手は、前条によって成立した契約に基づき、対象となる債権を買い手に対して譲渡します。ダミーテキストダミーテキスト。債権譲渡に関する通知等は、別途当事者間で合意した方法により適切に行うものとします。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">第4条（表明および保証）</h2>
                            <p>
                                売り手は、プラットフォームを通じて開示された債権が実在し、第三者の担保権等が設定されていない完全な権利であることを表明および保証します。ここに違反があった場合のリスク負担についても今後追記される予定です。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">第5条（免責条項）</h2>
                            <p>
                                プラットフォーム運営者は、売り手と買い手間のマッチング機会を提供するものであり、個別の債権譲渡契約に関する義務の不履行や紛争について、一切の責任を負わないものとします。
                            </p>
                        </section>

                        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 text-center">
                            制定日：2026年3月6日<br />
                            ※ 本規約は開発中のダミーデータです。
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
