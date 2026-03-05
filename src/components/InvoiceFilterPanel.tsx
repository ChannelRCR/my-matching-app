import React from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

interface InvoiceFilterPanelProps {
    minAmount: string;
    setMinAmount: (v: string) => void;
    maxAmount: string;
    setMaxAmount: (v: string) => void;
    industryFilter: string;
    setIndustryFilter: (v: string) => void;
    sortBy: string;
    setSortBy: (v: string) => void;
    isFilterOpen: boolean;
    setIsFilterOpen: (v: boolean) => void;
    showSold?: boolean;
    setShowSold?: (v: boolean) => void;
}

export const InvoiceFilterPanel: React.FC<InvoiceFilterPanelProps> = ({
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
    industryFilter, setIndustryFilter,
    sortBy, setSortBy,
    isFilterOpen, setIsFilterOpen,
    showSold, setShowSold
}) => {
    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="md:hidden">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center justify-between border-slate-300 text-slate-600"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                        <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> 検索・並び替え</span>
                        {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Filter and Sort Panel */}
            <div className={`${isFilterOpen ? 'block' : 'hidden'} md:block bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6`}>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">売却希望額（下限 〜 上限）</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    placeholder="下限 (円)"
                                    value={minAmount}
                                    onChange={(e) => setMinAmount(e.target.value)}
                                    className="h-9"
                                />
                                <span className="text-slate-400">〜</span>
                                <Input
                                    type="number"
                                    placeholder="上限 (円)"
                                    value={maxAmount}
                                    onChange={(e) => setMaxAmount(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">業種で絞り込み</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="例: IT、建設、飲食..."
                                    value={industryFilter}
                                    onChange={(e) => setIndustryFilter(e.target.value)}
                                    className="h-9 pl-9"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1.5 block">並び替え</label>
                            <select
                                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm md:text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="newest">新着順</option>
                                <option value="priceDesc">売却希望額が高い順</option>
                                <option value="priceAsc">売却希望額が低い順</option>
                            </select>
                        </div>
                    </div>
                </div>
                {setShowSold && showSold !== undefined && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showSold}
                                onChange={(e) => setShowSold(e.target.checked)}
                                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                            />
                            <span>成約済みの案件も表示する</span>
                        </label>
                    </div>
                )}
            </div>
        </>
    );
};
