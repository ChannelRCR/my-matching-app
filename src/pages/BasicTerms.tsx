import React from 'react';
import { Card, CardContent } from '../components/ui/Card';

export const BasicTerms: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in duration-500">
            <Card className="bg-white shadow-lg border border-slate-200 overflow-hidden rounded-2xl">
                <div className="bg-slate-50 border-b border-slate-200 px-8 py-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight">
                        債権譲渡基本約款
                    </h1>
                </div>
                <CardContent className="p-8 sm:p-12">
                    <div className="space-y-10 text-slate-700 text-sm sm:text-base leading-relaxed">
                        
                        <div className="bg-slate-100 p-6 rounded-lg text-slate-600 mb-8">
                            <h2 className="font-bold text-slate-800 mb-2">前文</h2>
                            <p>この債権譲渡基本約款の定めは、現状の債権譲渡契約の一般的な取り決めや慣習に従って定めています。このため、当事者間で合意する場合は、既存の法令に反しない限り、本約款と異なる内容とすることも構いません。</p>
                            <p className="mt-2">なお、本サイトでは、債権譲渡契約および回収委託契約までの締結を予定しており、債権譲渡担保の設定については、被保全債権の範囲を履行利益まで（譲渡代金にとどまらず、譲渡対象債権額も含む）と規定するにとどまり、具体的な債権譲渡担保設定までは予定しておりません。</p>
                            <p className="mt-2">このため、担保設定については、別途売主と買主との間で協議が必要となります。</p>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-primary pb-2">第1章 基本契約の内容</h2>
                            
                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">1. 目的</h3>
                                <p className="pl-4">売主（譲渡人）が保有する債権を買主（譲受人）が買い取り、売主は債権の資金化を目的とし、買主は債権の売買差益を得ることを目的とします。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">2. 法的性質の確認</h3>
                                <p className="pl-4">売主と買主は、本件取引が債権の売買契約であり、金銭消費貸借およびこれに付随する担保設定契約ではないことを確認します。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">3. ノンリコース</h3>
                                <p className="pl-4">売買対象債権の債務者の無資力、その他専ら債務者のみの帰責事由を理由とする不払いについて、売主（譲渡人）は買主（譲受人）に保証や瑕疵担保責任を負いません。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">4. 対象債権の移転時期</h3>
                                <p className="pl-4">買主（譲受人）が、売主（譲渡人）へ譲渡代金を完済した時点で、対象となる債権の所有権（管理権、処分権）が移転します。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">5. 譲渡代金支払方法</h3>
                                <p className="pl-4">売主（譲渡人）名義の口座に振り込む方法により、支払を行います。なお、振込手数料は振込者の負担とします。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">6. 個別債権譲渡契約との関係</h3>
                                <p className="pl-4">本サイトを利用し、売主が特定の債権の買取りを申し込み、買主が承諾した各個別債権譲渡契約（第２章で規定するもの）に対して、本基本約款の内容が適用されます。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">7. 表明保証</h3>
                                <p className="pl-4">売主（譲渡人）は、対象債権が有効に存在し（反対債権等の抗弁権が存在しないことも含む）、二重譲渡を行っておらず、自らが正当な処分権限を有することを保証します。<br/>
                                なお、第2章で定める個別債権譲渡契約成立時において、対象債権の取引先による弁済に関して抗弁権（相殺権、同時履行の抗弁権等の一切を含む）が付着している場合、自ら定める回収日（取引先による支払予定日）までに、当該抗弁権を消除する義務を負うものとします。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">8. 対抗要件</h3>
                                <p className="pl-4">買主（譲受人）は、債権譲渡登記の設定、確定日付のある債権譲渡通知の債務者への発送、又は債務者の承諾のいずれかの方法を選択して対抗要件を具備するよう売主に請求できます。<br/>
                                ただし、後述の回収委託契約（第３章）に関する条項について、売主（譲渡人）がその義務を履行する限りにおいて、買主は、対抗要件の具備の請求を留保します。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">9. 解除</h3>
                                <p className="pl-4">売主が表明保証に違反した場合や、支払停止、倒産手続開始等の事由が生じた場合、買主は直ちに、売主との間の契約を解除できます。</p>
                            </section>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-primary pb-2 mt-8">第2章 個別債権譲渡契約</h2>
                            
                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">1. 個別債権譲渡契約</h3>
                                <p className="pl-4">本サイトを利用して、売主（譲渡人）と買主（譲受人）との間で締結される、具体的な債権の売買についての契約です。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">2. 個別債権譲渡契約の内容</h3>
                                <p className="pl-4 mb-2">以下の内容を定めます。</p>
                                <ul className="list-none pl-4 space-y-2">
                                    <li>(1) 当事者の特定<br/>氏名、住所、連絡先電話番号、連絡先メールなどにより、当事者の特定事項を定めます。</li>
                                    <li>(2) 対象債権の特定<br/>債務者の名称、住所、債権額（額面額）、債権の種類、一部譲渡か全部譲渡かの別、譲渡対象の範囲（一部譲渡の場合）、譲渡代金、支払期日（回収期日）により、売買対象債権を特定し、対価を定めます。</li>
                                </ul>
                            </section>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-primary pb-2 mt-8">第3章 回収委託契約</h2>
                            
                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">1. 内容</h3>
                                <p className="pl-4">本サイトを利用して、売主（譲渡人）と買主（譲受人）との間で締結された債権譲渡は、売主（譲渡人）と対象債権の債務者との間の取引関係の円満維持を目的として、以下で定めるとおり、対象債権の債務者への通知や承諾等の対抗要件の具備を留保するものとし、譲渡した債権の回収手続を、売主（譲渡人）に委託する内容とします。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">2. 委託の内容</h3>
                                <p className="pl-4">買主（譲受人）は売主（譲渡人）に対し、個別契約書で定めた譲渡済みの債権について、債務者からの集金・回収業務を無償で委託します。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">3. 譲渡人の義務</h3>
                                <p className="pl-4">売主（譲渡人）は、買主（譲受人）の指示に従い、善良なる管理者の注意をもって回収業務を行います。回収した金員は買主（譲受人）の財産であることを自覚し、売主（譲渡人）は自己の資金と区別して管理し、費消してはなりません。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">4. 委託の失効と通知の発送</h3>
                                <p className="pl-4">売主（譲渡人）に本基本約款や個別契約違反等の事由が生じた場合、本回収委託契約は、当然に失効するものとします。この場合、買主は直ちに債務者に対し債権譲渡通知等の対抗要件を具備した上で、直接取立てを行うことができるものとします。</p>
                            </section>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-primary pb-2 mt-8">第4章 仲裁契約</h2>
                            
                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">1. 仲裁契約の対象</h3>
                                <p className="pl-4">売主（譲渡人）の責めに帰する第1章の７表明保証違反、もしくは、第3章の回収委託契約の義務不履行による、買主（譲受人）との間の紛争に関しては、売主および買主は、当サイトの仲裁チャットを利用して、和解契約を締結することができます。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">2. 和解契約の内容</h3>
                                <p className="pl-4">和解契約は、債務不履行責任に基づく損害賠償額、支払方法等を定めます。但し、損害賠償の額の上限は、譲渡人が提示した債権の売買対象額（履行利益）とします。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">3. 当事者間での協議</h3>
                                <p className="pl-4">和解契約とは別に、売主・買主間で協議・合意することも可能とします。</p>
                            </section>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-primary pb-2 mt-8">第5章 債権譲渡担保契約</h2>
                            
                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">1. 目的</h3>
                                <p className="pl-4">売主（譲渡人）の責めに帰する第1章の７表明保証違反、もしくは、第3章の回収委託契約の義務不履行による損害賠償請求権について保全するため、買主（譲受人）は、別途売主と協議し、売主が将来取得する債権を担保に取ることができます。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">2. 損害賠償の範囲</h3>
                                <p className="pl-4">前項の表明保証義務違反による損害賠償の範囲は、買主の実損害（譲渡代金）のみならず、履行利益（契約が成立した場合に得られるべき利益）についても当然に及ぶものとします。</p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-slate-800">3. 当事者間での協議</h3>
                                <p className="pl-4">債権譲渡担保契約については、本サイトでの契約とは別に、別途売主・買主間で協議・合意するものとします。</p>
                            </section>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
