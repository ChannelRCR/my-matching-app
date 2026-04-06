import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FileTextIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { setTransitioning } from '../utils/transitionState';
import { useMarket } from '../contexts/MarketContext';
import type { Deal, Invoice, Dispute, User as UserType } from '../types';

interface ChatMessage {
    id: string;
    sender: 'me' | 'other';
    text: string;
    timestamp: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    isSystemMessage?: boolean;
}

interface DisputeBoardProps {
    deal: Deal;
    invoice: Invoice;
    user: any;
    isBuyer: boolean;
    activeDispute: Dispute | null;
    setActiveDispute: React.Dispatch<React.SetStateAction<Dispute | null>>;
    messages: ChatMessage[];
    addMessage: (msg: any) => Promise<void>;
    users: UserType[];
}

export const DisputeBoard: React.FC<DisputeBoardProps> = ({
    deal,
    invoice,
    user,
    isBuyer,
    activeDispute,
    setActiveDispute,
    messages,
    addMessage,
    users
}) => {
    const { completeDeal } = useMarket();
    
    // In ChatPage, these were managed centrally, but it's cleaner to manage them here if we initialize from activeDispute.
    const [disputeClaimAmount, setDisputeClaimAmount] = useState(activeDispute?.claim_amount ? String(activeDispute.claim_amount) : '');
    const [disputeMonthlyPayment, setDisputeMonthlyPayment] = useState(activeDispute?.settlement_amount ? String(activeDispute.settlement_amount) : '');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // 1. Real-time sync for disagreements/updates via Supabase Channel
    useEffect(() => {
        if (!deal?.id) return;
        
        // Ensure inputs are kept in sync on first load or when activeDispute is fetched globally
        if (activeDispute?.claim_amount) setDisputeClaimAmount(String(activeDispute.claim_amount));
        if (activeDispute?.settlement_amount) setDisputeMonthlyPayment(String(activeDispute.settlement_amount));

        const channel = supabase.channel(`public:disputes:deal_id=${deal.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'disputes', filter: `deal_id=eq.${deal.id}` }, (payload) => {
                const newData = payload.new as Dispute;
                setActiveDispute(newData);
                if (newData.claim_amount) setDisputeClaimAmount(String(newData.claim_amount));
                if (newData.settlement_amount) setDisputeMonthlyPayment(String(newData.settlement_amount));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [deal?.id, activeDispute?.id, setActiveDispute]);

    // 2. Identify the last proposer to prevent self-agreement
    const lastProposalMsg = messages.slice().reverse().find(m => m.text?.includes('和解条件の提示】'));
    const isMyLastProposal = lastProposalMsg ? lastProposalMsg.sender === 'me' : false;

    const handleProposeSettlement = async () => {
        if (!deal || !user || !invoice || !activeDispute) return;
        
        const claimAmt = Number(disputeClaimAmount);
        const monthlyAmt = Number(disputeMonthlyPayment);
        
        if (isNaN(claimAmt) || claimAmt <= 0) {
            alert("有効な和解請求額を入力してください");
            return;
        }
        if (isNaN(monthlyAmt) || monthlyAmt <= 0) {
            alert("有効な月々の支払提示額を入力してください");
            return;
        }
        
        const maxAllowed = invoice.requestedAmount || invoice.amount;
        if (claimAmt > maxAllowed) {
            alert(`和解請求額は対象債権額（¥${maxAllowed.toLocaleString()}）を超えることはできません。`);
            return;
        }

        const count = Math.ceil(claimAmt / monthlyAmt);

        if (!window.confirm(`請求総額 ¥${claimAmt.toLocaleString()} を ${count}回分割（月額 ¥${monthlyAmt.toLocaleString()}）で和解提案しますか？`)) return;

        try {
            const { error } = await supabase.from('disputes').update({
                claim_amount: claimAmt,
                settlement_amount: monthlyAmt,
                installments_count: count
            }).eq('id', activeDispute.id);

            if (error) throw error;
            
            // local update
            setActiveDispute(prev => prev ? { ...prev, claim_amount: claimAmt, settlement_amount: monthlyAmt, installments_count: count } : null);

            // send system message
            const now = new Date();
            const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
            const proposerRole = isBuyer ? '買主' : '売主';
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: receiverId,
                content: `【システム通知・和解条件の提示】\n${proposerRole}から和解提案がありました。\n総額: ¥${claimAmt.toLocaleString()}\n月額(分割): ¥${monthlyAmt.toLocaleString()} (${count}回払い)`,
                timestamp: now.toISOString(),
                isSystemMessage: true
            });
            
            alert("和解案を提示しました。");
        } catch (error: any) {
            console.error("Dispute update error:", error);
            alert("和解提案の送信に失敗しました：" + (error.message || "不明なエラー"));
        }
    };

    // 3. Agreement and PDF Generation
    const handleAgreeSettlement = async () => {
        if (!deal || !user || !activeDispute) return;
        if (!window.confirm("現在表示されている和解条件に同意し、法的拘束力のある和解合意を形成しますか？")) return;

        const roleName = isBuyer ? '買い手' : '売り手';
        const now = new Date().toISOString();

        // --- ULTIMATE ESCAPE: 1. Block Realtime ---
        setTransitioning(true);

        const loadingText = '和解合意書を生成・保存中...';

        // --- ULTIMATE ESCAPE: 2. Pure DOM Overlay (unaffected by React lifecycles) ---
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
            // Update dispute status
            const { error: disputeError } = await supabase.from('disputes').update({
                status: 'agreed'
            }).eq('id', activeDispute.id);

            if (disputeError) throw disputeError;

            // Generate Settlement PDF and Upload to Contracts Bucket
            let settlementUrl = null;
            try {
                const { generateSettlementPDFBlob } = await import('../utils/pdfGenerator');
                const sellerData = users.find(u => u.id === deal.sellerId);
                const buyerData = users.find(u => u.id === deal.buyerId);
                
                if (sellerData && buyerData) {
                    const pdfBlob = await generateSettlementPDFBlob(deal, { ...activeDispute, status: 'agreed' }, sellerData, buyerData);
                    const fileName = `settlement_${deal.id}_${Date.now()}.pdf`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('contracts')
                        .upload(fileName, pdfBlob, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: 'application/pdf'
                        });

                    if (!uploadError) {
                        const { data: publicUrlData } = supabase.storage
                            .from('contracts')
                            .getPublicUrl(fileName);
                        settlementUrl = publicUrlData.publicUrl;
                    } else {
                        console.error("Failed to upload settlement PDF:", uploadError);
                    }
                }
            } catch (pdfErr) {
                console.error("Failed to generate settlement PDF:", pdfErr);
            }

            // Update Deals Table to conclude transaction with settlement details
            const dbUpdates: any = {
                status: 'concluded',
                contract_date: now,
                buyer_agreed_at: now,
                seller_agreed_at: now,
                current_amount: activeDispute.claim_amount || deal.currentAmount || 0,
            };
            if (settlementUrl) {
                dbUpdates.settlement_url = settlementUrl;
            }

            const { error: updateError } = await supabase.from('deals').update(dbUpdates).eq('id', deal.id);
            if (updateError) throw updateError;

            // Complete Invoice and DB updates
            await supabase.from('invoices').update({ status: 'sold' }).eq('id', deal.invoiceId);
            completeDeal(invoice.amount, dbUpdates.current_amount);

            // Send Chat Messages
            const receiverId = isBuyer ? deal.sellerId : deal.buyerId;
            await addMessage({
                id: `sys_${Date.now()}`,
                dealId: deal.id,
                senderId: user.id,
                receiverId: receiverId,
                content: `【システム通知】\n${roleName}が和解条件に同意しました。\n両者の間で法的拘束力のある和解の合意が形成されました。`,
                timestamp: now,
                isSystemMessage: true
            });

            // 1. Force navigation delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // --- ULTIMATE ESCAPE: 3. Browser-level hard navigation to reload fully into Concluded state ---
            window.location.href = window.location.pathname + window.location.search;

        } catch (error: any) {
            console.error("Dispute agree error:", error);
            alert("合意処理に失敗しました：" + (error.message || "不明なエラー"));
            
            // Cleanup on failure
            const overlayElement = document.getElementById('ultimate-escape-overlay');
            if (overlayElement) overlayElement.remove();
            setTransitioning(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {/* 和解合意書セクション */}
            {activeDispute?.status === 'agreed' && deal.settlement_url && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg shadow-sm flex flex-col items-center gap-3">
                    <p className="text-sm text-red-800 font-bold mb-1">✅ 和解合意書が締結されました</p>
                    <div className="flex gap-2 w-full flex-col sm:flex-row max-w-sm">
                        <Button
                            variant="outline"
                            className="flex-1 flex items-center justify-center border-red-300 hover:bg-red-100 text-red-800 font-bold shadow-sm bg-white"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(deal.settlement_url, '_blank', 'noopener,noreferrer');
                            }}
                        >
                            <FileTextIcon className="w-4 h-4 mr-2" /> Webで確認
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 border-red-300 hover:bg-red-100 text-red-800 font-bold shadow-sm bg-white"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                    const url = new URL(deal.settlement_url as string);
                                    url.searchParams.set('download', `settlement_agreement_${deal.id}.pdf`);
                                    const a = document.createElement('a');
                                    a.href = url.toString();
                                    a.download = `settlement_agreement_${deal.id}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                } catch (err) {
                                    window.open(deal.settlement_url, '_blank');
                                }
                            }}
                        >
                            <FileTextIcon className="w-4 h-4 mr-2" /> ダウンロード
                        </Button>
                    </div>
                </div>
            )}

            {/* 原契約の確認セクション */}
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex flex-col items-center gap-3">
                <p className="text-sm text-slate-600 font-bold mb-1">原契約（債権譲渡契約）の内容を確認</p>
                <div className="flex gap-2 w-full flex-col sm:flex-row max-w-sm">
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
                        onClick={async () => {
                            try {
                                setIsGeneratingPdf(true);
                                const { generateContractPDF } = await import('../utils/pdfGenerator');
                                const sellerData = users.find(u => u.id === deal.sellerId);
                                const buyerData = users.find(u => u.id === deal.buyerId);
                                if (sellerData && buyerData) {
                                    await generateContractPDF(deal, invoice, sellerData, buyerData);
                                } else {
                                    alert('ユーザー情報が見つかりません');
                                }
                            } catch(e) {
                                console.error(e);
                                alert("PDFの生成に失敗しました");
                            } finally {
                                setIsGeneratingPdf(false);
                            }
                        }}
                        disabled={isGeneratingPdf}
                    >
                        <FileTextIcon className="w-4 h-4 mr-2" /> {isGeneratingPdf ? '生成中...' : 'PDF保存'}
                    </Button>
                </div>
            </div>

            <div className="bg-red-50 p-3 rounded-lg border border-red-200 shadow-sm flex flex-col gap-2">
                <div className="text-[11px] font-bold text-red-600 tracking-wide mb-1">和解条件の計算・提示</div>
                
                <div className="flex flex-col gap-2 relative">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-red-800 font-bold w-24 shrink-0">和解請求総額:</span>
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                            <Input
                                type="number"
                                value={disputeClaimAmount}
                                onChange={(e) => setDisputeClaimAmount(e.target.value)}
                                placeholder="例: 1000000"
                                className="pl-7 h-9 font-mono border-red-200 focus:border-red-500 focus:ring-red-500 bg-white"
                                min="1"
                                disabled={activeDispute?.status === 'agreed'}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-red-800 font-bold w-24 shrink-0">月々の提示額:</span>
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                            <Input
                                type="number"
                                value={disputeMonthlyPayment}
                                onChange={(e) => setDisputeMonthlyPayment(e.target.value)}
                                placeholder="例: 50000"
                                className="pl-7 h-9 font-mono border-red-200 focus:border-red-500 focus:ring-red-500 bg-white"
                                min="1"
                                disabled={activeDispute?.status === 'agreed'}
                            />
                        </div>
                    </div>
                </div>

                {Boolean(Number(disputeClaimAmount)) && Boolean(Number(disputeMonthlyPayment)) && (
                    <div className="mt-2 bg-white rounded border border-red-100 p-2 text-xs space-y-1.5 shadow-inner">
                        <div className="flex justify-between items-center text-slate-600 font-bold border-b border-red-50 pb-1">
                            <span>支払回数</span>
                            <span className="text-red-700">{Math.ceil(Number(disputeClaimAmount) / Number(disputeMonthlyPayment))} 回払い</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 font-bold border-b border-red-50 pb-1">
                            <span>通常月々支払額</span>
                            <span className="text-red-700">¥{Number(disputeMonthlyPayment).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 font-bold">
                            <span>最終回端数支払額</span>
                            <span className="text-red-700">¥{(Number(disputeClaimAmount) % Number(disputeMonthlyPayment) || Number(disputeMonthlyPayment)).toLocaleString()}</span>
                        </div>
                    </div>
                )}
                
                {activeDispute?.status !== 'agreed' && (
                    <Button 
                        size="sm" 
                        onClick={handleProposeSettlement}
                        className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
                        disabled={!disputeClaimAmount || !disputeMonthlyPayment}
                    >
                        この条件で和解を提案する
                    </Button>
                )}
                
                {activeDispute?.status !== 'agreed' && activeDispute?.claim_amount && (
                    <div className="mt-3 pt-3 border-t border-red-200 w-full">
                        <div className="text-xs text-red-800 font-bold mb-2 text-center">現在提示・保存されている和解条件</div>
                        {isMyLastProposal ? (
                            <Button 
                                size="sm" 
                                disabled
                                className="w-full bg-slate-200 text-slate-500 font-bold cursor-not-allowed border-none"
                            >
                                相手の合意待ちです
                            </Button>
                        ) : (
                            <Button 
                                size="sm" 
                                onClick={handleAgreeSettlement} 
                                variant="outline" 
                                className="w-full border-red-600 text-red-700 hover:bg-red-50 font-bold shadow-sm"
                            >
                                現在提示されている条件に合意する
                            </Button>
                        )}
                    </div>
                )}
                {activeDispute?.status === 'agreed' && (
                    <div className="mt-3 pt-3 border-t border-red-200 text-center text-sm font-bold text-red-700 bg-red-100 rounded py-2">
                        ✅ 和解に合意済みです
                    </div>
                )}
            </div>
        </div>
    );
};
