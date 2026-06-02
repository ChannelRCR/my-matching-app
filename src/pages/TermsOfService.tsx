import React from 'react';
import { Card, CardContent } from '../components/ui/Card';

export const TermsOfService: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in duration-500">
            <Card className="bg-white shadow-lg border border-slate-200 overflow-hidden rounded-2xl">
                <div className="bg-slate-50 border-b border-slate-200 px-8 py-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight">
                        FactorMatch 利用規約
                    </h1>
                </div>
                <CardContent className="p-8 sm:p-12">
                    <div className="space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
                        
                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第1条（適用）</h2>
                            <div className="space-y-2 pl-4">
                                <p>本規約は、株式会社日本RCR（以下「当社」といいます）が運営する債権譲渡マッチングプラットフォーム「FactorMatch」（以下「本サービス」といいます）の利用に関する条件を、本サービスを利用するすべてのお客様（以下「ユーザー」といいます）と当社との間で定めるものです。</p>
                                <p>ユーザーは、本規約に同意した上で本サービスを利用するものとします。</p>
                            </div>
                        </section>
                        
                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第2条（本サービスの役割と免責）</h2>
                            <div className="space-y-2 pl-4">
                                <p>1. 本サービスは、債権の売却を希望するユーザー（以下「売主」といいます）と、買受を希望するユーザー（以下「買主」といいます）に情報交換およびマッチングの「場」を提供するものです。</p>
                                <p>2. 当社は、売主と買主の間で締結される債権譲渡契約の当事者にはならず、契約の成立、債権の有効性、回収の確実性について、いかなる保証も行いません。</p>
                                <p>3. ユーザー間で発生した取引に関するトラブル、債務不履行、損害について、当社は、別途定める債権譲渡基本約款「第4章　仲裁契約」で規定する、当事者間での解決の場を提供するに留まり、その他、本契約一切の責任を負わないものとします。</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第3条（ユーザー登録と審査）</h2>
                            <div className="space-y-2 pl-4">
                                <p>1. 本サービスの利用を希望する者は、当社所定の方法によりユーザー登録を行うものとします。</p>
                                <p>2. 当社は、独自の基準に基づき登録審査を行い、登録を拒否（登録後の事後的判断する場合も含む）することがあります。また、その理由について開示する義務を負いません。</p>
                                <p>3. ユーザーは、登録情報に変更が生じた場合、速やかに情報の更新を行うものとします。</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第4条（任意の相対取引）</h2>
                            <div className="space-y-2 pl-4">
                                <p>1. ユーザーは、本サービスを通じて知り得た他のユーザーに対し、本サービスを介さずに直接取引（債権譲渡契約の締結等）の勧誘を行うことも可能とします。但し、相対取引を前提とした不当な条件提示や要求等を行うことは禁止します。</p>
                                <p>2. ユーザーは、本サービスと同様の仲介サービスを、別途作成することも可能とします。但し、営利目的で同様の仲介サービスの提供は禁止します。</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第5条（投げ銭・支援機能）</h2>
                            <div className="space-y-2 pl-4">
                                <p>1. ユーザーは、本サービス内に設けられた機能（投げ銭等）を利用し、運営会社に対して任意の金額を支援することができます。</p>
                                <p>2. 支援の決済は、当社が指定する外部決済代行業者（Stripe等）を通じて行われます。</p>
                                <p>3. ユーザーは、一度決済が完了した支援金について、理由の如何を問わずキャンセルおよび返金請求を行うことはできません。</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第6条（禁止事項）</h2>
                            <div className="space-y-2 pl-4">
                                <p>ユーザーは、以下の行為を行ってはなりません。</p>
                                <ul className="list-none pl-0 space-y-2 text-slate-700 mt-2">
                                    <li>(1) 法令、裁判所の判決、または公序良俗に違反する行為</li>
                                    <li>(2) 虚偽の情報を登録、架空の取引を行う行為</li>
                                    <li>(3) 当社、他のユーザー、または第三者の有形無形の財産権、名誉、プライバシーを侵害する行為</li>
                                    <li>(4) 本サービスのシステムやネットワークに過度な負荷をかける行為</li>
                                    <li>(5) その他、前各号に準ずる一切の行為</li>
                                </ul>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第7条（利用停止・登録抹消）</h2>
                            <div className="space-y-2 pl-4">
                                <p>当社は、ユーザーが本規約のいずれかに違反した場合、事前の通知なく、本サービスの利用停止またはユーザー登録の抹消を行うことができます。</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第8条（消費者契約法等に関する特例）</h2>
                            <div className="space-y-2 pl-4">
                                <p>1. 本規約の運営会社との間のいかなる免責条項も、ユーザーが消費者契約法第2条第1項に定める「消費者」に該当する場合には適用されないものとします。</p>
                                <p>2. 前項の場合であっても、当社の過失（重過失を除きます）によりユーザーに生じた損害に対する当社の賠償責任は、当該ユーザーが過去３ヶ月間に当社に支払った支援金の総額（支援実績がない場合は金1万円）を上限とします。</p>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3 bg-slate-50 py-1">第9条（準拠法および管轄裁判所）</h2>
                            <div className="space-y-2 pl-4">
                                <p>1. 本規約の解釈にあたっては、日本法を準拠法とします。</p>
                                <p>2. 本サービスに関して運営会社とユーザーとの間で紛争が生じた場合には、東京地方裁判所を専属的合意管轄とします。</p>
                            </div>
                        </section>

                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
