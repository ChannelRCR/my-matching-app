import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Handshake, FileTextIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setTransitioning } from '../utils/transitionState';
import { useMarket } from '../contexts/MarketContext';
import { useAuth } from '../contexts/AuthContext';
import { DealStepper } from './DealStepper';
import type { Deal, Invoice, User as UserType } from '../types';

interface NormalDealBoardProps {
    deal: Deal;
    invoice: Invoice;
    user: any;
    isBuyer: boolean;
    effectivelyMatched: boolean;
    isDealExpired: boolean;
    activeDealsForInvoice: Deal[];
    users: UserType[];
    addMessage: (msg: any) => Promise<void>;
    updateDeal: (dealId: string, updates: any) => Promise<void>;
    proposedPrice: string;
    setProposedPrice: React.Dispatch<React.SetStateAction<string>>;
    isPriceUnlocked: boolean;
    setIsPriceUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
    hasViewedTerms: boolean;
    handleTermsClick: () => Promise<void>;
}

export const NormalDealBoard: React.FC<NormalDealBoardProps> = ({
    deal,
    invoice,
    user,
    isBuyer,
    effectivelyMatched,
    isDealExpired,
    activeDealsForInvoice,
    users,
    addMessage,
    updateDeal,
    proposedPrice,
    setProposedPrice,
    setIsPriceUnlocked,
    hasViewedTerms,
    handleTermsClick
}) => {
    const { completeDeal } = useMarket();
    const { profile: loggedInProfile } = useAuth();
    
    const [isTermsAgreed, setIsTermsAgreed] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const opponentProfile = isBuyer ? users.find(u => u.id === deal?.sellerId) : users.find(u => u.id === deal?.buyerId);
    const hasMultipleBuyers = activeDealsForInvoice.length > 1;

    const handleProposePrice = async () => {
        if (!deal || !user || !proposedPrice || !invoice) return;
        const numPrice = Number(proposedPrice);
        if (isNaN(numPrice) || numPrice <= 0) {
            alert("有効な金額を入力してください");
            return;
        }

        const maxAllowed = invoice.requestedAmount || invoice.amount;
        if (isBuyer && maxAllowed && numPrice > maxAllowed) {
            alert(`譲渡対象額を超えるオファーはできません`);
            return;
        }

        if (!window.confirm(`金額 ${numPrice.toLocaleString()}円 で提示しますか？`)) return;

        if (isBuyer) {
            await updateDeal(deal.id, { currentBuyerPrice: numPrice });
        } else {
            await updateDeal(deal.id, { currentSellerPrice: numPrice });
        }
        setProposedPrice('');
        setIsPriceUnlocked(false);

        const now = new Date();
        const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
        const proposerRole = isBuyer ? '買主' : '売主';
        await addMessage({
            id: `sys_${Date.now()}`,
            dealId: deal.id,
            senderId: user.id,
            receiverId: receiverId,
            content: `【システム通知】\n${proposerRole}の新しい提示金額: ¥${numPrice.toLocaleString()}`,
            timestamp: now.toISOString(),
            isSystemMessage: true
        });
    };

    const handleAgree = async () => {
        if (!deal || !invoice || !user) return;

        // 【修正】プロフィール入力チェック（公開・非公開の設定に関わらず、データベース上の文字列データが入力されていれば通す）
        if (!loggedInProfile?.companyName || !loggedInProfile?.representativeName || !loggedInProfile?.address || !loggedInProfile?.bankAccountInfo) {
            alert('契約手続に進む前に、プロフィール設定画面から「会社名」「代表者名」「所在地」「口座情報」をすべて登録してください。');
            return;
        }

        const { data: latestDeal, error: fetchError } = await supabase
            .from('deals')
            .select('buyer_agreed_at, seller_agreed_at, current_buyer_price, current_seller_price, current_amount')
            .eq('id', deal.id)
            .single();

        if (fetchError || !latestDeal) {
            console.error('Failed to fetch latest deal state:', fetchError);
            alert('最新の取引状態の取得に失敗しました。ネットワークを確認し、再度お試しください。');
            return;
        }

        const willBeConcluded = (isBuyer && latestDeal.seller_agreed_at) || (!isBuyer && latestDeal.buyer_agreed_at);

        const confirmMsg = willBeConcluded
            ? '相手も合意済みのため、この操作で契約が成立します。よろしいですか？'
            : '契約内容に合意しますか？相手の合意をもって契約成立となります。';

        if (window.confirm(confirmMsg)) {
            const roleName = isBuyer ? '買い手' : '売り手';
            const now = new Date().toISOString();
            
            // --- ULTIMATE ESCAPE: 1. Block Realtime ---
            setTransitioning(true);

            const loadingText = '契約処理中...';

            // --- ULTIMATE ESCAPE: 2. Pure DOM Overlay ---
            const overlay = document.createElement('div');
            overlay.id = 'ultimate-escape-overlay';
            overlay.innerHTML = `
                <div style="position: fixed; inset: 0; z-index: 99999; background: rgba(255,255,255,0.85); backdrop-filter: blur(4px); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; border: 4px solid #3b82f6; border-top-color: transparent; animation: ultimate-spin 1s linear infinite; margin-bottom: 16px;"></div>
                    <h2 style="font-size: 1.25rem; font-weight: bold; color: #1e293b; font-family: sans-serif;">${loadingText}</h2>
                    <p style="font-size: 0.875rem; color: #64748b; margin-top: 8px; font-family: sans-serif;">このまま画面を閉じずにお待ちください。</p>
                    <style>@keyframes ultimate-spin { 100% { transform: rotate(360deg); } }</style>
                </div>
            `;
            document.body.appendChild(overlay);

            try {
                await addMessage({
                    id: `sys_agree_${Date.now()}`,
                    dealId: deal.id,
                    senderId: user.id,
                    receiverId: isBuyer ? deal.sellerId : deal.buyerId,
                    content: `【システム通知】\n${roleName}が契約締結の意思表示を行いました。`,
                    timestamp: now,
                    isSystemMessage: true
                });
                
                const dbUpdates: any = {};
                if (isBuyer) {
                    dbUpdates.buyer_agreed_at = now;
                } else {
                    dbUpdates.seller_agreed_at = now;
                }
                
                if (willBeConcluded) {
                    const finalAmount = latestDeal.current_buyer_price || latestDeal.current_seller_price || latestDeal.current_amount || deal.currentBuyerPrice || deal.currentSellerPrice || deal.currentAmount || 0;
                    dbUpdates.status = 'concluded';
                    dbUpdates.contract_date = now;
                    dbUpdates.current_amount = finalAmount;
                }
                
                const { error: updateError } = await supabase.from('deals').update(dbUpdates).eq('id', deal.id);
                if (updateError) throw updateError;
                
                if (willBeConcluded) {
                    const systemMsg = {
                        deal_id: deal.id,
                        sender_id: user.id,
                        receiver_id: isBuyer ? deal.sellerId : deal.buyerId,
                        content: "【システム】双方が合意し、契約が成立しました🎉",
                        is_system_message: true,
                        timestamp: new Date().toISOString()
                    };
                    const { error: msgInsertError } = await supabase.from('messages').insert([systemMsg]);
                    if (msgInsertError) throw msgInsertError;
                    
                    const { error: invoiceUpdateError } = await supabase.from('invoices').update({ status: 'sold' }).eq('id', deal.invoiceId);
                    if (invoiceUpdateError) throw invoiceUpdateError;
                    
                    completeDeal(invoice.amount, deal.currentAmount);
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // --- ULTIMATE ESCAPE: 3. Browser-level hard navigation ---
                window.location.href = window.location.pathname + window.location.search;

            } catch (error: any) {
                console.error('Supabase Error Details:', error);
                alert('合意処理に失敗しました: ' + (error.message || '不明なエラー'));
                
                const overlayElement = document.getElementById('ultimate-escape-overlay');
                if (overlayElement) overlayElement.remove();
                setTransitioning(false);
            }
        }
    };

    const handlePrintContract = async () => {
        if (!deal || !invoice) return;
        const buyer = users.find(u => u.id === deal.buyerId);
        const seller = users.find(u => u.id === deal.sellerId);
        if (!buyer || !seller) {
            alert("ユーザー情報が見つかりません。");
            return;
        }

        setIsGeneratingPdf(true);
        try {
            const { generateContractPDF } = await import('../utils/pdfGenerator');
            await generateContractPDF(deal, invoice, seller, buyer);
        } catch (e) {
            console.error("PDF Error:", e);
            alert(`PDF生成に失敗しました。\n詳細: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Payment step handlers
    const handleBuyerPaymentReport = async () => {
        if (!deal || !user) return;
        if (window.confirm("本当に振込を完了しましたか？売主に報告が行われます。")) {
            await updateDeal(deal.id, { paymentStatus: 'buyer_paid' });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.sellerId,
                content: "【システム通知】買い手が譲渡代金の振込完了を報告しました。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    const handleSellerPaymentConfirm = async () => {
        if (!deal || !user) return;
        if (window.confirm("着金を確認し、取引を継続しますか？この操作で買い手に実績が付与され、第三債務者からの回収フェーズに移行します。")) {
            await updateDeal(deal.id, { paymentStatus: 'seller_received' });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.buyerId,
                content: "【システム通知】売り手が譲渡代金の着金を確認しました。期日後の「回収・送金報告」をお待ちください。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    const handleSellerRepaymentReport = async () => {
        if (!deal || !user) return;
        if (window.confirm("第三債務者からの回収および買い手への送金を完了しましたか？買い手に報告が行われます。")) {
            await updateDeal(deal.id, { paymentStatus: 'seller_repaid' });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.buyerId,
                content: "【システム通知】売り手が回収および買い手への送金完了を報告しました。着金をご確認ください。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    const handleBuyerRepaymentConfirm = async () => {
        if (!deal || !user) return;
        if (window.confirm("着金を確認し、全取引を完了しますか？この操作は取り消せず、売り手に実績が付与されます。")) {
            await updateDeal(deal.id, { paymentStatus: 'fully_settled' });
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: deal.sellerId,
                content: "【システム通知】買い手が着金を確認しました。これにて本取引は全て完了となります。",
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }
    };

    return (
        <div className={`flex flex-col gap-3 ${(isDealExpired || invoice.status === 'withdrawn') ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            {/* Trading Board Price Grid */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        相手方の提示額
                    </div>
                    <div className="text-lg font-bold text-slate-700">
                        {isBuyer ?
                            (deal.currentSellerPrice && deal.currentSellerPrice !== invoice.requestedAmount && deal.currentSellerPrice !== invoice.amount ? `¥${deal.currentSellerPrice.toLocaleString()}` : (invoice.sellingAmount ? `¥${invoice.sellingAmount.toLocaleString()}` : '未提示')) :
                            (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示')}
                    </div>
                </div>
                <div className={`p-3 rounded-lg border shadow-sm flex flex-col justify-between ${effectivelyMatched ? 'bg-emerald-50 border-emerald-300' : 'bg-blue-50 border-blue-200'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${effectivelyMatched ? 'text-emerald-600' : 'text-blue-600'}`}>
                        当方の提示額
                    </div>
                    <div className={`text-2xl font-black tracking-tight ${effectivelyMatched ? 'text-emerald-800' : 'text-blue-900'} leading-none`}>
                        {isBuyer ?
                            (deal.currentBuyerPrice ? `¥${deal.currentBuyerPrice.toLocaleString()}` : '未提示') :
                            (deal.currentSellerPrice && deal.currentSellerPrice !== invoice.requestedAmount && deal.currentSellerPrice !== invoice.amount ? `¥${deal.currentSellerPrice.toLocaleString()}` : (invoice.sellingAmount ? `¥${invoice.sellingAmount.toLocaleString()}` : '未提示'))}
                    </div>
                </div>
            </div>

            {/* Form */}
            {['open', 'pending', 'negotiating'].includes(deal.status) && (invoice.status as string) !== 'withdrawn' && !isDealExpired && !effectivelyMatched && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                    <div className="text-[11px] font-bold text-slate-600 tracking-wide">入札・金額提示</div>
                    <form onSubmit={(e) => { e.preventDefault(); handleProposePrice(); }} className="flex gap-2">
                        <Input
                            type="number"
                            value={proposedPrice}
                            onChange={(e) => setProposedPrice(e.target.value)}
                            placeholder="金額を入力"
                            className="flex-1 h-9 font-mono text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-300"
                            min="1"
                            disabled={isDealExpired || (invoice.status as string) === 'withdrawn'}
                        />
                        <Button type="submit" size="sm" className="h-9 bg-slate-800 hover:bg-slate-700 text-white shadow font-bold tracking-wide shrink-0 transition-colors px-4" disabled={!proposedPrice || isDealExpired || (invoice.status as string) === 'withdrawn'}>
                            提示する
                        </Button>
                    </form>
                </div>
            )}

            {/* Agreement Logic */}
            {invoice.status === 'withdrawn' ? (
                <div className="mt-2 border-t border-slate-200 pt-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold border border-slate-300 shadow-sm">
                        案件取り下げ済み
                    </span>
                </div>
            ) : isDealExpired ? (
                <div className="mt-2 border-t border-slate-200 pt-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold border border-slate-300 shadow-sm">
                        入金期日が徒過したため、この取引の交渉は終了しました。
                    </span>
                </div>
            ) : ['open', 'pending', 'negotiating'].includes(deal.status) ? (
                <div className={`pt-2 ${(isDealExpired || (invoice.status as string) === 'withdrawn') ? 'opacity-50 pointer-events-none' : ''}`}>
                    {effectivelyMatched ? (
                        <>
                            <div className="bg-green-100 text-green-800 p-3 rounded-md mb-4 font-bold text-center border border-green-200 shadow-sm">
                                🎉 金額が合致しました！
                            </div>

                            {!isBuyer && hasMultipleBuyers && !deal.sellerAgreedAt && (
                                <div className="mb-4 text-center">
                                    <p className="text-xs text-slate-500 mb-2">最高額オファーの買主が複数います。金額を再提示できます。</p>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={async () => {
                                            setIsPriceUnlocked(true);
                                            if (deal && user) {
                                                const competingDeals = activeDealsForInvoice.filter(d => 
                                                    (d.currentBuyerPrice || 0) > 0 && d.currentBuyerPrice === deal.currentBuyerPrice
                                                );
                                                
                                                for (const cDeal of competingDeals) {
                                                    await addMessage({
                                                        id: `sys_unlock_${Date.now()}_${cDeal.id}`,
                                                        dealId: cDeal.id,
                                                        senderId: user.id,
                                                        receiverId: cDeal.buyerId,
                                                        content: "【システム通知】複数名の買い手が同額で競合しました。売り手が提示額を再検討し、順次再提示します。",
                                                        timestamp: new Date().toISOString(),
                                                        isSystemMessage: true
                                                    });
                                                    
                                                    await updateDeal(cDeal.id, { currentSellerPrice: null as any });
                                                }
                                                if (invoice?.sellingAmount) {
                                                    setProposedPrice(String(invoice.sellingAmount));
                                                }
                                            }
                                        }}
                                        className="text-slate-600 border-slate-300 hover:bg-slate-50"
                                    >
                                        相手の買主に対して、金額を再提示する。
                                    </Button>
                                </div>
                            )}

                            {((isBuyer && deal.buyerAgreedAt) || (!isBuyer && deal.sellerAgreedAt)) ? (
                                <Button size="sm" variant="secondary" disabled className="bg-slate-200 text-slate-500 w-full cursor-not-allowed">
                                    相手の最終合意を待っています
                                </Button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {!hasViewedTerms ? (
                                        <div className="bg-blue-50 p-4 rounded text-center border border-blue-100">
                                            <p className="text-sm tracking-tight text-blue-800 mb-2 font-bold">
                                                「約款および債権譲渡契約条項」を確認願います
                                            </p>
                                            <Link
                                                to="/terms"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={handleTermsClick}
                                                className="text-blue-600 hover:text-blue-800 underline font-bold"
                                            >
                                                約款および債権譲渡契約条項を読む
                                            </Link>
                                        </div>
                                    ) : (
                                        <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 bg-white shadow-sm">
                                            <input
                                                type="checkbox"
                                                checked={isTermsAgreed}
                                                onChange={(e) => setIsTermsAgreed(e.target.checked)}
                                                className="mt-1 w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 shrink-0 cursor-pointer"
                                            />
                                            <span className="leading-snug select-none">
                                                <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline inline-block mr-1">
                                                    約款および債権譲渡契約条項
                                                </Link>
                                                を確認しました
                                            </span>
                                        </label>
                                    )}

                                    <Button
                                        size="sm"
                                        className={`w-full font-bold shadow-md transition-transform ${isTermsAgreed ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleAgree();
                                        }}
                                        disabled={!isTermsAgreed}
                                    >
                                        <Handshake className="w-5 h-5 mr-2" />
                                        契約手続に進む（合意する）
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-sm text-slate-500 bg-slate-50 p-3 rounded border border-slate-100">
                            金額が合致するまで合意できません
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-2 border-t border-slate-200 pt-4 flex flex-col items-center gap-3">
                    {deal.status === 'agreed' ? (
                        <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold border border-green-200">
                            取引成立済み
                        </span>
                    ) : deal.status === 'concluded' ? (
                        <div className="flex flex-col items-center gap-3 w-full">
                            <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold border border-green-200">
                                契約成立🎉
                            </span>

                            <div className="w-full bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex flex-col items-center gap-3">
                                <p className="text-sm text-slate-600 font-bold mb-1">契約書（PDF）の確認・保存</p>
                                <div className="flex gap-2 w-full max-w-sm">
                                    <Button
                                        variant="outline"
                                        className="flex-1 flex items-center justify-center border-slate-300 hover:bg-slate-50 text-slate-700 font-bold shadow-sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const url = `/contract-print?dealId=${deal.id}`;
                                            window.open(url, '_blank', 'noopener,noreferrer');
                                        }}
                                    >
                                        <FileTextIcon className="w-4 h-4 mr-2" /> Webで確認
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-slate-300 hover:bg-slate-50 text-slate-700 font-bold shadow-sm"
                                        onClick={handlePrintContract}
                                        disabled={isGeneratingPdf}
                                    >
                                        <FileTextIcon className="w-4 h-4 mr-2" /> {isGeneratingPdf ? '生成中...' : 'PDF保存'}
                                    </Button>
                                </div>
                            </div>

                            <div className="w-full mb-2">
                                <DealStepper status={deal.status} paymentStatus={deal.paymentStatus} />
                            </div>

                            {isBuyer ? (
                                <div className="w-full font-medium text-sm text-left">
                                    {(!deal.paymentStatus || deal.paymentStatus === 'pending') && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
                                            <p className="font-bold text-blue-800 mb-2">
                                                契約が成立しました。速やかに以下の口座へ譲渡代金（合意金額: ¥{(deal.currentAmount || deal.currentBuyerPrice || 0).toLocaleString()}）をお振込みください。
                                            </p>
                                            <div className="bg-white p-3 rounded border border-blue-100 mb-3 space-y-1 text-slate-700">
                                                <p><strong>振込先口座:</strong></p>
                                                <p>{opponentProfile?.bankAccountInfo || '口座情報が未設定です。売主にお問い合わせください。'}</p>
                                            </div>
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow" onClick={handleBuyerPaymentReport}>
                                                振込を完了し、売り手に報告する
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'buyer_paid' && (
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-sm text-center text-slate-600 font-bold">
                                            <p>振込完了を報告しました。売り手の着金確認をお待ちください。</p>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'seller_received' && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm text-center text-blue-800 font-bold">
                                            <p>売り手が着金を確認しました。期日の回収と送金をお待ちください。</p>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'seller_repaid' && (
                                        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg shadow-sm">
                                            <p className="text-orange-800 font-bold mb-3 text-center">📢 売り手から回収・送金完了の報告がありました。</p>
                                            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold shadow" onClick={handleBuyerRepaymentConfirm}>
                                                着金を確認し、全取引を完了する
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'fully_settled' && (
                                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg shadow-sm text-center font-bold text-emerald-800">
                                            <p>最終着金確認済み。全取引が完了しました。</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full font-medium text-sm text-left">
                                    {(!deal.paymentStatus || deal.paymentStatus === 'pending') && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm text-center">
                                            <p className="font-bold text-blue-800">契約が成立しました。買い手からの譲渡代金の入金をお待ちください。</p>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'buyer_paid' && (
                                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg shadow-sm">
                                            <p className="text-green-800 font-bold mb-3 text-center">✅ 買い手から譲渡代金の振込完了報告がありました。</p>
                                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold shadow" onClick={handleSellerPaymentConfirm}>
                                                着金を確認し、取引を継続する
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'seller_received' && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
                                            <p className="text-blue-800 font-bold mb-3 text-center">
                                                最初の着金を確認済みです。期日に第三債務者から回収後、速やかに買い手へ送金してください。
                                            </p>
                                            <div className="bg-white p-3 rounded border border-blue-100 mb-3 space-y-1 text-slate-700">
                                                <p><strong>買主（送金先）口座:</strong></p>
                                                <p>{opponentProfile?.bankAccountInfo || '口座情報が未設定です。買主にお問い合わせください。'}</p>
                                            </div>
                                            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold shadow" onClick={handleSellerRepaymentReport}>
                                                回収完了および買い手への送金報告
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'seller_repaid' && (
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg shadow-sm text-center text-slate-600 font-bold">
                                            <p>回収・買主への送金完了を報告しました。買主の最終着金確認をお待ちください。</p>
                                        </div>
                                    )}
                                    
                                    {deal.paymentStatus === 'fully_settled' && (
                                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg shadow-sm text-center font-bold text-emerald-800">
                                            <p>買い手の最終着金確認済み。全取引が完了しました。</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-bold border border-slate-200">
                            {deal.status === 'open' || deal.status === 'pending' ? 'オファー承諾待ち' : '取引終了'}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
