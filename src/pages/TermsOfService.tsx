import React from 'react';
import { Card, CardContent } from '../components/ui/Card';

export const TermsOfService: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in duration-500">
            <Card className="bg-white shadow-lg border border-slate-200 overflow-hidden rounded-2xl">
                <div className="bg-slate-50 border-b border-slate-200 px-8 py-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight">
                        FactorMatch 利用規約（素案）
                    </h1>
                </div>
                <CardContent className="p-8 sm:p-12">
                    <div className="space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
                        
                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第1条（適用）</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    本規約は、当社が運営する債権譲渡マッチングプラットフォーム「FactorMatch」（以下「本サービス」といいます）の利用に関する条件を、本サービスを利用するすべてのお客様（以下「ユーザー」といいます）と当社との間で定めるものです。
                                </p>
                                <p>
                                    ユーザーは、本規約に同意した上で本サービスを利用するものとします。
                                </p>
                            </div>
                        </section>
                        
                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第2条（本サービスの役割と免責）</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    本サービスは、債権の売却を希望するユーザー（以下「売主」といいます）と、買受を希望するユーザー（以下「買主」といいます）に情報交換およびマッチングの「場」を提供するものです。
                                </p>
                                <p>
                                    当社は、売主と買主の間で締結される債権譲渡契約の当事者にはならず、契約の成立、債権の有効性、回収の確実性について、いかなる保証も行いません。
                                </p>
                                <p>
                                    ユーザー間で発生した取引に関するトラブル、債務不履行、損害について、当社は一切の責任を負わないものとします。
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第3条（ユーザー登録と審査）</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    本サービスの利用を希望する者は、当社所定の方法によりユーザー登録を行うものとします。
                                </p>
                                <p>
                                    当社は、独自の基準に基づき登録審査を行い、登録を拒否することがあります。また、その理由について開示する義務を負いません。
                                </p>
                                <p>
                                    ユーザーは、登録情報に変更が生じた場合、速やかに情報の更新を行うものとします。
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第4条（直接取引の禁止）</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    ユーザーは、本サービスを通じて知り得た他のユーザーに対し、本サービスを介さずに直接取引（債権譲渡契約の締結等）の勧誘を行ってはならず、また勧誘に応じてはならないものとします。
                                </p>
                                <p>
                                    前項の規定に違反した場合、ユーザーは当社に対し、違約金として金２０万円（または逸失利益相当額のいずれか高い金額）を支払うものとします。
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第5条（投げ銭・支援機能）</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    ユーザーは、本サービス内に設けられた機能（投げ銭等）を利用し、他のユーザーまたは運営チームに対して任意の金額を支援することができます。
                                </p>
                                <p>
                                    支援の決済は、当社が指定する外部決済代行業者（Stripe等）を通じて行われます。
                                </p>
                                <p>
                                    ユーザーは、一度決済が完了した支援金について、理由の如何を問わずキャンセルおよび返金請求を行うことはできません。
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第6条（禁止事項）</h2>
                            <div className="space-y-2 pl-4">
                                <p>ユーザーは、以下の行為を行ってはなりません。</p>
                                <ul className="list-disc pl-6 space-y-2 text-slate-700 mt-2 marker:text-primary">
                                    <li>法令、裁判所の判決、または公序良俗に違反する行為</li>
                                    <li>虚偽の債権情報を登録、または架空の取引を行う行為</li>
                                    <li>当社、他のユーザー、または第三者の知的財産権、名誉、プライバシーを侵害する行為</li>
                                    <li>本サービスのシステムやネットワークに過度な負荷をかける行為</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第7条（利用停止・登録抹消）</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    当社は、ユーザーが本規約のいずれかに違反した場合、事前の通知なく、本サービスの利用停止またはユーザー登録の抹消を行うことができます。
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第8条（消費者契約法等に関する特例）</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    本規約のいかなる免責条項も、ユーザーが消費者契約法第2条第1項に定める「消費者」に該当する場合には適用されないものとします。
                                </p>
                                <p>
                                    前項の場合であっても、当社が負うべきユーザーに生じた損害に対する当社の賠償責任は、当該ユーザーが過去６ヶ月間に当社に支払った手数料の総額（または金１０万円）を上限とします。
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第9条（準拠法および管轄裁判所）</h2>
                            <div className="space-y-2 pl-4">
                                <p>
                                    本規約の解釈にあたっては、日本法を準拠法とします。
                                </p>
                                <p>
                                    本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する地方裁判所を専属的合意管轄とします。
                                </p>
                            </div>
                        </section>

                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
