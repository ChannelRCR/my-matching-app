import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from './ui/Card';
import { Button } from './ui/Button';
import {
    Calendar, DollarSign, UserCog, TrendingUp, AlertCircle,
    User, Building2, ChevronDown, Globe, FileCheck, Shield, ShieldOff
} from 'lucide-react';
import type { Invoice, Deal, User as UserType, Message } from '../types';
import { calculateAnnualYield } from '../utils/calculations';
import { translateCompanySize } from '../utils/translations';
import { hasUnreadMessages } from '../utils/chat';

// --------------- Accordion Section ---------------
const AccordionSection: React.FC<{
    title: string;
    icon?: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
}> = ({ title, icon, defaultOpen = false, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-slate-100 mt-2">
            <button
                type="button"
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            >
                <span className="flex items-center gap-1">{icon}{title}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'max-h-[600px] opacity-100 pb-2' : 'max-h-0 opacity-0'}`}
            >
                {children}
            </div>
        </div>
    );
};

// --------------- Privacy Badge ---------------
const PrivacyBadge: React.FC<{ isPublic: boolean }> = ({ isPublic }) => (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isPublic ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
        {isPublic ? <Shield className="w-2.5 h-2.5" /> : <ShieldOff className="w-2.5 h-2.5" />}
        {isPublic ? '公開' : '非公開'}
    </span>
);

// --------------- Props ---------------
export interface InvoiceCardProps {
    invoice: Invoice;
    viewerRole: 'seller' | 'buyer';
    currentUserId?: string;
    deals: Deal[];
    users: UserType[];
    messages: Message[];
    invoiceStats?: { offerCount: number; maxOffer: number };
    sellerUncompletedCount?: number;
    getUserTrackRecord: (userId: string, role: 'buyer' | 'seller') => number;
    statusOverride?: { label: string; color: string };
    isUncompleted?: boolean;
    onClick?: () => void;
    showFooterButton?: boolean;
    footerButtonLabel?: string;
    isBuyer?: boolean;
}

// --------------- Component ---------------
export const InvoiceCard: React.FC<InvoiceCardProps> = ({
    invoice: inv,
    viewerRole,
    currentUserId,
    deals,
    users,
    messages,
    invoiceStats,
    sellerUncompletedCount = 0,
    getUserTrackRecord,
    statusOverride,
    isUncompleted = false,
    onClick,
    showFooterButton = false,
    footerButtonLabel = '詳細を見る',
    isBuyer = false,
}) => {
    // ---- Computed Values ----
    const invDeals = deals.filter(d => d.invoiceId === inv.id && ['open', 'pending', 'negotiating'].includes(d.status));
    const stats = invoiceStats || { offerCount: invDeals.length, maxOffer: invDeals.length > 0 ? Math.max(...invDeals.map(d => d.currentBuyerPrice || d.initialOfferAmount || 0)) : 0 };

    const isPartial = inv.saleType === 'partial' || (inv.requestedAmount != null && inv.requestedAmount < inv.amount) || false;
    const returnAmount = isPartial && inv.requestedAmount ? inv.requestedAmount : inv.amount;
    const formattedDate = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '不明';
    const isNew = inv.createdAt ? (new Date().getTime() - new Date(inv.createdAt).getTime() < 24 * 60 * 60 * 1000) : false;

    // Status
    let dynamicStatus = statusOverride?.label || (inv.status === 'open' || inv.status === 'pending' ? '募集中' : inv.status === 'negotiating' ? '交渉中' : '成約済');
    let statusColor = statusOverride?.color || (inv.status === 'open' || inv.status === 'pending' ? 'text-green-600 bg-green-50 border-green-200' : inv.status === 'negotiating' ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-slate-600 bg-slate-100 border-slate-200');
    
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = inv.dueDate ? inv.dueDate < todayStr : false;
    const isEffectivelyExpired = isOverdue && inv.status !== 'sold';

    if (!statusOverride) {
        if (inv.status === 'withdrawn' || isEffectivelyExpired) {
            dynamicStatus = inv.status === 'withdrawn' ? '出品中止' : '期限切れ';
            statusColor = 'text-slate-600 bg-slate-100 border-slate-300';
        }
    }

    // Seller profile
    const sellerProfile = users.find(u => u.id === inv.sellerId);
    const isSelf = inv.sellerId === currentUserId;

    // Privacy
    const sellerPrivacy = sellerProfile?.privacySettings || {};

    // Unread check
    const hasUnread = currentUserId ? deals.some(d => d.invoiceId === inv.id && hasUnreadMessages(d.id, messages, currentUserId)) : false;

    return (
        <Card
            className={`flex flex-col h-full hover:shadow-lg transition-shadow border-slate-200 cursor-pointer ${inv.status === 'sold' && !isUncompleted ? 'opacity-[0.85] grayscale-[20%]' : ''}`}
            onClick={onClick}
        >
            <CardContent className="p-5 flex-1 flex flex-col">
                {/* ======= A. ヘッダー：ステータスバッジ ======= */}
                <div className="flex flex-col gap-2 mb-4">
                    {/* Seller uncompleted warning (buyer view) */}
                    {viewerRole === 'buyer' && sellerUncompletedCount > 1 && (
                        <div className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200 items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" /> ⚠ 未決済の債権が存在します
                        </div>
                    )}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {isNew && (
                                <span className="bg-red-100 text-red-700 text-[11px] px-2 py-0.5 rounded font-bold border border-red-200">NEW</span>
                            )}
                            <span className={`text-[11px] px-2 py-0.5 rounded font-bold border ${isPartial ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                {isPartial ? '一部売却' : '全部売却'}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>
                                {dynamicStatus}
                            </span>
                            {isUncompleted && (
                                <div className="text-[10px] ml-1 font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> 未決済・進行中
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0 ml-2">
                            <Calendar className="w-3 h-3" /> {formattedDate}
                        </span>
                    </div>
                </div>

                {/* ======= B. 出品企業（売り手）情報 ======= */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                    <div className="flex items-center gap-1.5 mb-2 text-slate-500 font-bold text-xs">
                        <User className="w-4 h-4" /> <span>{isSelf ? '出品企業（自社）' : '出品企業'}</span>
                    </div>
                    {/* 概要：企業名 + Track Record */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-slate-800 text-sm truncate max-w-full" title={sellerProfile?.companyName || sellerProfile?.name || '不明な企業'}>
                            {sellerProfile?.companyName || sellerProfile?.name || '不明な企業'}
                        </span>
                        <div className="text-[10px] font-bold bg-white inline-flex px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {getUserTrackRecord(inv.sellerId, 'seller') === 0 ? (
                                <span className="text-blue-600">🔰 初回</span>
                            ) : (
                                <span className="text-emerald-600">🏆 成約 {getUserTrackRecord(inv.sellerId, 'seller')}件</span>
                            )}
                        </div>
                    </div>

                    {/* 詳細（アコーディオン） */}
                    <AccordionSection title="企業詳細を見る" icon={<User className="w-3 h-3" />}>
                        <div className="space-y-1.5 text-xs text-slate-600">
                            {sellerProfile?.representativeName && (
                                <div className="flex justify-between items-center">
                                    <span>代表者: <span className="font-bold text-slate-700">{sellerProfile.representativeName}</span></span>
                                    <PrivacyBadge isPublic={sellerPrivacy.representativeName !== false} />
                                </div>
                            )}
                            {sellerProfile?.postalCode && (
                                <div className="flex justify-between items-center">
                                    <span>〒 {sellerProfile.postalCode}</span>
                                    <PrivacyBadge isPublic={sellerPrivacy.address !== false} />
                                </div>
                            )}
                            {sellerProfile?.address && (
                                <div className="flex justify-between items-center">
                                    <span className="truncate max-w-[200px]" title={sellerProfile.address}>{sellerProfile.address}</span>
                                    <PrivacyBadge isPublic={sellerPrivacy.address !== false} />
                                </div>
                            )}
                            {sellerProfile?.industry && (
                                <div className="flex justify-between items-center">
                                    <span>業種: <span className="font-medium">{sellerProfile.industry}</span></span>
                                </div>
                            )}
                        </div>

                        {/* 信用情報 */}
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                            {sellerProfile?.appealPoint && (
                                <div>
                                    <span className="font-bold text-slate-700">アピール:</span>{' '}
                                    <span>{sellerProfile.appealPoint.length > 60 ? sellerProfile.appealPoint.substring(0, 60) + '...' : sellerProfile.appealPoint}</span>
                                </div>
                            )}
                            {sellerProfile?.websiteUrl && (
                                <div className="flex items-center gap-1">
                                    <Globe className="w-3 h-3 text-blue-500" />
                                    <a
                                        href={sellerProfile.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline truncate max-w-[200px]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {sellerProfile.websiteUrl}
                                    </a>
                                </div>
                            )}
                            {sellerProfile?.idDocumentUrl && sellerPrivacy.idDocumentUrl !== false && (
                                <div className="flex items-center gap-1 text-emerald-700">
                                    <FileCheck className="w-3 h-3" />
                                    <span className="font-medium">📄 本人確認書類あり</span>
                                </div>
                            )}
                        </div>
                    </AccordionSection>
                </div>

                {/* ======= C. 取引先（第三債務者）情報 ======= */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/20"></div>
                    
                    <div className="flex items-center gap-1.5 mb-3 text-slate-700 font-bold text-sm">
                        <Building2 className="w-4 h-4 text-indigo-500" /> <span>取引先（債務者）</span>
                    </div>
                    
                    {/* 概要: バッジ群 */}
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">
                            {viewerRole === 'buyer' ? (inv.isClientNamePublic ? (inv.debtorName || '企業名未設定') : '企業名非公開') : (inv.debtorName || '企業名未設定')}
                        </span>
                        {inv.industry && <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{inv.industry}</span>}
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium border border-slate-200">{translateCompanySize(inv.companySize)}</span>
                    </div>

                    {/* 詳細（アコーディオン） */}
                    <AccordionSection title="取引先詳細を見る" icon={<Building2 className="w-3 h-3" />}>
                        <div className="space-y-1.5 text-xs text-slate-600">
                            {/* 郵便番号: buyer=非公開設定なら隠す、seller=バッジ表示 */}
                            {inv.debtorPostalCode && (
                                <div className="flex justify-between items-center">
                                    <span>
                                        {viewerRole === 'buyer'
                                            ? (inv.isClientAddressPublic ? `〒 ${inv.debtorPostalCode}` : '〒 非公開')
                                            : `〒 ${inv.debtorPostalCode}`}
                                    </span>
                                    {viewerRole === 'seller' && isSelf && (
                                        <PrivacyBadge isPublic={inv.isClientAddressPublic ?? false} />
                                    )}
                                </div>
                            )}
                            {/* 所在地: buyer=非公開設定なら隠す、seller=バッジ表示 */}
                            {inv.debtorAddress && (
                                <div className="flex justify-between items-center">
                                    <span className="truncate max-w-[200px]" title={inv.debtorAddress}>
                                        所在地: {viewerRole === 'buyer'
                                            ? (inv.isClientAddressPublic ? inv.debtorAddress : '非公開')
                                            : inv.debtorAddress}
                                    </span>
                                    {viewerRole === 'seller' && isSelf && (
                                        <PrivacyBadge isPublic={inv.isClientAddressPublic ?? false} />
                                    )}
                                </div>
                            )}
                        </div>
                    </AccordionSection>

                    {/* ======= D. 債権情報 ======= */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 mb-3 text-slate-700 font-bold text-sm">
                            <DollarSign className="w-4 h-4 text-indigo-500" /> <span>債権情報</span>
                        </div>

                        {/* 債権の種類バッジ */}
                        <div className="mb-3">
                            <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-medium border border-indigo-100">
                                {inv.claimType || '売掛金'}
                            </span>
                        </div>

                        {/* 金額情報 */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                <span className="text-slate-500">額面 (全体債権額)</span>
                                <span className="font-medium text-slate-600">¥{inv.amount.toLocaleString()}</span>
                            </div>

                            {isPartial && inv.requestedAmount && (
                                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                    <span className="text-slate-600 font-bold">譲渡対象額</span>
                                    <span className="font-bold text-slate-800">¥{inv.requestedAmount.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                                <span className="text-indigo-800 font-bold flex items-center gap-1"><DollarSign className="w-4 h-4" />希望売却額</span>
                                <span className="font-black text-indigo-700 text-lg sm:text-xl tracking-tight">¥{inv.sellingAmount?.toLocaleString() || '未設定'}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="flex flex-col p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> 入金期日</span>
                                    <span className="font-bold text-slate-700 text-sm">{inv.dueDate}</span>
                                </div>
                                <div className="flex flex-col p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                    <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-0.5">想定利回り(年率)</span>
                                    <span className="font-bold text-emerald-700 text-sm flex items-baseline gap-0.5">
                                        {inv.sellingAmount ? calculateAnnualYield(returnAmount, inv.sellingAmount, inv.dueDate).toFixed(1) : '0.0'}
                                        <span className="text-[10px] font-normal">%</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 信用情報（アコーディオン） */}
                        <AccordionSection title="信用情報・エビデンス" icon={<FileCheck className="w-3 h-3" />}>
                            <div className="space-y-1.5 text-xs text-slate-600">
                                {inv.companyCredit && (
                                    <div>
                                        <span className="font-bold text-slate-700">アピール:</span>{' '}
                                        {inv.companyCredit.length > 80 ? inv.companyCredit.substring(0, 80) + '...' : inv.companyCredit}
                                    </div>
                                )}
                                {inv.evidenceUrl && (
                                    <div className="flex items-center gap-1 text-blue-600">
                                        <FileCheck className="w-3 h-3" />
                                        <span className="font-medium">証拠書類あり（詳細画面で確認）</span>
                                    </div>
                                )}
                                {!inv.companyCredit && !inv.evidenceUrl && (
                                    <span className="text-slate-400">特になし</span>
                                )}
                            </div>
                        </AccordionSection>
                    </div>
                </div>

                {/* ======= E. フッター：オファー状況 ======= */}
                <div className="mt-auto flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex flex-col justify-center items-center">
                            <span className="text-slate-500 text-[10px] font-bold mb-0.5 flex items-center"><UserCog className="w-3 h-3 mr-1" />オファー数</span>
                            <span className="font-bold text-blue-700 text-sm">{stats.offerCount} <span className="text-[10px] font-normal">件</span></span>
                        </div>
                        <div className="bg-orange-50/50 p-2 rounded-lg border border-orange-100 flex flex-col justify-center items-center">
                            <span className="text-slate-500 text-[10px] font-bold mb-0.5 flex items-center"><TrendingUp className="w-3 h-3 mr-1" />{viewerRole === 'seller' ? '現在の最高提示額' : '最高提示額'}</span>
                            <span className="font-bold text-orange-700 text-sm">{stats.maxOffer > 0 ? `¥${stats.maxOffer.toLocaleString()}` : '---'}</span>
                        </div>
                    </div>

                    {hasUnread && (
                        <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg border border-red-100 mt-1 shadow-sm">
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            新着メッセージあり
                        </div>
                    )}
                </div>
            </CardContent>

            {showFooterButton && (
                <CardFooter className="pt-0 pb-4">
                    {inv.status === 'sold' ? (
                        <Button className="w-full bg-slate-200 text-slate-500 cursor-not-allowed border-slate-300" disabled>
                            取引終了
                        </Button>
                    ) : (
                        <Button className={`w-full font-bold shadow-sm ${!isBuyer ? 'bg-slate-300 hover:bg-slate-400 cursor-not-allowed text-slate-600' : 'bg-primary hover:bg-primary/90 text-white'}`}>
                            {footerButtonLabel}
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
};
